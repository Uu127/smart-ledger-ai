// src/components/GeneralLedger.tsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLedger } from "@/hooks/useLedger";
import { filterByPeriod, type SheetsPeriod } from "@/hooks/useSheets";

// 勘定科目の表示順（資産→負債→収益→費用）
const GL_ORDER = [
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

// 貸方残高が正常（負債・収益）の科目 → 貸方 − 借方 で残高計算
const CREDIT_NORMAL = new Set([
  "クレジットカード", "電子マネー", "口座振替", "売上高",
]);

function glOrder(name: string): number {
  const i = GL_ORDER.indexOf(name);
  return i >= 0 ? i : GL_ORDER.length;
}

function periodStart(period: SheetsPeriod): string | null {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  if (period === "all")       return null;
  if (period === "thisYear")  return `${year}-01-01`;
  if (period === "thisMonth") return `${year}-${String(month).padStart(2, "0")}-01`;
  // lastMonth
  const lm = month === 1 ? 12 : month - 1;
  const ly = month === 1 ? year - 1 : year;
  return `${ly}-${String(lm).padStart(2, "0")}-01`;
}

const PERIODS: { value: SheetsPeriod; label: string }[] = [
  { value: "thisMonth", label: "今月" },
  { value: "lastMonth", label: "先月" },
  { value: "thisYear",  label: "今年" },
  { value: "all",       label: "全期間" },
];

const GL_CATEGORY: Record<string, string> = {
  "現金": "資産", "普通預金": "資産", "当座預金": "資産", "電子マネー": "資産",
  "クレジットカード": "負債", "口座振替": "負債",
  "売上高": "収益",
};

function categoryOf(name: string): string {
  return GL_CATEGORY[name] ?? "費用";
}

const CATEGORY_COLOR: Record<string, { bg: string; text: string }> = {
  "資産": { bg: "bg-blue-100",   text: "text-blue-600"   },
  "負債": { bg: "bg-red-100",    text: "text-red-600"    },
  "収益": { bg: "bg-emerald-100",text: "text-emerald-600"},
  "費用": { bg: "bg-slate-100",  text: "text-slate-500"  },
};

export function GeneralLedger() {
  const navigate = useNavigate();
  const { entries, syncing } = useLedger();
  const [period, setPeriod]                 = useState<SheetsPeriod>("thisYear");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // 全エントリから登場する科目を GL 順でリスト化
  const allAccounts = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) { set.add(e.debitAccount); set.add(e.creditAccount); }
    return [...set].sort((a, b) => glOrder(a) - glOrder(b));
  }, [entries]);

  // 選択期間で取引がある科目セット
  const periodEntries = useMemo(() => filterByPeriod(entries, period), [entries, period]);
  const activeSet = useMemo(() => {
    const s = new Set<string>();
    for (const e of periodEntries) { s.add(e.debitAccount); s.add(e.creditAccount); }
    return s;
  }, [periodEntries]);

  // 選択科目の期首残高 + 期間明細（残高付き）
  const { openingBalance, rows } = useMemo(() => {
    if (!selectedAccount) return { openingBalance: 0, rows: [] };

    const isCreditNormal = CREDIT_NORMAL.has(selectedAccount);
    const start = periodStart(period);

    const allForAcct = [...entries]
      .filter(e => e.debitAccount === selectedAccount || e.creditAccount === selectedAccount)
      .sort((a, b) => a.date.localeCompare(b.date));

    // 期首残高 = 期間開始日より前の全累計
    let ob = 0;
    if (start) {
      for (const e of allForAcct.filter(e => e.date < start)) {
        const isDebit  = e.debitAccount === selectedAccount;
        const d = isDebit  ? e.amount : 0;
        const c = !isDebit ? e.amount : 0;
        ob += isCreditNormal ? c - d : d - c;
      }
    }

    // 期間内の明細 + 残高
    const periodRows = start
      ? allForAcct.filter(e => e.date >= start && filterByPeriod([e], period).length > 0)
      : allForAcct;

    let balance = ob;
    const rows = periodRows.map(e => {
      const isDebit  = e.debitAccount === selectedAccount;
      const d = isDebit  ? e.amount : 0;
      const c = !isDebit ? e.amount : 0;
      balance += isCreditNormal ? c - d : d - c;
      return {
        id:             e.id,
        date:           e.date,
        counterAccount: isDebit ? e.creditAccount : e.debitAccount,
        description:    [e.description, e.counterparty].filter(Boolean).join(" "),
        debit:  d,
        credit: c,
        balance,
      };
    });

    return { openingBalance: ob, rows };
  }, [selectedAccount, entries, period]);

  const totalDebit  = rows.reduce((s, r) => s + r.debit,  0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const closingBal  = rows.length > 0 ? rows[rows.length - 1].balance : openingBalance;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-32"
    >
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><BookOpen className="w-5 h-5" /></div>
            <div>
              <h2 className="text-sm font-black">総勘定元帳</h2>
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-tight">General Ledger</p>
            </div>
          </div>
          <button onClick={() => navigate(-1)}
            className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all p-2.5 rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 期間選択 */}
      <div className="grid grid-cols-4 gap-1.5">
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => { setPeriod(p.value); setSelectedAccount(null); }}
            className="py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 border-2"
            style={period === p.value
              ? { borderColor: "#6366f1", backgroundColor: "#eef2ff", color: "#3730a3" }
              : { borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 勘定科目選択チップ */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          勘定科目を選択
        </p>
        {syncing ? (
          <div className="py-6 flex justify-center">
            <div className="w-6 h-6 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {allAccounts.map(account => {
              const isActive   = activeSet.has(account);
              const isSelected = selectedAccount === account;
              const cat        = categoryOf(account);
              const col        = CATEGORY_COLOR[cat];
              return (
                <button
                  key={account}
                  onClick={() => setSelectedAccount(isSelected ? null : account)}
                  disabled={!isActive}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 border
                    ${isSelected ? `${col.bg} ${col.text} border-current` : "border-[var(--border)]"}
                    ${!isActive ? "opacity-30" : ""}`}
                  style={isSelected
                    ? {}
                    : { backgroundColor: "var(--bg-card)", color: "var(--text-main)" }}
                >
                  {account}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 元帳テーブル */}
      {selectedAccount && !syncing && (
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>

          {/* 科目ヘッダー */}
          <div className="px-4 py-3 border-b"
            style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full
                  ${CATEGORY_COLOR[categoryOf(selectedAccount)].bg}
                  ${CATEGORY_COLOR[categoryOf(selectedAccount)].text}`}>
                  {categoryOf(selectedAccount)}
                </span>
                <span className="font-black text-sm" style={{ color: "var(--text-main)" }}>
                  {selectedAccount}
                </span>
              </div>
              <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                {rows.length} 件
              </span>
            </div>
            {rows.length > 0 && (
              <div className="flex gap-4 mt-2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                <span>借方計 ¥{totalDebit.toLocaleString()}</span>
                <span>貸方計 ¥{totalCredit.toLocaleString()}</span>
                <span className="font-black" style={{ color: "var(--text-main)" }}>
                  期末残高 ¥{closingBal.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* 期首残高行 */}
          {period !== "all" && (
            <div className="px-4 py-2.5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}>
              <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>期首残高</span>
              <span className="text-sm font-black" style={{ color: "var(--text-sub)" }}>
                ¥{openingBalance.toLocaleString()}
              </span>
            </div>
          )}

          {/* 明細行 */}
          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>この期間の取引はありません</p>
            </div>
          ) : (
            rows.map((row, i) => (
              <div key={row.id}
                className="px-4 py-3 border-b last:border-b-0 flex items-start justify-between gap-3"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: i % 2 === 1 ? "var(--bg-input)" : "var(--bg-card)"
                }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                      {row.date}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md border"
                      style={{
                        backgroundColor: "var(--bg-input)",
                        borderColor: "var(--border)",
                        color: "var(--text-sub)"
                      }}>
                      {row.counterAccount}
                    </span>
                  </div>
                  {row.description && (
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{row.description}</p>
                  )}
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  {row.debit > 0 && (
                    <p className="text-xs font-black" style={{ color: "var(--text-main)" }}>
                      借 ¥{row.debit.toLocaleString()}
                    </p>
                  )}
                  {row.credit > 0 && (
                    <p className="text-xs font-black" style={{ color: "var(--text-main)" }}>
                      貸 ¥{row.credit.toLocaleString()}
                    </p>
                  )}
                  <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                    残 ¥{row.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 科目未選択のプレースホルダー */}
      {!selectedAccount && !syncing && (
        <div className="py-16 text-center rounded-[2rem] border-2 border-dashed"
          style={{ borderColor: "var(--border)" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>科目を選択してください</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            上の科目チップをタップすると元帳が表示されます
          </p>
        </div>
      )}
    </motion.div>
  );
}
