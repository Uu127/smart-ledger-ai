// src/components/ETaxHelper.tsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Copy, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { useProRate } from "@/hooks/useProRate";
import { useDepreciation, calcTotalDepreciation } from "@/hooks/useDepreciation";
import type { LedgerEntry } from "@/types/ledger";

// ── 科目マッピング（e-Tax収支内訳書・青色申告決算書準拠） ──
const ACCOUNT_MAP: Record<string, string> = {
  "仕入高": "売上原価（仕入）", "外注費": "外注費",
  "給料賃金": "給料賃金", "専従者給与": "専従者給与", "福利厚生費": "福利厚生費",
  "地代家賃": "地代家賃", "修繕費": "修繕費", "減価償却費": "減価償却費",
  "旅費交通費": "旅費交通費", "通信費": "通信費", "車両費": "車両費", "荷造運賃": "荷造運賃",
  "接待交際費": "接待交際費", "会議費": "会議費", "広告宣伝費": "広告宣伝費",
  "消耗品費": "消耗品費", "新聞図書費": "新聞図書費",
  "租税公課": "租税公課", "損害保険料": "損害保険料",
  "利子割引料": "利子割引料", "貸倒金": "貸倒金",
  "研修費": "雑費", "水道光熱費": "水道光熱費",
  "支払手数料": "雑費", "雑費": "雑費",
};

const OFFICIAL_ORDER = [
  "売上原価（仕入）", "給料賃金", "専従者給与", "外注費",
  "減価償却費", "貸倒金", "地代家賃", "利子割引料",
  "租税公課", "荷造運賃", "水道光熱費", "旅費交通費",
  "通信費", "広告宣伝費", "接待交際費", "損害保険料",
  "修繕費", "消耗品費", "福利厚生費", "会議費",
  "車両費", "雑費",
];

// ── 集計 ─────────────────────────────────────────────────
function calcSummary(
  entries: LedgerEntry[],
  year: number,
  proRateEnabled: boolean,
  proRateRatio: number,
  proRateTargets: string[],
  extraDepreciation: number,
) {
  const yearEntries = entries.filter(e => e.date.startsWith(String(year)));
  const totalIncome = yearEntries.filter(e => e.entryType === "income").reduce((s, e) => s + e.amount, 0);

  const expenseMap = new Map<string, number>();
  yearEntries.filter(e => e.entryType === "expense").forEach(e => {
    const mapped   = ACCOUNT_MAP[e.debitAccount] ?? "雑費";
    const isTarget = proRateEnabled && proRateTargets.includes(e.debitAccount);
    const amount   = isTarget ? Math.round(e.amount * proRateRatio / 100) : e.amount;
    expenseMap.set(mapped, (expenseMap.get(mapped) ?? 0) + amount);
  });

  if (extraDepreciation > 0) {
    expenseMap.set("減価償却費", (expenseMap.get("減価償却費") ?? 0) + extraDepreciation);
  }

  const expenses = OFFICIAL_ORDER
    .filter(k => expenseMap.has(k))
    .map(k => ({ account: k, amount: expenseMap.get(k)! }));

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const netIncome    = totalIncome - totalExpense;

  return { totalIncome, totalExpense, netIncome, expenses };
}

// ── コピーボタン ──────────────────────────────────────────
function CopyButton({ value }: { value: string | number }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handle}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all active:scale-95 ${
        copied ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "コピー済" : "コピー"}
    </button>
  );
}

