// src/hooks/useSheets.ts
import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { LedgerEntry } from "@/types/ledger";
import { calcDepreciation, type FixedAsset } from "@/hooks/useDepreciation";

export type SheetsPeriod = "thisMonth" | "lastMonth" | "thisYear" | "all";

interface SheetsSettings {
  spreadsheetId: string;
}

const BANK_ACCOUNTS = ["普通預金", "当座預金", "口座振替"] as const;

// 総勘定元帳の科目表示順（資産→負債→収益→費用）
const GL_ACCOUNT_ORDER = [
  "現金", "普通預金", "当座預金", "電子マネー",
  "クレジットカード", "口座振替",
  "売上高",
  "仕入高", "外注費", "給料賃金", "専従者給与", "福利厚生費",
  "地代家賃", "修繕費", "減価償却費",
  "旅費交通費", "通信費", "車両費", "荷造運賃",
  "接待交際費", "会議費", "広告宣伝費",
  "消耗品費", "新聞図書費",
  "租税公課", "損害保険料",
  "利子割引料", "貸倒金", "研修費", "水道光熱費", "支払手数料", "雑費",
];

function glAccountOrder(name: string): number {
  const i = GL_ACCOUNT_ORDER.indexOf(name);
  return i >= 0 ? i : GL_ACCOUNT_ORDER.length;
}

export function extractSpreadsheetId(input: string): string {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : input.trim();
}

export function filterByPeriod(entries: LedgerEntry[], period: SheetsPeriod): LedgerEntry[] {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  return entries.filter(e => {
    const d = e.date;
    if (period === "thisMonth") {
      return d.startsWith(`${year}-${String(month).padStart(2, "0")}`);
    }
    if (period === "lastMonth") {
      const lm = month === 1 ? 12 : month - 1;
      const ly = month === 1 ? year - 1 : year;
      return d.startsWith(`${ly}-${String(lm).padStart(2, "0")}`);
    }
    if (period === "thisYear") {
      return d.startsWith(String(year));
    }
    return true;
  });
}

