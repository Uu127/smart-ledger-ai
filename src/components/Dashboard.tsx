// src/components/Dashboard.tsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Calendar, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useLedger } from "@/hooks/useLedger";
import type { LedgerEntry } from "@/types/ledger";

function getYearMonth(date: string) { return date.slice(0, 7); }
function formatYM(ym: string) {
  const [, m] = ym.split("-");
  return `${Number(m)}月`;
}
function daysUntilFiling() {
  const now  = new Date();
  const year = now.getMonth() >= 2 ? now.getFullYear() + 1 : now.getFullYear();
  const deadline = new Date(year, 2, 15);
  const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function SummaryCard({ label, amount, icon: Icon, color }: {
  label: string; amount: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`${color} rounded-2xl p-4 text-white`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 opacity-80" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
      </div>
      <p className="text-2xl font-black">
        <span className="text-sm mr-0.5">¥</span>
        {amount.toLocaleString()}
      </p>
    </div>
  );
}

function MonthlyChart({ data }: { data: { ym: string; income: number; expense: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((d) => (
        <div key={d.ym} className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-400">{formatYM(d.ym)}</p>
          <div className="flex items-center gap-2">
            <div className="w-12 text-[9px] font-bold text-blue-400 text-right">収入</div>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${(d.income / max) * 100}%` }} />
            </div>
            <div className="w-16 text-[9px] font-bold text-slate-500 text-right">
              ¥{(d.income / 10000).toFixed(0)}万
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 text-[9px] font-bold text-emerald-400 text-right">経費</div>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${(d.expense / max) * 100}%` }} />
            </div>
            <div className="w-16 text-[9px] font-bold text-slate-500 text-right">
              ¥{(d.expense / 10000).toFixed(0)}万
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountRanking({ entries }: { entries: LedgerEntry[] }) {
  const ranked = useMemo(() => {
    const map = new Map<string, number>();
    entries.filter(e => e.entryType === "expense")
      .forEach(e => map.set(e.debitAccount, (map.get(e.debitAccount) ?? 0) + e.amount));
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [entries]);
  const total = ranked.reduce((s, [, v]) => s + v, 0);
  if (ranked.length === 0) return null;
  return (
    <div className="space-y-3">
      {ranked.map(([account, amount]) => (
        <div key={account} className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">{account}</span>
            <span className="text-xs font-black text-slate-900">¥{amount.toLocaleString()}</span>
          </div>
          <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${(amount / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const { entries, syncing } = useLedger();
  const year = new Date().getFullYear();

  const yearEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(String(year))), [entries, year]);

  const yearIncome  = useMemo(() => yearEntries.filter(e => e.entryType === "income").reduce((s, e) => s + e.amount, 0), [yearEntries]);
  const yearExpense = useMemo(() => yearEntries.filter(e => e.entryType === "expense").reduce((s, e) => s + e.amount, 0), [yearEntries]);
  const yearProfit  = yearIncome - yearExpense;

  const monthlyData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    yearEntries.forEach(e => {
      const ym  = getYearMonth(e.date);
      const cur = map.get(ym) ?? { income: 0, expense: 0 };
      if (e.entryType === "income")  cur.income  += e.amount;
      if (e.entryType === "expense") cur.expense += e.amount;
      map.set(ym, cur);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([ym, v]) => ({ ym, ...v }));
  }, [yearEntries]);

  const filingDays = daysUntilFiling();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4 pb-24"
    >
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-900">Dashboard</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{year}年 収支サマリー</p>
      </div>

      {/* 確定申告カウントダウン */}
      <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-xl">
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">確定申告まで</p>
            <p className="text-sm font-black text-white">3月15日 締切</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-emerald-400">{filingDays}</p>
          <p className="text-[10px] font-bold text-slate-500">日</p>
        </div>
      </div>

      {/* 収支サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="売上合計" amount={yearIncome}  icon={TrendingUp}   color="bg-blue-500" />
        <SummaryCard label="経費合計" amount={yearExpense} icon={TrendingDown} color="bg-emerald-500" />
      </div>

      {/* 所得 */}
      <div className={`rounded-2xl p-5 ${yearProfit >= 0 ? "bg-slate-50 border border-slate-100" : "bg-red-50 border border-red-100"}`}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className={`w-4 h-4 ${yearProfit >= 0 ? "text-slate-400" : "text-red-400"}`} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">所得（売上 − 経費）</p>
        </div>
        <p className={`text-3xl font-black ${yearProfit >= 0 ? "text-slate-900" : "text-red-500"}`}>
          <span className="text-lg mr-0.5">¥</span>
          {Math.abs(yearProfit).toLocaleString()}
          {yearProfit < 0 && <span className="text-sm ml-1">赤字</span>}
        </p>
      </div>

      {/* 申告書ページへのリンク */}
      <Link
        to="/tax"
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500 text-white active:scale-95 transition-all shadow-lg shadow-emerald-200"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black">青色申告書を作成</p>
            <p className="text-[10px] text-emerald-100 font-bold">{year}年分のCSVを出力できます</p>
          </div>
        </div>
        <span className="text-emerald-200 text-lg font-black">›</span>
      </Link>

      {syncing && (
        <div className="py-10 text-center">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin mx-auto" />
        </div>
      )}

      {!syncing && yearEntries.length === 0 && (
        <div className="py-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <p className="text-sm font-bold text-slate-300">今年のデータがありません</p>
          <p className="text-xs text-slate-200 mt-1">レシートをスキャンするか売上を入力してください</p>
        </div>
      )}

      {monthlyData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
          <h3 className="text-sm font-black text-slate-800 mb-4">月次収支</h3>
          <MonthlyChart data={monthlyData} />
        </div>
      )}

      {yearEntries.some(e => e.entryType === "expense") && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
          <h3 className="text-sm font-black text-slate-800 mb-4">経費 科目別ランキング</h3>
          <AccountRanking entries={yearEntries} />
        </div>
      )}
    </motion.div>
  );
}