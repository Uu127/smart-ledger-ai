// src/components/LedgerList.tsx
import { useMemo } from "react";
import { Download, RefreshCw, Plus, Calendar, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { useLedger } from "@/hooks/useLedger";
import type { LedgerEntry } from "@/types/ledger";

// CSV出力用のヘルパー
const CSV_HEADER = "日付,借方勘定科目,借方金額,貸方勘定科目,貸方金額,摘要,取引先";
function escapeCsvCell(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(entries: LedgerEntry[]) {
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const body = sorted.map(e => [
    e.date, escapeCsvCell(e.debitAccount), e.amount,
    escapeCsvCell(e.creditAccount), e.amount,
    escapeCsvCell(e.description), escapeCsvCell(e.counterparty)
  ].join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + CSV_HEADER + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `経費台帳_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LedgerList() {
  const { entries, refresh } = useLedger();

  const sorted = useMemo(() =>
    [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [entries]);

  // 今月の合計金額
  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return entries
      .filter(e => e.date.startsWith(ym))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [entries]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4 pb-24"
    >
      {/* ヘッダー */}
      <header className="flex items-end justify-between px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900">History</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">経費利用履歴</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="p-2.5 rounded-full bg-white border border-slate-100 text-slate-400 active:rotate-180 transition-all"
            aria-label="更新"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* ✅ 修正：bg-primary → 明示的な emerald カラーに変更 */}
          <button
            onClick={() => downloadCsv(entries)}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </header>

      {/* 今月サマリーカード */}
      {entries.length > 0 && (
        <div className="bg-emerald-500 rounded-2xl p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">今月の経費合計</p>
          <p className="text-3xl font-black mt-1">
            <span className="text-lg mr-1">¥</span>
            {thisMonthTotal.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-200 font-bold mt-1">{entries.length} 件の記録</p>
        </div>
      )}

      {/* 一覧 */}
      {sorted.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-200">
            <Plus className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-slate-300">まだデータがありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((e) => (
            <div
              key={e.id}
              className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-50 flex items-center justify-between active:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-4">
                {/* 日付バッジ */}
                <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center justify-center min-w-[56px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                    {new Date(e.date).toLocaleString("en-us", { month: "short" })}
                  </span>
                  <span className="text-lg font-black text-slate-700 leading-none">
                    {e.date.split("-")[2]}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 leading-tight mb-1">{e.counterparty}</p>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {e.debitAccount}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {e.creditAccount}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-slate-900">
                  <span className="text-xs mr-0.5">¥</span>
                  {e.amount.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-slate-300 truncate max-w-[80px]">{e.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}