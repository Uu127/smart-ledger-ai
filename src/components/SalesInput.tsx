// src/components/SalesInput.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, CheckCircle2, TrendingUp, AlertCircle, X } from "lucide-react";
import { useReceiptParse } from "@/hooks/useReceiptParse";
import { useLedger } from "@/hooks/useLedger";
import type { DebitAccountLabel, CreditAccountLabel } from "@/types/ledger";

const INCOME_DEBIT_ACCOUNTS = ["普通預金", "当座預金", "現金", "売掛金"] as const;
type IncomeDebitAccount = typeof INCOME_DEBIT_ACCOUNTS[number];

export function SalesInput() {
  const navigate = useNavigate();
  const { parse, status, result, error, reset } = useReceiptParse();
  const { addLedgerEntry } = useLedger();
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  const [isDrawerOpen, setIsDrawerOpen]   = useState(false);
  const [date, setDate]                   = useState("");
  const [debitAccount, setDebitAccount]   = useState<IncomeDebitAccount>("普通預金");
  const [amount, setAmount]               = useState("");
  const [description, setDescription]     = useState("");
  const [counterparty, setCounterparty]   = useState("");
  const [submitted, setSubmitted]         = useState(false);

  useEffect(() => {
    if (result && status === "success" && !date) {
      setDate(result.date);
      setAmount(String(result.amount));
      setCounterparty(result.counterparty);
      setDescription(result.suggestedDescription);
    }
  }, [result, status, date]);

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isDrawerOpen]);

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
    e.target.value = "";
  };

  const handleManual = () => {
    reset();
    setDate(""); setAmount(""); setCounterparty(""); setDescription("");
    setSubmitted(false);
    setIsDrawerOpen(true);
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
      entryType:    "income",
      date,
      debitAccount: debitAccount as unknown as DebitAccountLabel,
      creditAccount: "売上高" as unknown as CreditAccountLabel,
      amount:       Number(amount),
      description:  description || "（摘要なし）",
      counterparty: counterparty || "（取引先なし）",
    });

    setTimeout(() => {
      setIsDrawerOpen(false);
      navigate("/dashboard");
    }, 800);
  };

  const loading = status === "loading";

  return (
    <div className="p-4 space-y-6 pb-32">
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">売上・収入を記録</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Sales & Income</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <button type="button"
            onClick={() => { triggerHaptic(); fileInputCameraRef.current?.click(); }}
            className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all active:scale-95"
          >
            <Camera className="w-7 h-7" />
            <span className="text-xs font-bold">請求書を撮る</span>
          </button>
          <button type="button"
            onClick={() => { triggerHaptic(); fileInputGalleryRef.current?.click(); }}
            className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all active:scale-95"
          >
            <ImageIcon className="w-7 h-7" />
            <span className="text-xs font-bold">アルバムから</span>
          </button>
        </div>

        <button type="button" onClick={handleManual}
          className="w-full py-3 rounded-2xl border-2 border-slate-100 text-slate-500 text-sm font-bold hover:bg-slate-50 active:scale-95 transition-all"
        >
          手動で入力する
        </button>

        <input ref={fileInputCameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        <input ref={fileInputGalleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </motion.section>

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
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.12)]"
              style={{ maxHeight: "85dvh" }}
            >
              <div className="flex justify-center pt-3 pb-0 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  {loading
                    ? <><span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-ping" />解析中...</>
                    : "売上情報の入力"}
                </h3>
                <button onClick={closeDrawer} className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 active:scale-90 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="px-6 pt-5 pb-12">
                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium mb-5">
                      <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                    </div>
                  )}

                  {loading ? (
                    <div className="space-y-5 animate-pulse">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-3 bg-slate-200 rounded-full w-16" />
                          <div className="h-12 bg-slate-100 rounded-xl" />
                        </div>
                      ))}
                      <div className="h-14 bg-slate-200 rounded-2xl" />
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="border-b-2 border-slate-100 pb-3 focus-within:border-blue-500 transition-colors">
                        <label className="text-[10px] font-black text-slate-400 uppercase">売上金額 (円)</label>
                        <div className="flex items-center text-4xl font-black text-slate-900 mt-1">
                          <span className="text-slate-300 mr-2 text-2xl">¥</span>
                          <input
                            type="number" inputMode="numeric"
                            value={amount} onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-transparent focus:outline-none placeholder:text-slate-200"
                            placeholder="0" required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">日付</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                          className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">入金先</label>
                        <select value={debitAccount} onChange={(e) => setDebitAccount(e.target.value as IncomeDebitAccount)}
                          className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {INCOME_DEBIT_ACCOUNTS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">取引先・摘要</label>
                        <input type="text" value={counterparty} onChange={(e) => setCounterparty(e.target.value)}
                          placeholder="例: 株式会社〇〇"
                          className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        />
                        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                          placeholder="例: Webサイト制作等"
                          className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button type="submit" disabled={!date || !amount}
                        className={`w-full py-5 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
                          ${(!date || !amount)
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : submitted
                            ? "bg-blue-500 shadow-lg shadow-blue-200"
                            : "bg-slate-900 shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95"
                          }`}
                      >
                        {submitted
                          ? <><CheckCircle2 className="w-6 h-6" /> 記録しました！</>
                          : "売上を記録する"}
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