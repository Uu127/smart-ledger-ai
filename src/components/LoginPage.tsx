// src/components/LoginPage.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? "smartledger";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      triggerHaptic();
      localStorage.setItem("access_granted", "true");
      onLogin();
    } else {
      triggerHaptic();
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center px-6 select-none">
      
      {/* ロゴ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 flex flex-col items-center gap-4"
      >
        <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-200">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-800 uppercase">
            Smart<span className="text-emerald-500">Ledger</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
            AI 経費台帳
          </p>
        </div>
      </motion.div>

      {/* ログインカード */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={`w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-8 ${shaking ? "animate-bounce" : ""}`}
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-slate-100 p-2 rounded-xl">
            <Lock className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800">ログイン</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">パスワードで認証</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">パスワード</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                className={`w-full p-3 pr-12 rounded-xl bg-slate-50 border-2 text-sm font-bold focus:outline-none transition-colors ${
                  error 
                    ? "border-red-300 bg-red-50 focus:border-red-400" 
                    : "border-transparent focus:border-emerald-400"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-500 text-xs font-bold"
            >
              <AlertCircle className="w-4 h-4" />
              パスワードが違います
            </motion.div>
          )}

          <button
            type="submit"
            disabled={!password}
            className="w-full py-4 rounded-2xl font-black text-white transition-all duration-300
              bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
              shadow-xl shadow-slate-200 mt-2"
          >
            ログイン
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-300 font-bold mt-6">
          ※ パスワードは管理者から受け取ってください
        </p>
      </motion.div>
    </div>
  );
}