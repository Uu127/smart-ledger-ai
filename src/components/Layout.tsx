import { Link, useLocation } from "react-router-dom";
// インポートを修正 (ListText を History に変更)
import { Camera, History, LogOut, Wallet } from "lucide-react";

interface LayoutProps {
  auth: {
    logout: () => void;
  };
  children: React.ReactNode;
}

const navItems = [
    { to: "/", label: "Scan", icon: Camera },
    { to: "/ledger", label: "History", icon: History }, // ここを History に変更
  ] as const;

export function Layout({ auth, children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-background text-slate-900 flex flex-col font-sans">
      {/* Header: シンプルで洗練されたデザイン */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg shadow-sm">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-primary uppercase">
            Smart<span className="text-accent">Ledger</span>
          </h1>
        </div>
        
        <button
          onClick={auth.logout}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          title="ログアウト"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content: ボトムナビの高さ分だけ下に余白を確保 */}
      <main className="flex-1 pb-24 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Navigation: スマホでの操作性を最優先 */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-lg border-t border-slate-100 pb-safe-bottom">
        <div className="max-w-2xl mx-auto flex justify-around items-center h-20">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex flex-col items-center gap-1.5 px-8 py-2 transition-all duration-300 ${
                  isActive ? "text-accent" : "text-slate-300 hover:text-slate-500"
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? "scale-110" : ""}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.1em]">
                  {label}
                </span>
                
                {/* アクティブなタブのインジケーター */}
                {isActive && (
                  <div className="absolute -top-[1px] w-10 h-1 bg-accent rounded-full shadow-[0_-4px_8px_rgba(16,185,129,0.3)]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}