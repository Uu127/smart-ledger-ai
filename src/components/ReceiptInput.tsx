// src/components/ReceiptInput.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, CheckCircle2, Sparkles, AlertCircle, X } from "lucide-react";
import { useReceiptParse } from "@/hooks/useReceiptParse";
import { useLedger } from "@/hooks/useLedger";
import { DEBIT_ACCOUNTS_BY_GROUP, CREDIT_ACCOUNTS, DEBIT_ACCOUNT_LABELS } from "@/constants/accounts";
import type { DebitAccountLabel, CreditAccountLabel } from "@/types/ledger";

export function ReceiptInput() {
  const navigate = useNavigate();
  const { parse, status, result, error, reset } = useReceiptParse();
  const { addLedgerEntry } = useLedger();
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [date, setDate] = useState("");
  const [debitAccount, setDebitAccount] = useState<DebitAccountLabel>("雑費");
  const [creditAccount, setCreditAccount] = useState<CreditAccountLabel>("現金");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // 解析成功時にデータをフォームにセット
  useEffect(() => {
    if (result && status === "success" && !date) {
      setDate(result.date);
      setAmount(String(result.amount));
      setCounterparty(result.counterparty);
      setDescription(result.suggestedDescription);
      if (DEBIT_ACCOUNT_LABELS.includes(result.suggestedDebitAccount as DebitAccountLabel)) {
        setDebitAccount(result.suggestedDebitAccount as DebitAccountLabel);
      }
    }
  }, [result, status, date]);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic();
      reset();
      setDate(""); setAmount(""); setCounterparty(""); setDescription("");
      setSubmitted(false);
      setIsDrawerOpen(true);
      await parse(file);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(reset, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount) return;

    triggerHaptic();
    setSubmitted(true);

    addLedgerEntry({
      date,
      debitAccount,
      creditAccount,
      amount: Number(amount),
      description: description || "（摘要なし）",
      counterparty: counterparty || "（取引先なし）",
    });

    setTimeout(() => {
      setIsDrawerOpen(false);
      navigate("/ledger");
    }, 800);
  };

  const loading = status === "loading";

  return (
    <div className="p-4 space-y-6 pb-32">
      {/* スキャンボタン */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">レシートをスキャン</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">AI Auto Capture</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => { triggerHaptic(); fileInputCameraRef.current?.click(); }}
            className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95"
          >
            <Camera className="w-8 h-8" />
            <span className="text-xs font-bold">カメラで撮る</span>
          </button>
          <button
            type="button"
            onClick={() => { triggerHaptic(); fileInputGalleryRef.current?.click(); }}
            className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95"
          >
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs font-bold">アルバムから</span>
          </button>
        </div>

        <input ref={fileInputCameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        <input ref={fileInputGalleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </motion.section>

      {/* ドロワー */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] h-[90vh] flex flex-col"
            >
              {/* ドロワーヘッダー */}
              <div className="flex items-center justify-between p-6 border-b border-slate-50 shrink-0">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  {loading ? <span className="animate-pulse">解析中...</span> : "解析結果の確認"}
                </h3>
                <button onClick={closeDrawer} className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 active:scale-90 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ドロワー中身 */}
              <div className="p-6 overflow-y-auto flex-1">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium mb-4">
                    <AlertCircle className="w-5 h-5 min-w-[20px]" /> {error}
                  </div>
                )}

                {loading ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded-full w-16" />
                      <div className="h-12 bg-slate-100 rounded-xl w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><div className="h-3 bg-slate-200 rounded-full w-12" /><div className="h-12 bg-slate-100 rounded-xl w-full" /></div>
                      <div className="space-y-2"><div className="h-3 bg-slate-200 rounded-full w-12" /><div className="h-12 bg-slate-100 rounded-xl w-full" /></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded-full w-20" />
                      <div className="h-12 bg-slate-100 rounded-xl w-full mb-2" />
                      <div className="h-12 bg-slate-100 rounded-xl w-full" />
                    </div>
                    <div className="h-16 bg-slate-200 rounded-2xl w-full mt-8" />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* 金額 */}
                    <div className="relative border-b-2 border-slate-100 pb-2 focus-within:border-emerald-500 transition-colors">
                      <label className="text-[10px] font-black text-slate-400 uppercase">金額 (円)</label>
                      <div className="flex items-center text-4xl font-black text-slate-900">
                        <span className="text-slate-300 mr-2 text-2xl">¥</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-transparent focus:outline-none placeholder:text-slate-100"
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>

                    {/* 日付 */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">日付</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* 借方勘定科目（グループ付き） */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">借方勘定科目</label>
                      <select
                        value={debitAccount}
                        onChange={(e) => setDebitAccount(e.target.value as DebitAccountLabel)}
                        className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {Object.entries(DEBIT_ACCOUNTS_BY_GROUP).map(([group, labels]) => (
                          <optgroup key={group} label={group}>
                            {labels.map(label => (
                              <option key={label} value={label}>{label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {/* 貸方勘定科目（支払方法） */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">支払方法（貸方）</label>
                      <select
                        value={creditAccount}
                        onChange={(e) => setCreditAccount(e.target.value as CreditAccountLabel)}
                        className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {CREDIT_ACCOUNTS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* 店名・摘要 */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">店名・摘要</label>
                      <input
                        type="text"
                        value={counterparty}
                        onChange={(e) => setCounterparty(e.target.value)}
                        placeholder="例: 〇〇ストア"
                        className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                      />
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="例: ボールペン等"
                        className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* 保存ボタン */}
                    <button
                      type="submit"
                      disabled={!date || !amount}
                      className={`w-full py-5 mt-2 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
                        ${(!date || !amount)
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : submitted
                          ? "bg-emerald-500 shadow-lg shadow-emerald-200"
                          : "bg-slate-900 shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95"
                        }`}
                    >
                      {submitted
                        ? <><CheckCircle2 className="w-6 h-6" /> 記録しました！</>
                        : "台帳に記録する"
                      }
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}