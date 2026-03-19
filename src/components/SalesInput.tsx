// src/components/SalesInput.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, CheckCircle2, Plus } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import type { DebitAccountLabel, CreditAccountLabel } from "@/types/ledger";

const INCOME_DEBIT_ACCOUNTS = ["普通預金", "当座預金", "現金", "売掛金"] as const;
type IncomeDebitAccount = typeof INCOME_DEBIT_ACCOUNTS[number];

export function SalesInput() {
  const navigate = useNavigate();
  const { addLedgerEntry } = useLedger();

  const [date, setDate]                 = useState("");
  const [amount, setAmount]             = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription]   = useState("");
  const [debitAccount, setDebitAccount] = useState<IncomeDebitAccount>("普通預金");
  const [submitted, setSubmitted]       = useState(false);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
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

    setTimeout(() => navigate("/ledger"), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-32"
    >
      {/* ヘッダーカード */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black">売上・収入を入力</h2>
            <p className="text-[10px] font-bold text-blue-100 uppercase tracking-tight">Sales / Income Entry</p>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 金額 */}
          <div className="border-b-2 border-slate-100 pb-3 focus-within:border-blue-500 transition-colors">
            <label className="text-[10px] font-black text-slate-400 uppercase">金額 (円)</label>
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

          {/* 日付 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">日付</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* 入金先 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">入金先（借方）</label>
            <select
              value={debitAccount} onChange={(e) => setDebitAccount(e.target.value as IncomeDebitAccount)}
              className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {INCOME_DEBIT_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* 取引先・摘要 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">取引先・摘要</label>
            <input
              type="text" value={counterparty} onChange={(e) => setCounterparty(e.target.value)}
              placeholder="例: 株式会社〇〇"
              className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
            />
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 〇〇業務委託料"
              className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* 送信ボタン */}
          <button
            type="submit" disabled={!date || !amount}
            className={`w-full py-5 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
              ${(!date || !amount)
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : submitted
                ? "bg-blue-500 shadow-lg shadow-blue-200"
                : "bg-blue-600 shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95"
              }`}
          >
            {submitted
              ? <><CheckCircle2 className="w-6 h-6" /> 記録しました！</>
              : <><Plus className="w-5 h-5" /> 台帳に記録する</>
            }
          </button>
        </form>
      </div>
    </motion.div>
  );
}