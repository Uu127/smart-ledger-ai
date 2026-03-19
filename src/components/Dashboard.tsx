// src/components/Dashboard.tsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Calendar, FileText } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";

type MonthSummary = {
  label: string;
  income: number;
  expense: number;
};

function buildMonthlySummary(entries: ReturnType<typeof useLedger>["entries"]): MonthSummary[] {
  const map = new Map<string, { income: number; expense: number }>();
  for (const e of entries) {
    const ym = e.date.slice(0, 7);
    const cur = map.get(ym) ?? { income: 0, expense: 0 };
    if (e.entryType === "income") cur.income += e.amount;
    else cur.expense += e.amount;
    map.set(ym, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([ym, { income, expense }]) => {
      const [, m] = ym.split("-");
      return { label: `${Number(m)}月`, income, expense };
    });
}

function buildExpenseByAccount(entries: ReturnType<typeof useLedger>["entries"]) {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.entryType !== "income") {
      map.set(e.debitAccount, (map.get(e.debitAccount) ?? 0) + e.amount);
    }
  }
  return Array.from(map.entries()).sort(([, a], [, b]) => b - a).slice(0, 6);
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 bg-slate-100 rounded-full flex flex-col justify-end overflow-hidden" style={{ height: "80px" }}>
      <div className={`w-full rounded-full transition-all duration-700 ${color}`} style={{ height: `${pct}%` }} />
    </div>
  );
}

export function Dashboard() {
  const { entries, syncing } = useLedger();

  const year = new Date().getFullYear();
  const yearEntries = useMemo(() => entries.filter(e => e.date.startsWith(String(year))), [entries, year]);

  const totalIncome  = useMemo(() => yearEntries.filter(e => e.entryType === "income").reduce((s, e) => s + e.amount, 0), [yearEntries]);
  const totalExpense = useMemo(() => yearEntries.filter(e => e.entryType !== "income").reduce((s, e) => s + e.amount, 0), [yearEntries]);
  const profit       = totalIncome - totalExpense;

  const monthly    = useMemo(() => buildMonthlySummary(yearEntries), [yearEntries]);
  const byAccount  = useMemo(() => buildExpenseByAccount(yearEntries), [yearEntries]);
  const maxMonthly = useMemo(() => Math.max(...monthly.map(m => Math.max(m.income, m.expense)), 1), [monthly]);

  const deadline = new Date(`${year + 1}-03-15`);
  const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  if (syncing) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
            <div className="h-10 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4 pb-24"
    >
      <header className="px-2">
        <h2 className="text-2xl font-black text-slate-900">Dashboard</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{year}年 収支サマリー</p>
      </header>

      {/* 確定申告カウントダウン */}
      <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">確定申告まで</p>
            <p className="text-sm font-black">{year + 1}年3月15日 締切</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-emerald-400">{daysLeft}</p>
          <p className="text-[10px] font-black text-slate-400">日</p>
        </div>
      </div>

      {/* 年間サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="flex items-center gap-1 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[10px] font-black text-blue-500 uppercase">売上</p>
          </div>
          <p className="text-base font-black text-slate-900">
            <span className="text-xs">¥</span>{totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4">
          <div className="flex items-center gap-1 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            <p className="text-[10px] font-black text-red-500 uppercase">経費</p>
          </div>
          <p className="text-base font-black text-slate-900">
            <span className="text-xs">¥</span>{totalExpense.toLocaleString()}
          </p>
        </div>
        <div className={`${profit >= 0 ? "bg-emerald-50" : "bg-orange-50"} rounded-2xl p-4`}>
          <div className="flex items-center gap-1 mb-2">
            <Minus className={`w-3.5 h-3.5 ${profit >= 0 ? "text-emerald-500" : "text-orange-500"}`} />
            <p className={`text-[10px] font-black uppercase ${profit >= 0 ? "text-emerald-500" : "text-orange-500"}`}>所得</p>
          </div>
          <p className="text-base font-black text-slate-900">
            <span className="text-xs">¥</span>{profit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 月別グラフ */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h3 className="font-black text-slate-800 text-sm">月別収支</h3>
            <div className="ml-auto flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />売上</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />経費</span>
            </div>
          </div>
          <div className="flex gap-2">
            {monthly.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col gap-1">
                <div className="flex gap-0.5 items-end" style={{ height: "80px" }}>
                  <Bar value={m.income}  max={maxMonthly} color="bg-blue-400" />
                  <Bar value={m.expense} max={maxMonthly} color="bg-red-400"  />
                </div>
                <p className="text-[10px] font-black text-slate-400 text-center">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 科目別経費 */}
      {byAccount.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
          <h3 className="font-black text-slate-800 text-sm mb-4">経費内訳（科目別）</h3>
          <div className="space-y-3">
            {byAccount.map(([account, amount]) => {
              const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
              return (
                <div key={account}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-700">{account}</span>
                    <span className="text-xs font-black text-slate-900">¥{amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 text-right">{pct.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="py-16 text-center space-y-3 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <p className="text-sm font-bold text-slate-300">まだデータがありません</p>
          <p className="text-xs text-slate-200 font-bold">Scanから経費を、Salesから売上を記録してください</p>
        </div>
      )}
    </motion.div>
  );
}