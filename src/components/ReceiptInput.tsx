// src/components/ReceiptInput.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Image as ImageIcon, CheckCircle2,
  Sparkles, AlertCircle, X, Plus
} from "lucide-react";
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
  const [date, setDate]                 = useState("");
  const [debitAccount, setDebitAccount] = useState<DebitAccountLabel>("雑費");
  const [creditAccount, setCreditAccount] = useState<CreditAccountLabel>("現金");
  const [amount, setAmount]             = useState("");
  const [description, setDescription]   = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [submitted, setSubmitted]       = useState(false);

  // ドロワーが開いている間はbodyスクロール禁止
  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isDrawerOpen]);

  // 解析成功時にフォームへセット
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
    e.target.value = "";
  };

  // 手動入力モードで開く
  const handleManual = () => {
    triggerHaptic();
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
      entryType: "expense",
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

      {/* スキャン・手動入力カード */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">経費をスキャン・入力</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              レシート・領収書・請求書 対応
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 font-bold mb-5 leading-relaxed">
          レシート・領収書・請求書などを撮影すると、AIが金額・日付・科目を自動入力します。
        </p>

        {/* スキャンボタン */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            type="button"
            onClick={() => { triggerHaptic(); fileInputCameraRef.current?.click(); }}
            className="flex flex-col items-center justify-center gap-3 py-9 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95"
          >
            <Camera className="w-7 h-7" />
            <span className="text-xs font-bold">カメラで撮影</span>
          </button>
          <button
            type="button"
            onClick={() => { triggerHaptic(); fileInputGalleryRef.current?.click(); }}
            className="flex flex-col items-center justify-center gap-3 py-9 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95"
          >
            <ImageIcon className="w-7 h-7" />
            <span className="text-xs font-bold">アルバムから</span>
          </button>
        </div>

        {/* 手動入力ボタン */}
        <button
          type="button"
          onClick={handleManual}
          className="w-full py-3 rounded-2xl border-2 border-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> 手動で入力する
        </button>

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
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.12)]"
              style={{ maxHeight: "85dvh" }}
            >
              {/* グラブバー */}
              <div className="flex justify-center pt-3 pb-0 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              {/* ヘッダー */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  {loading
                    ? <><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />解析中...</>
                    : "経費の内容を確認"
                  }
                </h3>
                <button onClick={closeDrawer} className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 active:scale-90 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* スクロールエリア */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="px-6 pt-5 pb-12">

                  {/* エラー */}
                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium mb-5">
                      <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                    </div>
                  )}

                  {/* スケルトン */}
                  {loading ? (
                    <div className="space-y-5 animate-pulse">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-3 bg-slate-200 rounded-full w-16" />
                          <div className="h-12 bg-slate-100 rounded-xl" />
                        </div>
                      ))}
                      <div className="h-14 bg-slate-200 rounded-2xl" />
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">

                      {/* 金額 */}
                      <div className="border-b-2 border-slate-100 pb-3 focus-within:border-emerald-500 transition-colors">
                        <label className="text-[10px] font-black text-slate-400 uppercase">金額 (円)</label>
                        <div className="flex items-center text-4xl font-black text-slate-900 mt-1">
                          <span className="text-slate-300 mr-2 text-2xl">¥</span>
                          <input
                            type="number" inputMode="numeric" value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-transparent focus:outline-none placeholder:text-slate-200"
                            placeholder="0" required
                          />
                        </div>
                      </div>

                      {/* 日付 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">日付</label>
                        <input
                          type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                          className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* 借方勘定科目 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">借方勘定科目</label>
                        <select
                          value={debitAccount} onChange={(e) => setDebitAccount(e.target.value as DebitAccountLabel)}
                          className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {Object.entries(DEBIT_ACCOUNTS_BY_GROUP).map(([group, labels]) => (
                            <optgroup key={group} label={group}>
                              {labels.map(label => <option key={label} value={label}>{label}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* 支払方法（貸方） */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">支払方法（貸方）</label>
                        <select
                          value={creditAccount} onChange={(e) => setCreditAccount(e.target.value as CreditAccountLabel)}
                          className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {CREDIT_ACCOUNTS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      {/* 店名・摘要 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">店名 / 取引先</label>
                        <input
                          type="text" value={counterparty} onChange={(e) => setCounterparty(e.target.value)}
                          placeholder="例: 〇〇ストア・△△株式会社"
                          className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                        />
                        <input
                          type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                          placeholder="例: ボールペン等・外注費用"
                          className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* 保存ボタン */}
                      <button
                        type="submit" disabled={!date || !amount}
                        className={`w-full py-5 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}