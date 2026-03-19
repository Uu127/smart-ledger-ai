// src/components/LedgerList.tsx
import { useMemo, useState } from "react";
import { Download, RefreshCw, Plus, Calendar, Tag, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLedger } from "@/hooks/useLedger";
import type { LedgerEntry } from "@/types/ledger";

// ── CSV出力 ──────────────────────────────────────────────
const CSV_HEADER = "日付,借方勘定科目,借方金額,貸方勘定科目,貸方金額,摘要,取引先";
function escapeCsvCell(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(entries: LedgerEntry[], label?: string) {
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
  const suffix = label ?? new Date().toISOString().slice(0, 10);
  a.download = `経費台帳_${suffix}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 月別グループ化 ────────────────────────────────────────
type MonthGroup = {
  yearMonth: string;
  label: string;
  entries: LedgerEntry[];
  total: number;
};

function groupByMonth(entries: LedgerEntry[]): MonthGroup[] {
  const map = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    const ym = e.date.slice(0, 7);
    const list = map.get(ym) ?? [];
    list.push(e);
    map.set(ym, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([ym, list]) => {
      const [y, m] = ym.split("-");
      return {
        yearMonth: ym,
        label: `${y}年${Number(m)}月`,
        entries: [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        total: list.reduce((s, e) => s + e.amount, 0),
      };
    });
}

// ── 月別セクション ────────────────────────────────────────
function MonthSection({ group, defaultOpen }: { group: MonthGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-50 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 active:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 p-2 rounded-xl">
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-left">
            <p className="font-black text-slate-800 text-sm">{group.label}</p>
            <p className="text-[10px] font-bold text-slate-400">{group.entries.length}件</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-black text-slate-900">
            <span className="text-xs mr-0.5">¥</span>
            {group.total.toLocaleString()}
          </p>
          {open
            ? <ChevronUp className="w-4 h-4 text-slate-300" />
            : <ChevronDown className="w-4 h-4 text-slate-300" />
          }
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-50 divide-y divide-slate-50">
              {group.entries.map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3.5 active:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-50 rounded-xl flex flex-col items-center justify-center w-11 h-11 shrink-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">
                        {new Date(e.date).toLocaleString("en-us", { month: "short" })}
                      </span>
                      <span className="text-sm font-black text-slate-700 leading-none">
                        {e.date.split("-")[2]}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm leading-tight">{e.counterparty}</p>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-0.5">
                        <Tag className="w-3 h-3" />{e.debitAccount}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-sm">
                      <span className="text-xs mr-0.5">¥</span>
                      {e.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-slate-300 truncate max-w-[72px]">{e.creditAccount}</p>
                  </div>
                </div>
              ))}

              {/* 月ごとのCSV出力 */}
              <div className="px-5 py-3">
                <button
                  onClick={() => downloadCsv(group.entries, group.yearMonth)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 text-slate-400 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  {group.label}のCSVを出力
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────────
export function LedgerList() {
  const { entries, refresh } = useLedger();
  const [view, setView] = useState<"monthly" | "all">("monthly");

  const monthGroups = useMemo(() => groupByMonth(entries), [entries]);

  const allSorted = useMemo(() =>
    [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries]);

 

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
          <button
            onClick={() => downloadCsv(entries)}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </header>

      {/* 年間サマリーカード */}
      {entries.length > 0 && (
        <div className="bg-emerald-500 rounded-2xl p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 mb-3">
            {new Date().getFullYear()}年 収支記録 — 全{entries.length}件
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">収入</p>
              <p className="text-lg font-black">
                <span className="text-xs mr-0.5">¥</span>
                {entries.filter(e => e.entryType === "income").reduce((s, e) => s + e.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">経費</p>
              <p className="text-lg font-black">
                <span className="text-xs mr-0.5">¥</span>
                {entries.filter(e => e.entryType === "expense").reduce((s, e) => s + e.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ビュー切り替えタブ */}
      {entries.length > 0 && (
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setView("monthly")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${view === "monthly" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
              }`}
          >
            <Calendar className="w-3.5 h-3.5" /> 月別
          </button>
          <button
            onClick={() => setView("all")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${view === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
              }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> すべて
          </button>
        </div>
      )}

      {/* データなし */}
      {entries.length === 0 && (
        <div className="py-20 text-center space-y-4 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-200">
            <Plus className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-slate-300">まだデータがありません</p>
        </div>
      )}

      {/* 月別ビュー */}
      {view === "monthly" && (
        <div className="space-y-3">
          {monthGroups.map((group, i) => (
            <MonthSection key={group.yearMonth} group={group} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {/* 全件ビュー */}
      {view === "all" && (
        <div className="space-y-3">
          {allSorted.map((e) => (
            <div
              key={e.id}
              className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-50 flex items-center justify-between active:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-4">
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
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{e.debitAccount}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{e.creditAccount}</span>
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