export function useSheets() {
  const { user, sheetsToken, connectSheets } = useAuth();
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ref  = doc(db, "users", user.uid, "settings", "sheets");
      const snap = await getDoc(ref);
      if (snap.exists()) setSpreadsheetId((snap.data() as SheetsSettings).spreadsheetId ?? "");
      setSettingsLoading(false);
    })();
  }, [user]);

  const saveSpreadsheetId = useCallback(async (raw: string) => {
    if (!user) return;
    const id = extractSpreadsheetId(raw);
    setSpreadsheetId(id);
    await setDoc(
      doc(db, "users", user.uid, "settings", "sheets"),
      { spreadsheetId: id, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }, [user]);

  const createAndLinkSpreadsheet = useCallback(async (): Promise<string> => {
    let token = sheetsToken;
    if (!token) token = await connectSheets();
    if (!token) throw new Error("Google 認証に失敗しました");

    const doCreate = async (tok: string) => {
      const id = await createSpreadsheet(tok);
      await saveSpreadsheetId(id);
      return id;
    };

    try {
      return await doCreate(token);
    } catch (err) {
      if ((err as Error).message === "AUTH_EXPIRED") {
        const fresh = await connectSheets();
        return doCreate(fresh);
      }
      throw err;
    }
  }, [sheetsToken, connectSheets, saveSpreadsheetId]);

  const exportToSheets = useCallback(async (entries: LedgerEntry[], assets: FixedAsset[] = []) => {
    let token = sheetsToken;
    if (!token) token = await connectSheets();
    if (!token) throw new Error("Google 認証に失敗しました");
    if (!spreadsheetId) throw new Error("スプレッドシートが設定されていません");

    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    const run = async (tok: string) => {
      // ── 仕訳帳 ────────────────────────────────────────────────────
      // 行1-3=タイトル・会社名・列ヘッダー（テンプレート固定）→ データは行4から
      // A=日付 B=借方勘定科目 C=借方金額 D=貸方勘定科目 E=貸方金額 F=摘要
      // G=元丁（ユーザー記入、保持） | 下部=合計・貸借差額行（保持）
      const journalRows = sorted.map(e => [
        e.date,
        e.debitAccount,
        e.amount,
        e.creditAccount,
        e.amount,
        [e.description, e.counterparty].filter(Boolean).join(" "),
      ]);
      await ensureSheet(tok, spreadsheetId, "仕訳帳",
        ["日付", "借方勘定科目", "借方金額", "貸方勘定科目", "貸方金額", "摘要", "元丁"]);
      await writePreservingFooter(tok, spreadsheetId, "仕訳帳", 4, "F", journalRows, ["合計", "貸借差額"]);

      // ── 総勘定元帳 ────────────────────────────────────────────────
      // 行1-7=タイトル・会社名・勘定科目名・期首残高・繰越行・列ヘッダー等（テンプレート固定）→ データは行8から
      // A=日付 B=相手科目 C=摘要 D=借方 E=貸方 | F=残高（数式、保持）
      // 科目別セクション（【科目名】ヘッダー行＋日付昇順の明細行）
      const glMap = new Map<string, (string | number)[][]>();
      for (const e of sorted) {
        const memo = [e.description, e.counterparty].filter(Boolean).join(" ");
        if (!glMap.has(e.debitAccount)) glMap.set(e.debitAccount, []);
        glMap.get(e.debitAccount)!.push([e.date, e.creditAccount, memo, e.amount, ""]);
        if (!glMap.has(e.creditAccount)) glMap.set(e.creditAccount, []);
        glMap.get(e.creditAccount)!.push([e.date, e.debitAccount, memo, "", e.amount]);
      }
      const glRows: (string | number)[][] = [];
      for (const [acct, rows] of [...glMap.entries()].sort(([a], [b]) => glAccountOrder(a) - glAccountOrder(b))) {
        glRows.push([`【${acct}】`, "", "", "", ""]);
        glRows.push(...rows.sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
      }
      await ensureSheet(tok, spreadsheetId, "総勘定元帳",
        ["日付", "相手科目", "摘要", "借方", "貸方", "残高"]);
      await clearAndWrite(tok, spreadsheetId, "総勘定元帳", 8, "E", glRows);

      // ── 現金出納帳 ────────────────────────────────────────────────
      // 行1-5=タイトル・会社名・口座情報・前月繰越・列ヘッダー（テンプレート固定）→ データは行6から
      // A=日付 B=勘定科目 C=摘要 D=収入金額 E=支出金額 | F=残高（数式、保持）
      const cashRows = sorted
        .filter(e => e.creditAccount === "現金")
        .map(e => [e.date, e.debitAccount, e.description || "", "", e.amount]);
      await ensureSheet(tok, spreadsheetId, "現金出納帳",
        ["日付", "勘定科目", "摘要", "収入金額", "支出金額", "残高"]);
      await clearAndWrite(tok, spreadsheetId, "現金出納帳", 6, "E", cashRows);

      // ── 預金出納帳 ────────────────────────────────────────────────
      // 行1-5=タイトル・会社名・口座情報・前月繰越・列ヘッダー（テンプレート固定）→ データは行6から
      // A=日付 B=勘定科目 C=摘要 D=相手先 E=預入金額 F=引出金額 | G=残高（数式、保持）
      const bankRows = sorted
        .filter(e => (BANK_ACCOUNTS as readonly string[]).includes(e.creditAccount))
        .map(e => [e.date, e.debitAccount, e.description || "", e.counterparty || "", "", e.amount]);
      await ensureSheet(tok, spreadsheetId, "預金出納帳",
        ["日付", "勘定科目", "摘要", "相手先", "預入金額", "引出金額", "残高"]);
      await clearAndWrite(tok, spreadsheetId, "預金出納帳", 6, "F", bankRows);

      // ── 経費帳 ────────────────────────────────────────────────────
      // 行1-4=タイトル・会社名・期間・列ヘッダー（テンプレート固定）→ データは行5から
      // A=日付 B=勘定科目 C=摘要 D=支払先 E=支払方法 F=金額
      // G=備考（ユーザー記入、保持） | 下部=合計行（保持）
      const expenseRows = sorted
        .filter(e => e.entryType === "expense" && e.debitAccount !== "仕入高")
        .map(e => [e.date, e.debitAccount, e.description || "", e.counterparty || "", e.creditAccount, e.amount]);
      await ensureSheet(tok, spreadsheetId, "経費帳",
        ["日付", "勘定科目", "摘要", "支払先", "支払方法", "金額", "備考"]);
      await writePreservingFooter(tok, spreadsheetId, "経費帳", 5, "F", expenseRows, ["合計"]);

      // ── 固定資産台帳 ──────────────────────────────────────────
      // 行1-4=タイトル・会社名・期間・列ヘッダー（テンプレート固定）→ データは行5から
      // A=資産名 B=勘定科目 C=取得年月日 D=取得価額 E=耐用年数 F=償却方法 G=償却率
      // H=事業供用月数 I=期首帳簿価額 J=当期償却額 K=期末帳簿価額 | L=備考（保持）
      if (assets.length > 0) {
        const exportYear = new Date().getFullYear();
        const assetRows = assets.map(a => {
          const startBV     = calcStartBV(a, exportYear);
          const deprAmt     = calcDepreciation(a, exportYear);
          const endBV       = Math.max(startBV - deprAmt, 0);
          const months      = monthsInService(a.acquisitionDate, exportYear);
          const rate        = deprRate(a.method, a.usefulLife);
          const methodLabel = a.method === "straight" ? "定額法"
                            : a.method === "declining" ? "定率法" : "一括償却";
          return [
            a.name,
            "",               // 勘定科目（ユーザー記入、空欄）
            a.acquisitionDate,
            a.acquisitionCost,
            a.usefulLife,
            methodLabel,
            rate,
            months,
            startBV,
            deprAmt,
            endBV,
          ];
        });
        await ensureSheet(tok, spreadsheetId, "固定資産台帳",
          ["資産名", "勘定科目", "取得年月日", "取得価額", "耐用年数", "償却方法", "償却率",
           "事業供用月数", "期首帳簿価額", "当期償却額", "期末帳簿価額", "備考"]);
        await writePreservingFooter(tok, spreadsheetId, "固定資産台帳", 5, "K", assetRows, ["合計"]);
      }
    };

    try {
      await run(token);
    } catch (err) {
      if ((err as Error).message === "AUTH_EXPIRED") {
        const freshToken = await connectSheets();
        await run(freshToken);
      } else {
        throw err;
      }
    }
  }, [sheetsToken, connectSheets, spreadsheetId]);

  const unlinkSpreadsheet = useCallback(async () => {
    if (!user) return;
    setSpreadsheetId("");
    await setDoc(
      doc(db, "users", user.uid, "settings", "sheets"),
      { spreadsheetId: "", updatedAt: serverTimestamp() },
      { merge: true }
    );
  }, [user]);

  return { spreadsheetId, settingsLoading, saveSpreadsheetId, exportToSheets, createAndLinkSpreadsheet, unlinkSpreadsheet };
}

// ── ヘルパー ──────────────────────────────────────────────────────────────

// シート名＋セル範囲をURLパスセグメント用にエンコード
function encodeRange(sheetName: string, cellRange: string): string {
  return `%27${encodeURIComponent(sheetName)}%27!${encodeURIComponent(cellRange)}`;
}

// シートが存在しなければ作成してヘッダー行を書き込む
async function ensureSheet(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
): Promise<void> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!metaRes.ok) {
    if (metaRes.status === 401) throw new Error("AUTH_EXPIRED");
    const body = await metaRes.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? `HTTP ${metaRes.status}`
    );
  }
  const meta = await metaRes.json() as { sheets?: { properties: { title: string } }[] };
  if ((meta.sheets ?? []).some(s => s.properties.title === sheetName)) return;

  const createRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
    }
  );
  if (!createRes.ok) {
    if (createRes.status === 401) throw new Error("AUTH_EXPIRED");
    const body = await createRes.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? `HTTP ${createRes.status}`
    );
  }

  await updateValues(token, spreadsheetId, sheetName, 1, [headers]);
}

