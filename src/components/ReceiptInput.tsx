import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { useReceiptParse } from "@/hooks/useReceiptParse";
import { useLedger } from "@/hooks/useLedger";

const EXPENSE_CATEGORIES = ["会議費", "旅費交通費", "消耗品費", "通信費", "地代家賃", "雑費"];

export function ReceiptInput() {
  const navigate = useNavigate();
  const { parse, status, result, error, reset } = useReceiptParse();
  const { addLedgerEntry } = useLedger();
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState("");
  const [debitAccount, setDebitAccount] = useState("雑費");
  const [creditAccount, setCreditAccount] = useState("現金");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (result && status === "success" && !date) {
    setDate(result.date);
    setAmount(String(result.amount));
    setCounterparty(result.counterparty);
    setDescription(result.suggestedDescription);
    if (EXPENSE_CATEGORIES.includes(result.suggestedDebitAccount)) {
      setDebitAccount(result.suggestedDebitAccount);
    }
  }

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic();
      reset();
      setDate(""); setAmount(""); setCounterparty(""); setDescription("");
      await parse(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount) return; // 空のまま保存されるのをブロック

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

    // 「記録しました」を見せるために0.8秒待ってから移動
    setTimeout(() => {
        navigate("/ledger");
    }, 800);
  };

  const loading = status === "loading";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-6 pb-32"
    >
      {/* 🌟 AI読み込み中のフルスクリーン・ローディング画面 🌟 */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          >
            <div className="bg-white p-8 rounded-[2rem] flex flex-col items-center gap-5 shadow-2xl max-w-[80%] text-center">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
              </div>
              <div>
                <p className="text-slate-900 font-black text-lg">AIが解析中...</p>
                <p className="text-slate-400 text-xs font-bold mt-1">レシートの文字を読み取っています</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI解析セクション */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">AIスキャン</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Receipt Intelligence</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => { triggerHaptic(); fileInputCameraRef.current?.click(); }} disabled={loading} className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95">
            <Camera className="w-8 h-8" />
            <span className="text-xs font-bold">カメラ</span>
          </button>
          <button type="button" onClick={() => { triggerHaptic(); fileInputGalleryRef.current?.click(); }} disabled={loading} className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs font-bold">アルバム</span>
          </button>
        </div>

        <input ref={fileInputCameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        <input ref={fileInputGalleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-4 h-4 min-w-[16px]" /> {error}
          </motion.div>
        )}
      </section>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
        <div className="relative border-b-2 border-slate-50 pb-2 focus-within:border-emerald-500 transition-colors">
          <label className="text-[10px] font-black text-slate-400 uppercase">金額 (円)</label>
          <div className="flex items-center text-4xl font-black text-slate-900">
            <span className="text-slate-300 mr-2 text-2xl">¥</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent focus:outline-none placeholder:text-slate-100" placeholder="0" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">日付</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full p-3 rounded-xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">科目</label>
            <select value={debitAccount} onChange={(e) => setDebitAccount(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500">
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase">店名・摘要</label>
          <input type="text" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="例: 〇〇ストア" className="w-full p-3 rounded-xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500 mb-2" />
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例: ボールペン等" className="w-full p-3 rounded-xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500" />
        </div>

        {/* 🌟 確実に表示されるボタン 🌟 */}
        <button
          type="submit"
          disabled={!date || !amount || loading}
          className={`w-full py-5 mt-4 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
            ${(!date || !amount || loading) 
              ? "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed" 
              : submitted 
                ? "bg-emerald-500 shadow-lg shadow-emerald-200" 
                : "bg-slate-900 shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95"
            }`}
        >
          {submitted ? (
            <><CheckCircle2 className="w-6 h-6 animate-in zoom-in" /> 記録しました！</>
          ) : (!date || !amount) ? (
             "金額と日付を入力してください"
          ) : (
             "台帳に記録する"
          )}
        </button>
      </form>
    </motion.div>
  );
}