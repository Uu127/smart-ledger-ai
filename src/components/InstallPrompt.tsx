// src/components/InstallPrompt.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [isIOS, setIsIOS]                   = useState(false);
  const [showIOSGuide, setShowIOSGuide]     = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed) return;

    const ua  = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    if (ios) {
      setIsIOS(true);
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa_install_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-24 inset-x-4 z-30 bg-slate-900 rounded-2xl p-4 shadow-2xl max-w-sm mx-auto"
      >
        <div className="flex items-start gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-xl shrink-0">
            <Smartphone className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">ホーム画面に追加</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              アプリとして使うとより快適です
            </p>

            {isIOS && showIOSGuide && (
              <div className="mt-2 bg-slate-800 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold text-slate-300">① Safariの共有ボタン（↑）をタップ</p>
                <p className="text-[10px] font-bold text-slate-300">② 「ホーム画面に追加」を選択</p>
                <p className="text-[10px] font-bold text-slate-300">③ 「追加」をタップ</p>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              {isIOS ? (
                <button onClick={() => setShowIOSGuide(v => !v)}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black active:scale-95 transition-all">
                  {showIOSGuide ? "閉じる" : "追加方法を見る"}
                </button>
              ) : (
                <button onClick={handleInstall}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black active:scale-95 transition-all">
                  追加する
                </button>
              )}
              <button onClick={handleDismiss}
                className="py-2 px-3 rounded-xl bg-slate-700 text-slate-400 text-xs font-black active:scale-95 transition-all">
                後で
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}