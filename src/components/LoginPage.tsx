// src/components/LoginPage.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Mail, Eye, EyeOff, AlertCircle, Chrome } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "login" | "signup";

export function LoginPage() {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const [mode, setMode]         = useState<Mode>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const clearError = () => setError(null);

  const toJa = (code: string): string => {
    const map: Record<string, string> = {
      "auth/user-not-found":       "メールアドレスが登録されていません",
      "auth/wrong-password":       "パスワードが違います",
      "auth/email-already-in-use": "このメールアドレスはすでに使われています",
      "auth/weak-password":        "パスワードは6文字以上にしてください",
      "auth/invalid-email":        "メールアドレスの形式が正しくありません",
      "auth/popup-closed-by-user": "ログインがキャンセルされました",
      "auth/too-many-requests":    "試行回数が多すぎます。しばらく待ってください",
      "auth/invalid-credential":   "メールアドレスまたはパスワードが違います",
    };
    return map[code] ?? "エラーが発生しました。もう一度お試しください";
  };

  const handleGoogle = async () => {
    setLoading(true); clearError();
    try { await loginWithGoogle(); }
    catch (e: unknown) { setError(toJa((e as { code?: string }).code ?? "")); }
    finally { setLoading(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clearError();
    try {
      if (mode === "login") await loginWithEmail(email, password);
      else await signupWithEmail(email, password);
    } catch (e: unknown) { setError(toJa((e as { code?: string }).code ?? "")); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center px-5 select-none">

      {/* ロゴ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-8 flex flex-col items-center gap-3"
      >
        <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-200">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-800 uppercase">
            Smart<span className="text-emerald-500">Ledger</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">AI 経費台帳</p>
        </div>
      </motion.div>

      {/* カード */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-7"
      >
        {/* タブ */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); clearError(); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                mode === m ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
              }`}
            >
              {m === "login" ? "ログイン" : "新規登録"}
            </button>
          ))}
        </div>

        {/* Googleログイン */}
        <button onClick={handleGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold text-sm hover:border-emerald-200 hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50 mb-5"
        >
          <Chrome className="w-5 h-5 text-emerald-500" />
          Google でログイン
        </button>

        {/* 区切り線 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">または</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {/* Emailフォーム */}
        <form onSubmit={handleEmail} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">メールアドレス</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com" autoComplete="email" required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent text-sm font-bold focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">パスワード</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required minLength={6}
                className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-50 border-2 border-transparent text-sm font-bold focus:outline-none focus:border-emerald-400 transition-colors"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={loading || !email || !password}
            className="w-full py-4 mt-1 rounded-2xl font-black text-white transition-all bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-xl shadow-slate-100"
          >
            {loading ? <span className="animate-pulse">処理中...</span>
              : mode === "login" ? "ログイン" : "アカウントを作成"}
          </button>
        </form>
      </motion.div>

      <p className="mt-6 text-[10px] text-slate-300 font-bold text-center">
        ログインすることで利用規約・プライバシーポリシーに同意したものとみなします
      </p>
    </div>
  );
}
