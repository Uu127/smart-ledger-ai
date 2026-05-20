// src/components/ReceiptInput.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, CheckCircle2, Sparkles, AlertCircle, X, Plus, Package } from "lucide-react";
import { useReceiptParse } from "@/hooks/useReceiptParse";
import { useLedger } from "@/hooks/useLedger";
import { DEBIT_ACCOUNTS_BY_GROUP, CREDIT_ACCOUNTS, DEBIT_ACCOUNT_LABELS } from "@/constants/accounts";
import { FixedAssetForm } from "@/components/FixedAssetForm";
import { DateInput } from "@/components/DateInput";
import type { DebitAccountLabel, CreditAccountLabel } from "@/types/ledger";

export function ReceiptInput() {
  const navigate = useNavigate();
  const { parse, status, result, error, reset } = useReceiptParse();
  const { addLedgerEntry } = useLedger();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [showAsset, setShowAsset] = useState(false);
  const [date, setDate] = useState("");
  const [debitAccount, setDebit] = useState<DebitAccountLabel>("雑費");
  const [creditAccount, setCredit] = useState<CreditAccountLabel>("現金");
  const [amount, setAmount] = useState("");
  const [description, setDesc] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (result && status === "success" && !date) {
      setDate(result.date);
      setAmount(String(result.amount));
      setCounterparty(result.counterparty);
      setDesc(result.suggestedDescription);
      if (DEBIT_ACCOUNT_LABELS.includes(result.suggestedDebitAccount as DebitAccountLabel))
        setDebit(result.suggestedDebitAccount as DebitAccountLabel);
    }
  }, [result, status, date]);

  const haptic = () => navigator?.vibrate?.(40);

  const openDrawer = () => {
    haptic(); reset();
    setDate(""); setAmount(""); setCounterparty(""); setDesc("");
    setSubmitted(false); setShowAsset(false); setIsOpen(true);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { haptic(); reset(); setDate(""); setAmount(""); setCounterparty(""); setDesc(""); setSubmitted(false); setShowAsset(false); setIsOpen(true); await parse(file); }
    e.target.value = "";
  };

  const closeDrawer = () => { setIsOpen(false); setShowAsset(false); setTimeout(reset, 300); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount) return;
    haptic(); setSubmitted(true);
    addLedgerEntry({
      entryType: "expense", date, debitAccount, creditAccount,
      amount: Number(amount),
      description: description || "（摘要なし）",
      counterparty: counterparty || "（取引先なし）",
    });
    setTimeout(() => { setIsOpen(false); navigate("/ledger"); }, 800);
  };

  const loading = status === "loading";
  const isLarge = Number(amount) >= 100000;
  const cardBg = { backgroundColor: "var(--bg-card)", borderColor: "var(--border)" };
  const inputStyle = { backgroundColor: "var(--bg-input)", color: "var(--text-main)" };
  const labelStyle = { color: "var(--text-muted)" };
  const inputClass = "w-full p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400";

  return (
    <div className="p-4 space-y-5 pb-32">

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 border shadow-sm" style={cardBg}>

        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-xl">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-black" style={{ color: "var(--text-main)" }}>経費をスキャン・入力</h2>
            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: "var(--text-muted)" }}>
              レシート・領収書・請求書 対応
            </p>
          </div>
        </div>

        <p className="text-[11px] font-bold mb-5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          レシート・領収書・請求書を撮影するとAIが自動入力します。
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: "カメラで撮影", icon: Camera, ref: cameraRef, capture: "environment" as const },
            { label: "アルバムから", icon: ImageIcon, ref: galleryRef, capture: undefined },
          ].map(({ label, icon: Icon, ref, }) => (
            <button key={label} type="button"
              onClick={() => { haptic(); ref.current?.click(); }}
              className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed transition-all active:scale-95 hover:border-emerald-400 hover:text-emerald-600"
              style={{ borderColor: "var(--border)", color: "var(--text-sub)", backgroundColor: "var(--bg-muted)" }}>
              <Icon className="w-6 h-6" />
              <span className="text-xs font-bold">{label}</span>
            </button>
          ))}
        </div>

        <button type="button" onClick={openDrawer}
          className="w-full py-3 rounded-2xl border-2 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ borderColor: "var(--border)", color: "var(--text-sub)", backgroundColor: "var(--bg-muted)" }}>
          <Plus className="w-4 h-4" /> 手動で入力する
        </button>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </motion.section>

      {/* ドロワー */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />

            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[2rem] shadow-2xl"
              style={{ maxHeight: "88dvh", backgroundColor: "var(--bg-card)" }}>

              <div className="flex justify-center pt-3 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--border)" }} />
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                style={{ borderColor: "var(--border)" }}>
                <h3 className="font-black flex items-center gap-2" style={{ color: "var(--text-main)" }}>
                  {loading
                    ? <><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />解析中...</>
                    : showAsset ? "固定資産として登録" : "経費の内容を確認"
                  }
                </h3>
                <button onClick={closeDrawer}
                  className="p-2 rounded-full transition-all active:scale-90"
                  style={{ backgroundColor: "var(--bg-input)", color: "var(--text-muted)" }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="px-6 pt-5 pb-12">

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-bold mb-4">
                      <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                    </div>
                  )}

                  {loading ? (
                    <div className="space-y-4 animate-pulse">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-3 rounded-full w-16" style={{ backgroundColor: "var(--border)" }} />
                          <div className="h-12 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }} />
                        </div>
                      ))}
                    </div>

                  ) : showAsset ? (
                    <FixedAssetForm
                      initialName={counterparty} initialCost={amount} initialDate={date}
                      compact={true}
                      onSaved={() => { setShowAsset(false); setIsOpen(false); navigate("/depreciation"); }}
                      onCancel={() => setShowAsset(false)}
                    />

                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">

                      {/* 金額 */}
                      <div className="border-b-2 pb-3 focus-within:border-emerald-500 transition-colors"
                        style={{ borderColor: "var(--border)" }}>
                        <label className="text-[10px] font-black uppercase" style={labelStyle}>金額（円）</label>
                        <div className="flex items-center text-4xl font-black mt-1" style={{ color: "var(--text-main)" }}>
                          <span className="mr-2 text-2xl" style={{ color: "var(--text-muted)" }}>¥</span>
                          <input type="number" inputMode="numeric"
                            value={amount || ""} placeholder="0"
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-transparent focus:outline-none placeholder:text-slate-300" required />
                        </div>
                      </div>

                      {/* 固定資産バナー */}
                      {isLarge && !submitted && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
                          <Package className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-black text-orange-700">10万円以上は固定資産の可能性があります</p>
                            <p className="text-[10px] font-bold text-orange-500 mt-0.5">パソコン・車・設備等は減価償却で経費計上できます</p>
                            <button type="button" onClick={() => setShowAsset(true)}
                              className="mt-2 text-[10px] font-black text-white bg-orange-500 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                              固定資産として登録する →
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* 日付 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase" style={labelStyle}>日付</label>
                        <DateInput value={date} onChange={setDate} required
                          className="w-full focus-within:ring-2 focus-within:ring-emerald-400" />
                      </div>

                      {/* 借方科目 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase" style={labelStyle}>借方勘定科目</label>
                        <select value={debitAccount} onChange={e => setDebit(e.target.value as DebitAccountLabel)}
                          className={inputClass} style={inputStyle}>
                          {Object.entries(DEBIT_ACCOUNTS_BY_GROUP).map(([group, labels]) => (
                            <optgroup key={group} label={group}>
                              {labels.map(l => <option key={l} value={l}>{l}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* 貸方科目 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase" style={labelStyle}>支払方法（貸方）</label>
                        <select value={creditAccount} onChange={e => setCredit(e.target.value as CreditAccountLabel)}
                          className={inputClass} style={inputStyle}>
                          {CREDIT_ACCOUNTS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      {/* 取引先・摘要 */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase" style={labelStyle}>店名 / 取引先</label>
                        <input type="text" value={counterparty} onChange={e => setCounterparty(e.target.value)}
                          placeholder="例: 〇〇ストア" className={inputClass} style={inputStyle} />
                        <input type="text" value={description} onChange={e => setDesc(e.target.value)}
                          placeholder="例: 事務用品" className={inputClass} style={inputStyle} />
                      </div>

                      <button type="submit" disabled={!date || !amount}
                        className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2
                          ${(!date || !amount)
                            ? "opacity-30 cursor-not-allowed"
                            : submitted
                              ? "bg-emerald-500"
                              : "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 active:scale-95"
                          }`}
                        style={(!date || !amount) ? { backgroundColor: "var(--bg-input)", color: "var(--text-muted)" } : {}}>
                        {submitted
                          ? <><CheckCircle2 className="w-6 h-6" /> 記録しました！</>
                          : "台帳に記録する"
                        }
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}