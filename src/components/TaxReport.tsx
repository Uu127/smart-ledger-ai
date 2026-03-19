// src/components/TaxReport.tsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, ChevronDown, Home, Package, ExternalLink, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { useLedger } from "@/hooks/useLedger";
import { useProRate } from "@/hooks/useProRate";
import { useDepreciation, calcTotalDepreciation } from "@/hooks/useDepreciation";
import { TaxReportPrint } from "@/components/TaxReportPrint";
import type { LedgerEntry } from "@/types/ledger";

const ACCOUNT_MAP: Record<string, string> = {
  "仕入高": "売上原価（仕入）", "外注費": "外注費",
  "給料賃金": "給料賃金", "専従者給与": "専従者給与", "福利厚生費": "福利厚生費",
  "地代家賃": "地代家賃", "修繕費": "修繕費", "減価償却費": "減価償却費",
  "旅費交通費": "旅費交通費", "通信費": "通信費", "車両費": "車両費", "荷造運賃": "荷造運賃",
  "接待交際費": "接待交際費", "会議費": "会議費", "広告宣伝費": "広告宣伝費",
  "消耗品費": "消耗品費", "新聞図書費": "新聞図書費",
  "租税公課": "租税公課", "損害保険料": "損害保険料",
  "利子割引料": "利子割引料", "貸倒金": "貸倒金",
  "研修費": "研修費（雑費）", "水道光熱費": "水道光熱費",
  "支払手数料": "支払手数料（雑費）", "雑費": "雑費",
};

const OFFICIAL_ORDER = [
  "売上原価（仕入）", "給料賃金", "専従者給与", "外注費",
  "減価償却費", "貸倒金", "地代家賃", "利子割引料",
  "租税公課", "荷造運賃", "水道光熱費", "旅費交通費",
  "通信費", "広告宣伝費", "接待交際費", "損害保険料",
  "修繕費", "消耗品費", "福利厚生費", "会議費",
  "車両費", "研修費（雑費）", "新聞図書費", "支払手数料（雑費）", "雑費",
];

function calcReport(
  entries: LedgerEntry[], year: number,
  proRateEnabled: boolean, proRateRatio: number, proRateTargets: string[],
  extraDepreciation: number,
) {
  const yearEntries = entries.filter(e => e.date.startsWith(String(year)));
  const totalIncome = yearEntries.filter(e => e.entryType === "income").reduce((s, e) => s + e.amount, 0);
  const expenseMap  = new Map<string, number>();

  yearEntries.filter(e => e.entryType === "expense").forEach(e => {
    const mapped   = ACCOUNT_MAP[e.debitAccount] ?? "雑費";
    const isTarget = proRateEnabled && proRateTargets.includes(e.debitAccount);
    const amount   = isTarget ? Math.round(e.amount * proRateRatio / 100) : e.amount;
    expenseMap.set(mapped, (expenseMap.get(mapped) ?? 0) + amount);
  });

  if (extraDepreciation > 0) {
    expenseMap.set("減価償却費", (expenseMap.get("減価償却費") ?? 0) + extraDepreciation);
  }

  const expenses     = OFFICIAL_ORDER.filter(k => expenseMap.has(k)).map(k => ({ account: k, amount: expenseMap.get(k)! }));
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const netIncome    = totalIncome - totalExpense;

  return { totalIncome, totalExpense, netIncome, expenses, yearEntries };
}