// フッターなし: A{startRow}:{dataEndCol} をクリアして新データを書き込む
async function clearAndWrite(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  startRow: number,
  dataEndCol: string,
  rows: (string | number)[][]
): Promise<void> {
  await batchClear(token, spreadsheetId, [`'${sheetName}'!A${startRow}:${dataEndCol}`]);
  if (rows.length > 0)
    await updateValues(token, spreadsheetId, sheetName, startRow, rows);
}

// 合計行など下部のフッター行を保護しながらデータを書き込む
// footerKeywords に一致するセルを含む行をフッターとみなす
async function writePreservingFooter(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  startRow: number,
  dataEndCol: string,
  rows: (string | number)[][],
  footerKeywords: string[]
): Promise<void> {
  // 現在のデータを読み込んでフッター位置を特定
  const currentValues = await readValues(token, spreadsheetId, sheetName, `A${startRow}:${dataEndCol}`);

  let footerRelIdx = currentValues.length; // デフォルト: フッターなし
  for (let i = 0; i < currentValues.length; i++) {
    const row = currentValues[i] ?? [];
    if (footerKeywords.some(kw => row.some(cell => String(cell ?? "").includes(kw)))) {
      footerRelIdx = i;
      break;
    }
  }

  const footerFound = footerRelIdx < currentValues.length;

  if (footerFound) {
    const footerAbsRow = startRow + footerRelIdx; // フッター行の絶対行番号（1始まり）

    // 新データがフッター前のスペースを超える場合は行を挿入
    if (rows.length > footerRelIdx) {
      await insertRows(token, spreadsheetId, sheetName, footerAbsRow, rows.length - footerRelIdx);
    }

    // 挿入後のフッター位置
    const newFooterAbsRow = footerAbsRow + Math.max(0, rows.length - footerRelIdx);

    // データエリアのみクリア（フッターの直前まで）
    if (newFooterAbsRow > startRow) {
      await batchClear(token, spreadsheetId,
        [`'${sheetName}'!A${startRow}:${dataEndCol}${newFooterAbsRow - 1}`]);
    }
  } else {
    // フッターなし: 列全体をクリア
    await batchClear(token, spreadsheetId, [`'${sheetName}'!A${startRow}:${dataEndCol}`]);
  }

  if (rows.length > 0)
    await updateValues(token, spreadsheetId, sheetName, startRow, rows);
}

