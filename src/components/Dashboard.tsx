// src/components/Dashboard.tsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Calendar, FileText, BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useLedger } from "@/hooks/useLedger";

// ── ユーティリティ ─────────────────────────────────────────
function daysUntilFiling() {
  const now  = new Date();
  const year = now.getMonth() >= 2 ? now.getFullYear() + 1 : now.getFullYear();
  const diff = Math.ceil((new Date(year, 2, 15).getTime() - now.getTime()) / 86400000);
  return Math.max(diff, 0);
}

const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

// ── カスタムTooltip ────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 shadow-lg border text-xs font-bold"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-main)" }}>
      <p className="font-black mb-1" style={{ color: "var(--text-sub)" }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ¥{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ── サマリーカード ─────────────────────────────────────────
function SummaryCard({ label, amount, icon: Icon, color, sub }: {
  label: string; amount: number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className={`${color} rounded-2xl p-4 text-white`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 opacity-80" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
      </div>
      <p className="text-2xl font-black">
        <span className="text-sm mr-0.5">¥</span>{amount.toLocaleString()}
      </p>
      {sub && <p className="text-[10px] opacity-70 font-bold mt-0.5">{sub}</p>}
    </div>
  );
}

// ── メイン ────────────────────────────────────────────────
export function Dashboard() {
  const { entries, syncing } = useLedger();
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(currentYear);
  const [chartTab, setChartTab] = useState<"bar" | "line" | "yoy">("bar");

  // 年度別集計
  const calcYear = (year: number) => {
    const ys = entries.filter(e => e.date.startsWith(String(year)));
    const income  = ys.filter(e => e.entryType === "income").reduce((s, e) => s + e.amount, 0);
    const expense = ys.filter(e => e.entryType === "expense").reduce((s, e) => s + e.amount, 0);
    return { income, expense, profit: income - expense };
  };

  const thisYear = useMemo(() => calcYear(viewYear), [entries, viewYear]);
  const lastYear = useMemo(() => calcYear(viewYear - 1), [entries, viewYear]);

  // 月次データ（棒グラフ・折れ線用）
  const monthlyData = useMemo(() => {
    return MONTHS.map((label, i) => {
      const m = String(i + 1).padStart(2, "0");
      const prefix = `${viewYear}-${m}`;
      const thisIncome  = entries.filter(e => e.date.startsWith(prefix) && e.entryType === "income").reduce((s, e) => s + e.amount, 0);
      const thisExpense = entries.filter(e => e.date.startsWith(prefix) && e.entryType === "expense").reduce((s, e) => s + e.amount, 0);

      const prevPrefix = `${viewYear - 1}-${m}`;
      const prevIncome  = entries.filter(e => e.date.startsWith(prevPrefix) && e.entryType === "income").reduce((s, e) => s + e.amount, 0);
      const prevExpense = entries.filter(e => e.date.startsWith(prevPrefix) && e.entryType === "expense").reduce((s, e) => s + e.amount, 0);

      return {
        label,
        収入: thisIncome,
        経費: thisExpense,
        所得: thisIncome - thisExpense,
        前年収入: prevIncome,
        前年経費: prevExpense,
      };
    });
  }, [entries, viewYear]);

  // 科目別ランキング
  const accountRanking = useMemo(() => {
    const map = new Map<string, number>();
    entries
      .filter(e => e.date.startsWith(String(viewYear)) && e.entryType === "expense")
      .forEach(e => map.set(e.debitAccount, (map.get(e.debitAccount) ?? 0) + e.amount));
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [entries, viewYear]);

  const totalExpenseForRanking = accountRanking.reduce((s, [, v]) => s + v, 0);

  // 前年比
  const yoyIncome  = lastYear.income  > 0 ? ((thisYear.income  - lastYear.income)  / lastYear.income  * 100).toFixed(1) : null;
  const yoyExpense = lastYear.expense > 0 ? ((thisYear.expense - lastYear.expense) / lastYear.expense * 100).toFixed(1) : null;

  const availableYears = useMemo(() => {
    const years = new Set(entries.map(e => Number(e.date.slice(0, 4))));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [entries, currentYear]);

  const cardStyle = { backgroundColor: "var(--bg-card)", borderColor: "var(--border)" };
  const axisStyle = { fill: "var(--text-muted)", fontSize: 10 };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4 pb-24">

      {/* ヘッダー */}
      <div className="px-2 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--text-main)" }}>集計</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Dashboard</p>
        </div>
        {/* 年度選択 */}
        <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))}
          className="px-3 py-2 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-400"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-main)", border: "1px solid" }}>
          {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
      </div>

      {/* 確定申告カウントダウン */}
      <div className="rounded-2xl p-4 flex items-center justify-between"
        style={{ backgroundColor: "#0f172a" }}>
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
          <p className="text-3xl font-black text-emerald-400">{daysUntilFiling()}</p>
          <p className="text-[10px] font-bold text-slate-500">日</p>
        </div>
      </div>

      {/* 収支サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="売上合計" amount={thisYear.income}  icon={TrendingUp}   color="bg-blue-500"
          sub={yoyIncome ? `前年比 ${Number(yoyIncome) >= 0 ? "+" : ""}${yoyIncome}%` : undefined} />
        <SummaryCard label="経費合計" amount={thisYear.expense} icon={TrendingDown} color="bg-emerald-500"
          sub={yoyExpense ? `前年比 ${Number(yoyExpense) >= 0 ? "+" : ""}${yoyExpense}%` : undefined} />
      </div>

      {/* 所得 */}
      <div className={`rounded-2xl p-5 border ${thisYear.profit >= 0 ? "" : "border-red-200"}`}
        style={thisYear.profit >= 0 ? cardStyle : { backgroundColor: "var(--bg-card)", borderColor: "#fecaca" }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-emerald-500" />
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>所得（売上 − 経費）</p>
        </div>
        <p className={`text-3xl font-black ${thisYear.profit >= 0 ? "" : "text-red-500"}`}
          style={thisYear.profit >= 0 ? { color: "var(--text-main)" } : {}}>
          <span className="text-lg mr-0.5">¥</span>
          {Math.abs(thisYear.profit).toLocaleString()}
          {thisYear.profit < 0 && <span className="text-sm ml-1">赤字</span>}
        </p>
      </div>

      {/* グラフタブ */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={cardStyle}>
        {/* タブ切り替え */}
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          {([
            { key: "bar",  label: "月次収支" },
            { key: "line", label: "推移" },
            { key: "yoy",  label: "前年比較" },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setChartTab(key)}
              className="flex-1 py-3 text-xs font-black transition-all"
              style={{
                color: chartTab === key ? "var(--accent)" : "var(--text-muted)",
                borderBottom: chartTab === key ? "2px solid var(--accent)" : "2px solid transparent",
                backgroundColor: "transparent",
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* 月次収支棒グラフ */}
          {chartTab === "bar" && (
            <div>
              <p className="text-xs font-black mb-3" style={{ color: "var(--text-sub)" }}>
                {viewYear}年 月次収支
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barSize={8} barGap={2}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 10000 ? `${(v/10000).toFixed(0)}万` : String(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="収入"  fill="#3b82f6" radius={[3,3,0,0]} />
                  <Bar dataKey="経費"  fill="#10b981" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 収支推移折れ線グラフ */}
          {chartTab === "line" && (
            <div>
              <p className="text-xs font-black mb-3" style={{ color: "var(--text-sub)" }}>
                {viewYear}年 収支推移（月次累計）
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={monthlyData.map((d, i) => {
                    const slice = monthlyData.slice(0, i + 1);
                    return {
                      label: d.label,
                      累計収入: slice.reduce((s, m) => s + m.収入, 0),
                      累計経費: slice.reduce((s, m) => s + m.経費, 0),
                      累計所得: slice.reduce((s, m) => s + m.所得, 0),
                    };
                  })}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 10000 ? `${(v/10000).toFixed(0)}万` : String(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Line type="monotone" dataKey="累計収入" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="累計経費" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="累計所得" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 前年比較グラフ */}
          {chartTab === "yoy" && (
            <div>
              <p className="text-xs font-black mb-1" style={{ color: "var(--text-sub)" }}>
                {viewYear - 1}年 vs {viewYear}年 月次比較
              </p>
              <div className="flex gap-3 mb-3">
                {[
                  { label: `${viewYear-1}年 売上`, value: lastYear.income,  color: "text-slate-400" },
                  { label: `${viewYear}年 売上`,   value: thisYear.income,  color: "text-blue-500"  },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className={`text-[9px] font-black ${color}`}>{label}</p>
                    <p className={`text-xs font-black ${color}`}>¥{value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barSize={6} barGap={1}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 10000 ? `${(v/10000).toFixed(0)}万` : String(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="前年収入" fill="#94a3b8" radius={[3,3,0,0]} />
                  <Bar dataKey="収入"     fill="#3b82f6" radius={[3,3,0,0]} />
                  <Bar dataKey="前年経費" fill="#6ee7b7" radius={[3,3,0,0]} />
                  <Bar dataKey="経費"     fill="#10b981" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              {lastYear.income === 0 && lastYear.expense === 0 && (
                <p className="text-center text-xs font-bold mt-2" style={{ color: "var(--text-muted)" }}>
                  {viewYear - 1}年のデータがありません
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 経費科目別ランキング */}
      {accountRanking.length > 0 && (
        <div className="rounded-2xl p-5 border shadow-sm" style={cardStyle}>
          <h3 className="text-sm font-black mb-4" style={{ color: "var(--text-main)" }}>
            経費 科目別ランキング
          </h3>
          <div className="space-y-3">
            {accountRanking.map(([account, amount], i) => (
              <div key={account} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black w-4" style={{ color: "var(--text-muted)" }}>
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold" style={{ color: "var(--text-main)" }}>{account}</span>
                  </div>
                  <span className="text-xs font-black" style={{ color: "var(--text-main)" }}>
                    ¥{amount.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-full h-1.5 overflow-hidden ml-6" style={{ backgroundColor: "var(--bg-input)" }}>
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${totalExpenseForRanking > 0 ? (amount / totalExpenseForRanking * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 申告書リンク */}
      <Link to="/tax"
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500 text-white active:scale-95 transition-all shadow-lg shadow-emerald-200/50">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl"><FileText className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-black">申告書データを確認・出力</p>
            <p className="text-[10px] text-emerald-100 font-bold">集計データの確認・CSV出力補助</p>
          </div>
        </div>
        <span className="text-emerald-200 text-lg font-black">›</span>
      </Link>

      {syncing && (
        <div className="py-8 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
        </div>
      )}

      {!syncing && entries.length === 0 && (
        <div className="py-16 text-center rounded-[2rem] border-2 border-dashed" style={{ borderColor: "var(--border)" }}>
          <BarChart2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>データがありません</p>
        </div>
      )}
    </motion.div>
  );
}