function escapeCsv(s: string) { return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function downloadBlob(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function downloadSummaryCSV(year: number, report: ReturnType<typeof calcReport>, proRateEnabled: boolean, proRateRatio: number) {
  const note = proRateEnabled ? `家事按分（${proRateRatio}%）適用済み` : "家事按分なし";
  const rows = [
    ["SmartLedger AI", `${year}年 青色申告決算書`, note], [],
    ["区分", "金額（円）"], ["【売上高】", report.totalIncome], [],
    ["【経費明細】", ""], ...report.expenses.map(e => [e.account, e.amount]), [],
    ["経費合計", report.totalExpense], ["所得金額（売上 − 経費）", report.netIncome],
  ];
  downloadBlob(`青色申告_${year}年_収支サマリー.csv`, rows.map(r => r.map(c => escapeCsv(String(c))).join(",")).join("\n"));
}
function downloadDetailCSV(year: number, report: ReturnType<typeof calcReport>) {
  const header = "日付,種別,借方勘定科目,貸方勘定科目,金額,摘要,取引先";
  const body   = report.yearEntries.sort((a, b) => a.date.localeCompare(b.date))
    .map(e => [e.date, e.entryType === "income" ? "収入" : "経費",
      escapeCsv(e.debitAccount), escapeCsv(e.creditAccount),
      e.amount, escapeCsv(e.description), escapeCsv(e.counterparty)].join(",")).join("\n");
  downloadBlob(`青色申告_${year}年_仕訳明細.csv`, header + "\n" + body);
}

export function TaxReport() {
  const { entries, syncing }                      = useLedger();
  const { settings: proRate, loading: prLoading } = useProRate();
  const { assets, loading: depLoading }           = useDepreciation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const depreciation = useMemo(() => calcTotalDepreciation(assets, year), [assets, year]);
  const report = useMemo(() => calcReport(entries, year, proRate.enabled, proRate.ratio, proRate.targetAccounts, depreciation), [entries, year, proRate, depreciation]);

  const availableYears = useMemo(() => {
    const years = new Set(entries.map(e => Number(e.date.slice(0, 4)))); years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [entries, currentYear]);

  const isLoading = syncing || prLoading || depLoading;

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 space-y-4 pb-24">

      {/* 印刷用レイアウト（画面には非表示・印刷時のみ表示） */}
      <TaxReportPrint
        year={year}
        totalIncome={report.totalIncome}
        totalExpense={report.totalExpense}
        netIncome={report.netIncome}
        expenses={report.expenses}
        proRateEnabled={proRate.enabled}
        proRateRatio={proRate.ratio}
        depreciation={depreciation}
        entries={entries}
      />

      {/* タイトル */}
      <div className="px-2 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">申告書</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">青色申告決算書</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Link to="/settings/prorate" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-600 text-[10px] font-black active:scale-95 transition-all">
            <Home className="w-3 h-3" /> 家事按分 {proRate.enabled ? `${proRate.ratio}%` : "OFF"}
          </Link>
          <Link to="/depreciation" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 text-[10px] font-black active:scale-95 transition-all">
            <Package className="w-3 h-3" /> 固定資産 {assets.length}件
          </Link>
        </div>
      </div>

      {proRate.enabled && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 flex items-center gap-2">
          <Home className="w-4 h-4 text-purple-500 shrink-0" />
          <p className="text-xs font-bold text-purple-700">家事按分 {proRate.ratio}% 適用中 — {proRate.targetAccounts.join("・")} を按分して計算</p>
        </div>
      )}
      {depreciation > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-xs font-bold text-orange-700">固定資産の減価償却費 ¥{depreciation.toLocaleString()} を経費に加算中</p>
        </div>
      )}

      {/* 年度選択 */}
      <div className="relative">
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="w-full p-4 pr-10 rounded-2xl bg-white border border-slate-100 text-slate-800 font-black text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none">
          {availableYears.map(y => <option key={y} value={y}>{y}年（{y}/1/1〜{y}/12/31）</option>)}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {isLoading ? (
        <div className="py-10 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" /></div>
      ) : (
        <>
          {/* 収支サマリー */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">収支サマリー</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-sm font-bold text-slate-600">売上高</span>
                <span className="text-base font-black text-blue-600">¥{report.totalIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-sm font-bold text-slate-600">経費合計</span>
                <span className="text-base font-black text-emerald-600">¥{report.totalExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-black text-slate-800">所得金額</span>
                <span className={`text-lg font-black ${report.netIncome >= 0 ? "text-slate-900" : "text-red-500"}`}>
                  ¥{Math.abs(report.netIncome).toLocaleString()}
                  {report.netIncome < 0 && <span className="text-xs ml-1">（赤字）</span>}
                </span>
              </div>
            </div>
          </div>

          {/* 科目別明細 */}
          {report.expenses.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">経費 科目別明細</h3>
              {report.expenses.map((e, i) => {
                const isProRated = proRate.enabled && proRate.targetAccounts.some(a => (ACCOUNT_MAP[a] ?? a) === e.account);
                const isDepr     = e.account === "減価償却費" && depreciation > 0;
                return (
                  <div key={e.account} className={`flex justify-between items-center py-2.5 ${i < report.expenses.length - 1 ? "border-b border-slate-50" : ""}`}>
                    <span className="text-sm font-bold text-slate-600 flex items-center gap-1 flex-wrap">
                      {e.account}
                      {isProRated && <span className="text-[9px] bg-purple-100 text-purple-600 font-black px-1.5 py-0.5 rounded-full">按分</span>}
                      {isDepr && <span className="text-[9px] bg-orange-100 text-orange-600 font-black px-1.5 py-0.5 rounded-full">固定資産</span>}
                    </span>
                    <span className="text-sm font-black text-slate-900">¥{e.amount.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}

          {report.expenses.length === 0 && (
            <div className="py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
              <p className="text-sm font-bold text-slate-300">{year}年のデータがありません</p>
            </div>
          )}

          {/* 出力ボタン群 */}
          <div className="space-y-3">
            {/* PDF印刷 */}
            <button
              onClick={handlePrint}
              disabled={report.yearEntries.length === 0}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-lg hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Printer className="w-5 h-5" /> PDFとして保存・印刷
            </button>

            {/* e-Tax補助 */}
            <Link to="/etax"
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-indigo-500 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-600 active:scale-95 transition-all">
              <ExternalLink className="w-5 h-5" /> e-Tax 入力補助を開く
            </Link>

            {/* CSV出力 */}
            <button onClick={() => downloadSummaryCSV(year, report, proRate.enabled, proRate.ratio)}
              disabled={report.yearEntries.length === 0}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <Download className="w-5 h-5" /> 収支サマリーCSVを出力
            </button>
            <button onClick={() => downloadDetailCSV(year, report)}
              disabled={report.yearEntries.length === 0}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-sm hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <FileText className="w-5 h-5" /> 仕訳明細CSVを出力
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-700 leading-relaxed">
              ⚠️ このデータはe-Taxへの入力を補助するものです。実際の申告書は税務署またはe-Taxで作成・提出してください。
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}