// シートの数値IDを取得（行挿入の batchUpdate に必要）
async function getSheetId(
  token: string,
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`
    );
  }
  const data = await res.json() as {
    sheets?: { properties: { title: string; sheetId: number } }[]
  };
  const sheet = (data.sheets ?? []).find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`シート "${sheetName}" が見つかりません`);
  return sheet.properties.sheetId;
}

// フッター行の直前に空行を挿入する
async function insertRows(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  beforeRow: number, // 1始まり
  count: number
): Promise<void> {
  const sheetId = await getSheetId(token, spreadsheetId, sheetName);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          insertDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: beforeRow - 1, // 0始まり
              endIndex:   beforeRow - 1 + count,
            },
            inheritFromBefore: true,
          }
        }]
      }),
    }
  );
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`
    );
  }
}

// セル範囲の値を取得する（GET values）
async function readValues(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  cellRange: string
): Promise<(string | number)[][]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeRange(sheetName, cellRange)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`
    );
  }
  const data = await res.json() as { values?: (string | number)[][] };
  return data.values ?? [];
}

// 指定セルから値を書き込む（PUT values.update）
async function updateValues(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  startRow: number,
  values: (string | number)[][]
): Promise<void> {
  if (values.length === 0) return;
  const endRow    = startRow + values.length - 1;
  const colCount  = Math.max(...values.map(r => r.length));
  const endColLtr = colIndexToLetter(colCount - 1);
  const cellRange = `A${startRow}:${endColLtr}${endRow}`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeRange(sheetName, cellRange)}`
    + `?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }
  );
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`
    );
  }
}

