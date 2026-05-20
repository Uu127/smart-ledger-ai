// src/components/SalesInput.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, CheckCircle2, Plus, Camera, Image as ImageIcon, X, AlertCircle, Sparkles } from "lucide-react";
import { DateInput } from "@/components/DateInput";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useLedger } from "@/hooks/useLedger";
import type { DebitAccountLabel, CreditAccountLabel, ReceiptParseResult } from "@/types/ledger";

const INCOME_DEBIT_ACCOUNTS = ["普通預金", "当座預金", "現金", "売掛金"] as const;
type IncomeDebitAccount = typeof INCOME_DEBIT_ACCOUNTS[number];
type ScanStatus = "idle" | "loading" | "success" | "error";

// Base64変換
async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SalesInput() {
  const navigate = useNavigate();
  const { addLedgerEntry } = useLedger();

  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  const [isDrawerOpen, setIsDrawerOpen]     = useState(false);
  const [scanStatus, setScanStatus]         = useState<ScanStatus>("idle");
  const [scanError, setScanError]           = useState<string | null>(null);

  const [date, setDate]                 = useState("");
  const [amount, setAmount]             = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription]   = useState("");
  const [debitAccount, setDebitAccount] = useState<IncomeDebitAccount>("普通預金");
  const [submitted, setSubmitted]       = useState(false);

  // ドロワーが開いている間はbodyスクロール禁止
  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isDrawerOpen]);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
  };

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    triggerHaptic();
    setScanStatus("loading");
    setScanError(null);
    setDate(""); setAmount(""); setCounterparty(""); setDescription("");
    setSubmitted(false);
    setIsDrawerOpen(true);

    try {
      const base64Data = await toBase64(file);
      const parseSalesReceipt = httpsCallable<
        { base64Data: string; mimeType: string },
        ReceiptParseResult
      >(functions, "parseSalesReceipt");

      const res = await parseSalesReceipt({ base64Data, mimeType: file.type });
      const data = res.data;

      setDate(data.date);
      setAmount(String(data.amount));
      setCounterparty(data.counterparty);
      setDescription(data.suggestedDescription);
      if (INCOME_DEBIT_ACCOUNTS.includes(data.suggestedDebitAccount as IncomeDebitAccount)) {
        setDebitAccount(data.suggestedDebitAccount as IncomeDebitAccount);
      }
      setScanStatus("success");
    } catch {
      setScanError("請求書の解析に失敗しました。手動で入力してください。");
      setScanStatus("error");
    }
  }, []);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setScanStatus("idle");
      setScanError(null);
    }, 300);
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
      creditAccount: "現金" as CreditAccountLabel,
      amount:       Number(amount),
      description:  description || "（摘要なし）",
      counterparty: counterparty || "（取引先なし）",
    });

    setTimeout(() => {
      setIsDrawerOpen(false);
      navigate("/ledger");
    }, 800);
  };

  const handleManual = () => {
    setScanStatus("success"); // フォームを表示
    setIsDrawerOpen(true);
  };

  const loading = scanStatus === "loading";

  return (
    <div className="p-4 space-y-5 pb-32">

      {/* ヘッダーカード */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-white/20 p-2 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black">売上・収入を入力</h2>
            <p className="text-[10px] font-bold text-blue-100 uppercase tracking-tight">Sales / Income Entry</p>
          </div>
        </div>
      </motion.div>

      {/* スキャンボタン */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl p-6 shadow-sm border"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>請求書をスキャン</h3>
            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: "var(--text-muted)" }}>AI Auto Capture</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            type="button"
            onClick={() => { triggerHaptic(); fileInputCameraRef.current?.click(); }}
            className="flex flex-col items-center justify-center gap-3 py-9 rounded-2xl border-2 border-dashed transition-all active:scale-95"
            style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text-sub)" }}
          >
            <Camera className="w-7 h-7" />
            <span className="text-xs font-bold">カメラで撮る</span>
          </button>
          <button
            type="button"
            onClick={() => { triggerHaptic(); fileInputGalleryRef.current?.click(); }}
            className="flex flex-col items-center justify-center gap-3 py-9 rounded-2xl border-2 border-dashed transition-all active:scale-95"
            style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text-sub)" }}
          >
            <ImageIcon className="w-7 h-7" />
            <span className="text-xs font-bold">アルバムから</span>
          </button>
        </div>

        {/* 手動入力ボタン */}
        <button
          type="button"
          onClick={handleManual}
          className="w-full py-3 rounded-2xl border-2 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
          style={{ borderColor: "var(--border)", color: "var(--text-sub)" }}
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
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.12)]"
              style={{ maxHeight: "85dvh", backgroundColor: "var(--bg-card)" }}
            >
              {/* グラブバー */}
              <div className="flex justify-center pt-3 pb-0 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--border)" }} />
              </div>

              {/* ヘッダー */}
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                style={{ borderColor: "var(--border)" }}>
                <h3 className="font-black flex items-center gap-2" style={{ color: "var(--text-main)" }}>
                  {loading
                    ? <><span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-ping" />解析中...</>
                    : "売上内容の確認"
                  }
                </h3>
                <button onClick={closeDrawer}
                  className="p-2 rounded-full active:scale-90 transition-all"
                  style={{ backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* スクロールエリア */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="px-6 pt-5 pb-12">

                  {scanError && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium mb-5">
                      <AlertCircle className="w-5 h-5 shrink-0" /> {scanError}
                    </div>
                  )}

                  {/* スケルトン */}
                  {loading ? (
                    <div className="space-y-5 animate-pulse">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-3 rounded-full w-16" style={{ backgroundColor: "var(--bg-input)" }} />
                          <div className="h-12 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }} />
                        </div>
                      ))}
                      <div className="h-14 rounded-2xl" style={{ backgroundColor: "var(--bg-input)" }} />
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">

                      {/* 金額 */}
                      <div className="border-b-2 pb-3 focus-within:border-blue-500 transition-colors"
                        style={{ borderColor: "var(--border)" }}>
                        <label className="text-[10px] font-black uppercase"
                          style={{ color: "var(--text-muted)" }}>金額 (円)</label>
                        <div className="flex items-center text-4xl font-black mt-1"
                          style={{ color: "var(--text-main)" }}>
                          <span className="mr-2 text-2xl" style={{ color: "var(--text-muted)" }}>¥</span>
                          <input
                            type="number" inputMode="numeric" value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-transparent focus:outline-none"
                            style={{ color: "var(--text-main)" }}
                            placeholder="0" required
                          />
                        </div>
                      </div>

                      {/* 日付 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase"
                          style={{ color: "var(--text-muted)" }}>日付</label>
                        <DateInput value={date} onChange={setDate} required
                          className="w-full focus-within:ring-2 focus-within:ring-blue-400" />
                      </div>

                      {/* 入金先 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase"
                          style={{ color: "var(--text-muted)" }}>入金先（借方）</label>
                        <select value={debitAccount} onChange={(e) => setDebitAccount(e.target.value as IncomeDebitAccount)}
                          className="w-full p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                          style={{ backgroundColor: "var(--bg-input)", color: "var(--text-main)" }}
                        >
                          {INCOME_DEBIT_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>

                      {/* 取引先・摘要 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase"
                          style={{ color: "var(--text-muted)" }}>取引先・摘要</label>
                        <input type="text" value={counterparty} onChange={(e) => setCounterparty(e.target.value)}
                          placeholder="例: 株式会社〇〇"
                          className="w-full p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
                          style={{ backgroundColor: "var(--bg-input)", color: "var(--text-main)" }}
                        />
                        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                          placeholder="例: 〇〇業務委託料"
                          className="w-full p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                          style={{ backgroundColor: "var(--bg-input)", color: "var(--text-main)" }}
                        />
                      </div>

                      {/* 送信ボタン */}
                      <button type="submit" disabled={!date || !amount}
                        className={`w-full py-5 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
                          ${(!date || !amount)
                            ? "cursor-not-allowed opacity-40"
                            : submitted
                            ? "bg-blue-500 shadow-lg shadow-blue-200"
                            : "bg-blue-600 shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95"
                          }`}
                        style={(!date || !amount)
                          ? { backgroundColor: "var(--bg-input)", color: "var(--text-muted)" }
                          : {}}
                      >
                        {submitted
                          ? <><CheckCircle2 className="w-6 h-6" /> 記録しました！</>
                          : <><Plus className="w-5 h-5" /> 台帳に記録する</>
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