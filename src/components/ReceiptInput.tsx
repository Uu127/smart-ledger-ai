import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, CheckCircle2, Sparkles, AlertCircle, X } from "lucide-react";
import { useReceiptParse } from "@/hooks/useReceiptParse";
import { useLedger } from "@/hooks/useLedger";

const EXPENSE_CATEGORIES = ["会議費", "旅費交通費", "消耗品費", "通信費", "地代家賃", "雑費"];

export function ReceiptInput() {
  const navigate = useNavigate();
  const { parse, status, result, error, reset } = useReceiptParse();
  const { addLedgerEntry } = useLedger();
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  // ドロワー（下から出てくる画面）の開閉状態
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [date, setDate] = useState("");
  const [debitAccount, setDebitAccount] = useState("雑費");
  const [creditAccount] = useState("現金");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // 解析成功時にデータをフォームにセットする
  useEffect(() => {
    if (result && status === "success" && !date) {
      setDate(result.date);
      setAmount(String(result.amount));
      setCounterparty(result.counterparty);
      setDescription(result.suggestedDescription);
      if (EXPENSE_CATEGORIES.includes(result.suggestedDebitAccount)) {
        setDebitAccount(result.suggestedDebitAccount);
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
      // 写真を選んだ瞬間にドロワーを下から引き上げる！
      setIsDrawerOpen(true); 
      await parse(file);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(reset, 300); // 閉じた後に状態をリセット
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

    // 保存後、少し待ってから履歴画面へ
    setTimeout(() => {
        setIsDrawerOpen(false);
        navigate("/ledger");
    }, 800);
  };

  const loading = status === "loading";

  return (
    <div className="p-4 space-y-6 pb-32">
      {/* 1. メイン画面（スキャンボタンのみを配置してスッキリさせる） */}
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
          <button type="button" onClick={() => { triggerHaptic(); fileInputCameraRef.current?.click(); }} className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95">
            <Camera className="w-8 h-8" />
            <span className="text-xs font-bold">カメラで撮る</span>
          </button>
          <button type="button" onClick={() => { triggerHaptic(); fileInputGalleryRef.current?.click(); }} className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs font-bold">アルバムから</span>
          </button>
        </div>

        <input ref={fileInputCameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        <input ref={fileInputGalleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </motion.section>

      {/* 2. ドロワー（下からスッと出てくるUI） */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* 背景の暗幕（タップで閉じる） */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* ドロワー本体 */}
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] h-[85vh] flex flex-col"
            >
              {/* ドロワーのヘッダー */}
              <div className="flex items-center justify-between p-6 border-b border-slate-50 shrink-0">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  {loading ? <span className="animate-pulse">解析中...</span> : "解析結果の確認"}
                </h3>
                <button onClick={closeDrawer} className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 active:scale-90 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ドロワーの中身（スクロール可能） */}
              <div className="p-6 overflow-y-auto flex-1 pb-safe">
                
                {/* エラー時の表示 */}
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium mb-4">
                    <AlertCircle className="w-5 h-5 min-w-[20px]" /> {error}
                  </div>
                )}

                {/* 🌟 3. スケルトンUI（読み込み中に光るダミー要素） 🌟 */}
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
                  /* 🌟 4. 実際の入力フォーム（解析完了後にスッと切り替わる） 🌟 */
                  <form onSubmit={handleSubmit} className="space-y-6">
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

                    <button
                      type="submit"
                      disabled={!date || !amount}
                      className={`w-full py-5 mt-4 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
                        ${(!date || !amount) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : submitted ? "bg-emerald-500 shadow-lg shadow-emerald-200" : "bg-slate-900 shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95"}
                      `}
                    >
                      {submitted ? <><CheckCircle2 className="w-6 h-6 animate-in zoom-in" /> 記録しました！</> : "台帳に記録する"}
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