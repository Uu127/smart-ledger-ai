// src/components/TaxReport.tsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, ChevronDown } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import type { LedgerEntry } from "@/types/ledger";

// ── 申告書科目マッピング ──────────────────────────────────
// アプリ内科目 → 青色申告決算書の科目区分
const ACCOUNT_MAP: Record<string, string> = {
  "仕入高":     "売上原価（仕入）",
  "外注費":     "外注費",
  "給料賃金":   "給料賃金",
  "専従者給与": "専従者給与",
  "福利厚生費": "福利厚生費",
  "地代家賃":   "地代家賃",
  "修繕費":     "修繕費",
  "減価償却費": "減価償却費",
  "旅費交通費": "旅費交通費",
  "通信費":     "通信費",
  "車両費":     "車両費",
  "荷造運賃":   "荷造運賃",
  "接待交際費": "接待交際費",
  "会議費":     "会議費",
  "広告宣伝費": "広告宣伝費",
  "消耗品費":   "消耗品費",
  "新聞図書費": "新聞図書費",
  "租税公課":   "租税公課",
  "損害保険料": "損害保険料",
  "利子割引料": "利子割引料",
  "貸倒金":     "貸倒金",
  "研修費":     "研修費（雑費）",
  "水道光熱費": "水道光熱費",
  "支払手数料": "支払手数料（雑費）",
  "雑費":       "雑費",
};

// 青色申告決算書の経費科目の正式な並び順
const OFFICIAL_ORDER = [
  "売上原価（仕入）",
  "給料賃金",
  "専従者給与",
  "外注費",
  "減価償却費",
  "貸倒金",
  "地代家賃",
  "利子割引料",
  "租税公課",
  "荷造運賃",
  "水道光熱費",
  "旅費交通費",
  "通信費",
  "広告宣伝費",
  "接待交際費",
  "損害保険料",
  "修繕費",
  "消耗品費",
  "福利厚生費",
  "会議費",
  "車両費",
  "研修費（雑費）",
  "新聞図書費",
  "支払手数料（雑費）",
  "雑費",
];

// ── 集計ロジック ──────────────────────────────────────────
function calcReport(entries: LedgerEntry[], year: number) {
  const yearEntries = entries.filter(e => e.date.startsWith(String(year)));

  // 売上合計
  const totalIncome = yearEntries
    .filter(e => e.entryType === "income")
    .reduce((s, e) => s + e.amount, 0);

  // 経費を科目別に集計
  const expenseMap = new Map<string, number>();
  yearEntries
    .filter(e => e.entryType === "expense")
    .forEach(e => {
      const mapped = ACCOUNT_MAP[e.debitAccount] ?? "雑費";
      expenseMap.set(mapped, (expenseMap.get(mapped) ?? 0) + e.amount);
    });

  // 正式な並び順で並べ替え
  const expenses = OFFICIAL_ORDER
    .filter(k => expenseMap.has(k))
    .map(k => ({ account: k, amount: expenseMap.get(k)! }));

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const netIncome    = totalIncome - totalExpense;

  return { totalIncome, totalExpense, netIncome, expenses, yearEntries };
}

// ── CSV生成 ───────────────────────────────────────────────
function escapeCsv(s: string) {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadSummaryCSV(year: number, report: ReturnType<typeof calcReport>) {
  const rows = [
    ["SmartLedger AI", `${year}年 青色申告決算書 収支サマリー`],
    [],
    ["区分", "金額（円）"],
    ["【売上高】", report.totalIncome],
    [],
    ["【経費明細】", ""],
    ...report.expenses.map(e => [e.account, e.amount]),
    [],
    ["経費合計", report.totalExpense],
    ["所得金額（売上 − 経費）", report.netIncome],
  ];
  const csv = rows.map(r => r.map(c => escapeCsv(String(c))).join(",")).join("\n");
  downloadBlob(`青色申告_${year}年_収支サマリー.csv`, csv);
}

function downloadDetailCSV(year: number, report: ReturnType<typeof calcReport>) {
  const header = "日付,種別,借方勘定科目,貸方勘定科目,金額,摘要,取引先";
  const body = report.yearEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => [
      e.date,
      e.entryType === "income" ? "収入" : "経費",
      escapeCsv(e.debitAccount),
      escapeCsv(e.creditAccount),
      e.amount,
      escapeCsv(e.description),
      escapeCsv(e.counterparty),
    ].join(","))
    .join("\n");
  downloadBlob(`青色申告_${year}年_仕訳明細.csv`, header + "\n" + body);
}

function downloadBlob(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── コンポーネント ────────────────────────────────────────
export function TaxReport() {
  const { entries, syncing } = useLedger();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const report = useMemo(() => calcReport(entries, year), [entries, year]);

  // 選択可能な年度（データがある年のみ）
  const availableYears = useMemo(() => {
    const years = new Set(entries.map(e => Number(e.date.slice(0, 4))));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [entries, currentYear]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-4 pb-24"
    >
      {/* タイトル */}
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-900">申告書</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">青色申告決算書</p>
      </div>

      {/* 年度選択 */}
      <div className="relative">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full p-4 pr-10 rounded-2xl bg-white border border-slate-100 text-slate-800 font-black text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none"
        >
          {availableYears.map(y => (
            <option key={y} value={y}>{y}年（{y}年1月1日〜{y}年12月31日）</option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {syncing ? (
        <div className="py-10 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
        </div>
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

          {/* 経費科目別明細 */}
          {report.expenses.length > 0 ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">経費 科目別明細</h3>
              <div className="space-y-0">
                {report.expenses.map((e, i) => (
                  <div
                    key={e.account}
                    className={`flex justify-between items-center py-2.5 ${
                      i < report.expenses.length - 1 ? "border-b border-slate-50" : ""
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-600">{e.account}</span>
                    <span className="text-sm font-black text-slate-900">¥{e.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
              <p className="text-sm font-bold text-slate-300">{year}年のデータがありません</p>
            </div>
          )}

          {/* CSV出力ボタン */}
          <div className="space-y-3">
            <button
              onClick={() => downloadSummaryCSV(year, report)}
              disabled={report.yearEntries.length === 0}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              収支サマリーCSV（申告用）を出力
            </button>

            <button
              onClick={() => downloadDetailCSV(year, report)}
              disabled={report.yearEntries.length === 0}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-sm hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <FileText className="w-5 h-5" />
              仕訳明細CSVを出力
            </button>
          </div>

          {/* 注意書き */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-700 leading-relaxed">
              ⚠️ このCSVはe-Taxや会計ソフトへの入力補助用です。
              実際の申告書は税務署またはe-Taxで作成・提出してください。
              金額に不明点がある場合は税理士にご相談ください。
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}