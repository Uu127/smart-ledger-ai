// src/components/LedgerList.tsx
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronDown, ChevronRight, Pencil, X, CheckCircle2, TableProperties, Package, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useLedger } from "@/hooks/useLedger";
import { useDepreciation, calcDepreciation, type FixedAsset } from "@/hooks/useDepreciation";
import { FixedAssetForm } from "@/components/FixedAssetForm";
import { DEBIT_ACCOUNTS_BY_GROUP, CREDIT_ACCOUNTS } from "@/constants/accounts";
import type { LedgerEntry, DebitAccountLabel, CreditAccountLabel } from "@/types/ledger";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SheetsDrawer } from "@/components/SheetsDrawer";
import { DateInput } from "@/components/DateInput";

// ── CSV出力 ───────────────────────────────────────────────
function escapeCsv(s: string) { return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function downloadCsv(entries: LedgerEntry[]) {
  const header = "日付,種別,借方勘定科目,貸方勘定科目,金額,摘要,取引先";
  const body   = entries.sort((a, b) => a.date.localeCompare(b.date))
    .map(e => [
      e.date,
      e.entryType === "income" ? "収入" : "経費",
      escapeCsv(e.debitAccount),
      escapeCsv(e.creditAccount),
      e.amount,
      escapeCsv(e.description),
      escapeCsv(e.counterparty),
    ].join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `SmartLedger_仕訳明細.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── 編集ドロワー ──────────────────────────────────────────
function EditDrawer({ entry, onClose }: { entry: LedgerEntry; onClose: () => void }) {
  const { updateLedgerEntry, deleteLedgerEntry } = useLedger();
  const [date, setDate]             = useState(entry.date);
  const [debitAccount, setDebitAccount] = useState<DebitAccountLabel>(entry.debitAccount as DebitAccountLabel);
  const [creditAccount, setCreditAccount] = useState<CreditAccountLabel>(entry.creditAccount as CreditAccountLabel);
  const [amount, setAmount]         = useState(String(entry.amount));
  const [description, setDescription] = useState(entry.description);
  const [counterparty, setCounterparty] = useState(entry.counterparty);
  const [saved, setSaved]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateLedgerEntry(entry.id, {
      date,
      debitAccount,
      creditAccount,
      amount: Number(amount),
      description,
      counterparty,
    });
    setSaved(true);
    setTimeout(onClose, 800);
  };

  const handleDelete = () => setShowConfirm(true);
  const handleDeleteConfirm = async () => {
    await deleteLedgerEntry(entry.id);
    onClose();
  };

  const inputClass = "w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase";

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.12)]"
        style={{ maxHeight: "88dvh" }}>

        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-black text-slate-800">仕訳を編集</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-400 rounded-full active:scale-90 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <form onSubmit={handleSave} className="px-6 pt-5 pb-12 space-y-5">

            {/* 金額 */}
            <div className="border-b-2 border-slate-100 pb-3 focus-within:border-emerald-500 transition-colors">
              <label className={labelClass}>金額（円）</label>
              <div className="flex items-center text-4xl font-black text-slate-900 mt-1">
                <span className="text-slate-300 mr-2 text-2xl">¥</span>
                <input type="number" inputMode="numeric"
                  value={amount || ""} placeholder="0"
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-transparent focus:outline-none" required />
              </div>
            </div>

            {/* 日付 */}
            <div className="space-y-1">
              <label className={labelClass}>日付</label>
              <DateInput value={date} onChange={setDate} required
                className="w-full focus-within:ring-2 focus-within:ring-emerald-400" />
            </div>

            {/* 借方科目 */}
            <div className="space-y-1">
              <label className={labelClass}>借方勘定科目</label>
              <select value={debitAccount} onChange={e => setDebitAccount(e.target.value as DebitAccountLabel)}
                className={inputClass}>
                {Object.entries(DEBIT_ACCOUNTS_BY_GROUP).map(([group, labels]) => (
                  <optgroup key={group} label={group}>
                    {labels.map(label => <option key={label} value={label}>{label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* 貸方科目 */}
            <div className="space-y-1">
              <label className={labelClass}>支払方法（貸方）</label>
              <select value={creditAccount} onChange={e => setCreditAccount(e.target.value as CreditAccountLabel)}
                className={inputClass}>
                {CREDIT_ACCOUNTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* 取引先・摘要 */}
            <div className="space-y-1">
              <label className={labelClass}>店名 / 取引先</label>
              <input type="text" value={counterparty} onChange={e => setCounterparty(e.target.value)}
                placeholder="例: 〇〇ストア" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>摘要</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="例: 事務用品購入" className={inputClass} />
            </div>

            {/* ボタン */}
            <div className="flex gap-3">
              <button type="button" onClick={handleDelete}
                className="flex-1 py-4 rounded-2xl font-black text-red-500 bg-red-50 hover:bg-red-100 active:scale-95 transition-all">
                削除
              </button>
              <button type="submit"
                className={`flex-2 flex-1 py-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2
                  ${saved
                    ? "bg-green-500 shadow-lg shadow-green-200"
                    : "bg-slate-900 shadow-xl shadow-slate-200 active:scale-95"
                  }`}>
                {saved ? <><CheckCircle2 className="w-5 h-5" /> 保存しました！</> : "保存する"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="仕訳を削除しますか？"
        message="この操作は元に戻せません"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </AnimatePresence>
  );
}

// ── メインコンポーネント ───────────────────────────────────
const METHOD_SHORT: Record<string, string> = { straight: "定額法", declining: "定率法", lump: "一括償却" };

export function LedgerList() {
  const { entries, syncing } = useLedger();
  const { assets }           = useDepreciation();
  const [openMonths, setOpenMonths]     = useState<Set<string>>(new Set());
  const [editEntry, setEditEntry]       = useState<LedgerEntry | null>(null);
  const [editAsset, setEditAsset]       = useState<FixedAsset | null>(null);
  const [showSheets, setShowSheets]     = useState(false);

  const currentYear = new Date().getFullYear();

  const yearEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(String(currentYear))), [entries, currentYear]);

  const yearIncome  = useMemo(() => yearEntries.filter(e => e.entryType === "income").reduce((s, e) => s + e.amount, 0), [yearEntries]);
  const yearExpense = useMemo(() => yearEntries.filter(e => e.entryType === "expense").reduce((s, e) => s + e.amount, 0), [yearEntries]);

  const monthGroups = useMemo(() => {
    const map = new Map<string, LedgerEntry[]>();
    entries.forEach(e => {
      const ym = e.date.slice(0, 7);
      map.set(ym, [...(map.get(ym) ?? []), e]);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([ym, list]) => ({
        ym,
        label: `${Number(ym.slice(5, 7))}月`,
        year:  ym.slice(0, 4),
        income:  list.filter(e => e.entryType === "income").reduce((s, e) => s + e.amount, 0),
        expense: list.filter(e => e.entryType === "expense").reduce((s, e) => s + e.amount, 0),
        entries: list.sort((a, b) => b.date.localeCompare(a.date)),
      }));
  }, [entries]);

  const toggleMonth = (ym: string) => {
    setOpenMonths(prev => {
      const next = new Set(prev);
      next.has(ym) ? next.delete(ym) : next.add(ym);
      return next;
    });
  };

  return (
    <div className="p-4 space-y-4 pb-24">

      {/* 仕訳編集ドロワー */}
      {editEntry && <EditDrawer entry={editEntry} onClose={() => setEditEntry(null)} />}

      {/* 固定資産編集ドロワー */}
      <AnimatePresence>
        {editAsset && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditAsset(null)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.12)]"
              style={{ maxHeight: "92dvh", backgroundColor: "var(--bg-card)" }}>
              <div className="flex justify-center pt-3 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--border)" }} />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                style={{ borderColor: "var(--border)" }}>
                <h3 className="font-black" style={{ color: "var(--text-main)" }}>固定資産を編集</h3>
                <button onClick={() => setEditAsset(null)}
                  className="p-2 rounded-full active:scale-90 transition-all"
                  style={{ backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="px-6 pt-5 pb-12">
                  <FixedAssetForm
                    asset={editAsset}
                    onSaved={() => setEditAsset(null)}
                    onCancel={() => setEditAsset(null)}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 年間サマリー */}
      <div className="bg-emerald-500 rounded-2xl p-5 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 mb-3">
          {currentYear}年 収支記録 — 全{entries.length}件
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">収入</p>
            <p className="text-lg font-black">
              <span className="text-xs mr-0.5">¥</span>
              {yearIncome.toLocaleString()}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">経費</p>
            <p className="text-lg font-black">
              <span className="text-xs mr-0.5">¥</span>
              {yearExpense.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* エクスポートボタン */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => downloadCsv(entries)}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => setShowSheets(true)}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-sm shadow-emerald-200">
            <TableProperties className="w-4 h-4" /> Sheets
          </button>
          <Link to="/general-ledger"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 active:scale-95 transition-all shadow-sm shadow-indigo-200">
            <BookOpen className="w-4 h-4" /> 元帳
          </Link>
        </div>
      )}

      <SheetsDrawer isOpen={showSheets} onClose={() => setShowSheets(false)} entries={entries} />

      {syncing && (
        <div className="py-8 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
        </div>
      )}

      {!syncing && entries.length === 0 && (
        <div className="py-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <p className="text-sm font-bold text-slate-300">まだ記録がありません</p>
        </div>
      )}

      {/* 固定資産一覧 */}
      {assets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
                固定資産 — {assets.length}件
              </h3>
            </div>
            <Link to="/depreciation"
              className="text-[10px] font-black"
              style={{ color: "var(--text-muted)" }}>
              管理・詳細 →
            </Link>
          </div>
          <div className="rounded-2xl border shadow-sm overflow-hidden"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
            {assets.map((asset, i) => {
              const dep = calcDepreciation(asset, currentYear);
              return (
                <div key={asset.id}
                  className={`flex items-center justify-between px-4 py-3${i > 0 ? " border-t" : ""}`}
                  style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate" style={{ color: "var(--text-main)" }}>
                        {asset.name}
                      </p>
                      <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                        {asset.acquisitionDate} | 耐用{asset.usefulLife}年 | {METHOD_SHORT[asset.method] ?? asset.method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <p className="text-sm font-black text-orange-500">
                        ¥{asset.acquisitionCost.toLocaleString()}
                      </p>
                      {dep > 0 ? (
                        <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                          今年 −¥{dep.toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>償却完了</p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditAsset(asset)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-orange-500 hover:bg-orange-50 active:scale-90 transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 月別アコーディオン */}
      <div className="space-y-3">
        {monthGroups.map(({ ym, label, year, income, expense, entries: monthEntries }) => {
          const isOpen = openMonths.has(ym);
          return (
            <div key={ym} className="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
              {/* 月ヘッダー */}
              <button type="button" onClick={() => toggleMonth(ym)}
                className="w-full flex items-center justify-between p-4 text-left active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-slate-400" />
                    : <ChevronRight className="w-4 h-4 text-slate-400" />
                  }
                  <div>
                    <p className="text-sm font-black text-slate-800">{year}年{label}</p>
                    <p className="text-[10px] font-bold text-slate-400">{monthEntries.length}件</p>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  {income > 0  && <p className="text-xs font-black text-blue-500">収入 ¥{income.toLocaleString()}</p>}
                  {expense > 0 && <p className="text-xs font-black text-emerald-500">経費 ¥{expense.toLocaleString()}</p>}
                </div>
              </button>

              {/* 仕訳リスト */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="border-t border-slate-50 divide-y divide-slate-50">
                      {monthEntries.map(entry => (
                        <div key={entry.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                entry.entryType === "income"
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-emerald-100 text-emerald-600"
                              }`}>
                                {entry.entryType === "income" ? "収入" : "経費"}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">{entry.date}</span>
                              <span className="text-[10px] font-bold text-slate-400">{entry.debitAccount}</span>
                            </div>
                            <p className="text-sm font-black text-slate-800 truncate">
                              {entry.counterparty && entry.counterparty !== "（取引先なし）" ? entry.counterparty : entry.description}
                            </p>
                            {entry.description && entry.description !== "（摘要なし）" && entry.counterparty !== "（取引先なし）" && (
                              <p className="text-[10px] font-bold text-slate-400 truncate">{entry.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className={`text-sm font-black ${
                              entry.entryType === "income" ? "text-blue-600" : "text-slate-800"
                            }`}>
                              ¥{entry.amount.toLocaleString()}
                            </span>
                            <button
                              onClick={() => setEditEntry(entry)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 active:scale-90 transition-all">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}