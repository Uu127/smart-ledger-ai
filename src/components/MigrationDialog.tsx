// src/components/MigrationDialog.tsx
// localStorage → Firestore 移行ダイアログ
import { useState } from "react";
import { motion } from "framer-motion";
import { CloudUpload, CheckCircle2, AlertCircle, X } from "lucide-react";
import { migrateToFirestore, clearLocalData } from "@/lib/migration";
import { useAuth } from "@/contexts/AuthContext";

interface MigrationDialogProps {
  count: number;           // 移行対象件数
  onDone: () => void;      // 移行完了 or スキップ後のコールバック
}

export function MigrationDialog({ count, onDone }: MigrationDialogProps) {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [migrated, setMigrated] = useState(0);

  const handleMigrate = async () => {
    if (!user) return;
    setState("loading");
    try {
      const n = await migrateToFirestore(user.uid);
      setMigrated(n);
      clearLocalData();
      setState("done");
      setTimeout(onDone, 1500);
    } catch {
      setState("error");
    }
  };

  const handleSkip = () => {
    clearLocalData(); // 旧データは破棄
    onDone();
  };

  return (
    <>
      {/* 背景 */}
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-7"
        >
          {state === "done" ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-black text-slate-800">{migrated}件のデータを移行しました！</p>
              <p className="text-xs text-slate-400 font-bold">クラウドに保存されました</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-emerald-100 p-2.5 rounded-xl">
                  <CloudUpload className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">既存データをクラウドへ移行</h3>
                  <p className="text-[10px] text-slate-400 font-bold">端末内のデータが見つかりました</p>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-4 mb-5">
                <p className="text-sm font-bold text-slate-700">
                  <span className="text-emerald-600 font-black text-lg">{count}</span>
                  件の仕訳データが端末に保存されています。
                </p>
                <p className="text-xs text-slate-500 mt-1 font-bold">
                  クラウドに移行すると、スマホ・PCどちらからでも同じデータにアクセスできます。
                </p>
              </div>

              {state === "error" && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  移行中にエラーが発生しました。再試行してください。
                </div>
              )}

              <button
                onClick={handleMigrate}
                disabled={state === "loading"}
                className="w-full py-4 rounded-2xl font-black text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-60 shadow-lg shadow-emerald-200 mb-3"
              >
                {state === "loading"
                  ? <span className="animate-pulse">移行中...</span>
                  : "クラウドに移行する"}
              </button>

              <button
                onClick={handleSkip}
                disabled={state === "loading"}
                className="w-full py-3 rounded-2xl font-bold text-slate-400 text-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> 移行せずに続ける（旧データは削除されます）
              </button>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