// 指定範囲をクリアする（POST values:batchClear、範囲はボディで渡す）
async function batchClear(
  token: string,
  spreadsheetId: string,
  ranges: string[]
): Promise<void> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ranges }),
    }
  );
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`
    );
  }
}

// 列インデックス（0始まり）をアルファベット列名に変換（0→A, 25→Z, 26→AA）
function colIndexToLetter(index: number): string {
  let letter = "";
  let i = index;
  while (i >= 0) {
    letter = String.fromCharCode(65 + (i % 26)) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
}

// ── スプレッドシート新規作成 ──────────────────────────────────

async function createSpreadsheet(token: string): Promise<string> {
  const year = new Date().getFullYear();

  // ── 1. 6シートを一括作成 ─────────────────────────────────────
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: { title: `SmartLedger 帳簿 ${year}年` },
      sheets: [
        { properties: { title: "仕訳帳" } },
        { properties: { title: "総勘定元帳" } },
        { properties: { title: "現金出納帳" } },
        { properties: { title: "預金出納帳" } },
        { properties: { title: "経費帳" } },
        { properties: { title: "固定資産台帳" } },
      ],
    }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`
    );
  }
  const created = await res.json() as {
    spreadsheetId: string;
    sheets: { properties: { title: string; sheetId: number } }[];
  };
  const id = created.spreadsheetId;
  const sheetIdMap = new Map(created.sheets.map(s => [s.properties.title, s.properties.sheetId]));

  // ── 2. 各シートにタイトル行＋列ヘッダー行を書き込む ──────────
  // データ開始行に合わせてヘッダー位置を決定
  await updateValues(token, id, "仕訳帳", 1, [
    [`SmartLedger 仕訳帳　${year}年`],
    [],
    ["日付", "借方勘定科目", "借方金額", "貸方勘定科目", "貸方金額", "摘要", "元丁"],
  ]);
  await updateValues(token, id, "総勘定元帳", 1, [
    [`SmartLedger 総勘定元帳　${year}年`],
    [], [], [], [], [],
    ["日付", "相手科目", "摘要", "借方", "貸方", "残高"],
  ]);
  await updateValues(token, id, "現金出納帳", 1, [
    [`SmartLedger 現金出納帳　${year}年`],
    [], [], [],
    ["日付", "勘定科目", "摘要", "収入金額", "支出金額", "残高"],
  ]);
  await updateValues(token, id, "預金出納帳", 1, [
    [`SmartLedger 預金出納帳　${year}年`],
    [], [], [],
    ["日付", "勘定科目", "摘要", "相手先", "預入金額", "引出金額", "残高"],
  ]);
  await updateValues(token, id, "経費帳", 1, [
    [`SmartLedger 経費帳　${year}年`],
    [], [],
    ["日付", "勘定科目", "摘要", "支払先", "支払方法", "金額", "備考"],
  ]);
  await updateValues(token, id, "固定資産台帳", 1, [
    [`SmartLedger 固定資産台帳　${year}年`],
    [], [],
    ["資産名", "勘定科目", "取得年月日", "取得価額", "耐用年数", "償却方法", "償却率",
     "事業供用月数", "期首帳簿価額", "当期償却額", "期末帳簿価額", "備考"],
  ]);

  // ── 3. 各シートのタイトル行・ヘッダー行に色付け ─────────────
  // タイトル行: エメラルド濃色BG (#047857) + 白文字太字
  // ヘッダー行: エメラルド薄色BG (#d1fae5) + 濃緑文字太字
  const titleBg  = { red: 0.016, green: 0.471, blue: 0.341 }; // #047857
  const titleFg  = { red: 1,     green: 1,     blue: 1     }; // white
  const headerBg = { red: 0.820, green: 0.980, blue: 0.898 }; // #d1fae5
  const headerFg = { red: 0.024, green: 0.373, blue: 0.275 }; // #065f46

  // シートごとの設定（タイトル行インデックス=0、ヘッダー行インデックス=startRow-2）
  const sheetLayouts = [
    { name: "仕訳帳",       headerRowIdx: 2,  cols: 7  },
    { name: "総勘定元帳",   headerRowIdx: 6,  cols: 6  },
    { name: "現金出納帳",   headerRowIdx: 4,  cols: 6  },
    { name: "預金出納帳",   headerRowIdx: 4,  cols: 7  },
    { name: "経費帳",       headerRowIdx: 3,  cols: 7  },
    { name: "固定資産台帳", headerRowIdx: 3,  cols: 12 },
  ];

  type Color = { red: number; green: number; blue: number };
  const colorCell = (bg: Color, fg: Color, bold: boolean, fontSize?: number) => ({
    userEnteredFormat: {
      backgroundColor: bg,
      textFormat: { foregroundColor: fg, bold, ...(fontSize ? { fontSize } : {}) },
    },
  });

  const formatRequests = sheetLayouts.flatMap(({ name, headerRowIdx, cols }) => {
    const sheetId = sheetIdMap.get(name) ?? 0;
    return [
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: cols },
          cell: colorCell(titleBg, titleFg, true, 13),
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        repeatCell: {
          range: { sheetId, startRowIndex: headerRowIdx, endRowIndex: headerRowIdx + 1, startColumnIndex: 0, endColumnIndex: cols },
          cell: colorCell(headerBg, headerFg, true),
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
    ];
  });

  const fmtRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: formatRequests }),
    }
  );
  if (!fmtRes.ok) {
    if (fmtRes.status === 401) throw new Error("AUTH_EXPIRED");
    const body = await fmtRes.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? `HTTP ${fmtRes.status}`
    );
  }

  return id;
}

// ── 固定資産台帳ヘルパー ──────────────────────────────────────

function deprRate(method: string, usefulLife: number): string {
  if (method === "lump")     return "0.333";
  if (method === "straight") return (1 / usefulLife).toFixed(3);
  return (Math.round((2 / usefulLife) * 1000) / 1000).toFixed(3);
}

function monthsInService(acquisitionDate: string, year: number): number {
  const acqYear  = Number(acquisitionDate.slice(0, 4));
  const acqMonth = Number(acquisitionDate.slice(5, 7));
  if (acqYear < year) return 12;
  if (acqYear > year) return 0;
  return 12 - acqMonth + 1;
}

function calcStartBV(asset: Omit<FixedAsset, "id" | "createdAt">, year: number): number {
  const acqYear = Number(asset.acquisitionDate.slice(0, 4));
  let bv = asset.acquisitionCost;
  for (let y = acqYear; y < year; y++) {
    bv -= calcDepreciation(asset, y);
  }
  return Math.max(bv, 0);
}