// ── 入力補助行 ────────────────────────────────────────────
function InputRow({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-700 leading-tight">{label}</p>
        {note && <p className="text-[9px] font-bold text-slate-400 mt-0.5">{note}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-black text-slate-900">
          {typeof value === "number" ? `¥${value.toLocaleString()}` : value}
        </span>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────────
export function ETaxHelper() {
  const { entries, syncing }                      = useLedger();
  const { settings: proRate, loading: prLoading } = useProRate();
  const { assets, loading: depLoading }           = useDepreciation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [section, setSection] = useState<"income" | "expense" | "summary">("summary");

  const depreciation = useMemo(() => calcTotalDepreciation(assets, year), [assets, year]);

  const summary = useMemo(() => calcSummary(
    entries, year,
    proRate.enabled, proRate.ratio, proRate.targetAccounts,
    depreciation,
  ), [entries, year, proRate, depreciation]);

  const availableYears = useMemo(() => {
    const years = new Set(entries.map(e => Number(e.date.slice(0, 4))));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [entries, currentYear]);

  const isLoading = syncing || prLoading || depLoading;

  // 月次売上内訳
  const monthlyIncome = useMemo(() => {
    const map = new Map<string, number>();
    entries.filter(e => e.date.startsWith(String(year)) && e.entryType === "income")
      .forEach(e => {
        const m = Number(e.date.slice(5, 7));
        map.set(String(m), (map.get(String(m)) ?? 0) + e.amount);
      });
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount: map.get(String(i + 1)) ?? 0,
    }));
  }, [entries, year]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-4 pb-24"
    >
      {/* タイトル */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-white/20 p-2 rounded-xl">
            <ExternalLink className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black">e-Tax 入力補助</h2>
            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-tight">e-Tax Input Assistant</p>
          </div>
        </div>
        <p className="text-[11px] text-indigo-200 font-bold mt-2 leading-relaxed">
          e-Taxの入力画面で使う数値を確認・コピーできます。各項目の「コピー」ボタンでクリップボードにコピーされます。
        </p>
      </div>

      {/* 注意書き */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-black text-blue-700">e-Taxの使い方</p>
          <p className="text-[11px] font-bold text-blue-600 leading-relaxed">
            1. 下のリンクからe-Taxにアクセス<br />
            2. このアプリで数値を確認・コピー<br />
            3. e-Taxの各入力欄に貼り付け
          </p>
          <a
            href="https://www.e-tax.nta.go.jp/"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 underline mt-1"
          >
            e-Tax公式サイト <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 年度選択 */}
      <div className="relative">
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="w-full p-4 pr-10 rounded-2xl bg-white border border-slate-100 text-slate-800 font-black text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none">
          {availableYears.map(y => (
            <option key={y} value={y}>{y}年分（{y}/1/1〜{y}/12/31）</option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {/* セクション切り替えタブ */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
        {([
          { key: "summary", label: "収支サマリー" },
          { key: "income",  label: "売上内訳" },
          { key: "expense", label: "経費内訳" },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setSection(key)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${
              section === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-10 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* 収支サマリーセクション */}
          {section === "summary" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                青色申告決算書 — 損益計算書
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mb-3">
                e-Taxの「収入金額」「必要経費」欄に入力する値です
              </p>
              <InputRow label="収入金額（売上高）" value={summary.totalIncome} note="e-Tax「売上（収入）金額」欄" />
              <InputRow label="必要経費 合計" value={summary.totalExpense} note="e-Tax「必要経費 合計」欄" />
              <InputRow label="所得金額（収入 − 経費）" value={summary.netIncome} note="e-Tax「所得金額」欄" />
              {proRate.enabled && (
                <div className="mt-3 bg-purple-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-purple-600">
                    ※ 家事按分（{proRate.ratio}%）適用済みの金額です
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 売上内訳セクション */}
          {section === "income" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                月次売上内訳
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mb-3">
                e-Taxの「月別売上（収入）金額及び仕入金額」欄に入力する値です
              </p>
              {monthlyIncome.map(({ month, amount }) => (
                <InputRow
                  key={month}
                  label={`${month}月`}
                  value={amount}
                  note={amount === 0 ? "売上なし" : undefined}
                />
              ))}
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-black text-slate-800">年間合計</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-indigo-600">¥{summary.totalIncome.toLocaleString()}</span>
                  <CopyButton value={summary.totalIncome} />
                </div>
              </div>
            </div>
          )}

          {/* 経費内訳セクション */}
          {section === "expense" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                経費科目別内訳
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mb-3">
                e-Taxの「経費」各欄に入力する値です。0円の科目は入力不要です。
              </p>
              {summary.expenses.length === 0 ? (
                <p className="text-sm font-bold text-slate-300 text-center py-8">
                  {year}年の経費データがありません
                </p>
              ) : (
                <>
                  {summary.expenses.map(e => (
                    <InputRow key={e.account} label={e.account} value={e.amount} />
                  ))}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-800">経費合計</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-emerald-600">¥{summary.totalExpense.toLocaleString()}</span>
                      <CopyButton value={summary.totalExpense} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* e-Tax リンクボタン */}
          <a
            href="https://www.e-tax.nta.go.jp/"
            target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-indigo-500 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-600 active:scale-95 transition-all"
          >
            <ExternalLink className="w-5 h-5" />
            e-Taxを開く（国税庁）
          </a>

          {/* 免責事項 */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-700 leading-relaxed">
              ⚠️ この画面はe-Taxへの入力を補助するためのものです。
              実際の申告内容の正確性はご自身でご確認ください。
              不明点は税務署または税理士にご相談ください。
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}