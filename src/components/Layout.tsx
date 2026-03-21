// src/components/Layout.tsx
import { Link, useLocation } from "react-router-dom";
import { LogOut, Wallet, TrendingUp, History, Receipt, BarChart2 } from "lucide-react";
import { InstallPrompt } from "@/components/InstallPrompt";

interface LayoutProps {
  auth: { logout: () => void };
  children: React.ReactNode;
}

const navItems = [
  { to: "/",          label: "経費入力", icon: Receipt    },
  { to: "/sales",     label: "収入入力", icon: TrendingUp },
  { to: "/dashboard", label: "集計",     icon: BarChart2  },
  { to: "/ledger",    label: "履歴",     icon: History    },
] as const;

export function Layout({ auth, children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col font-sans select-none">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-xl shadow-sm">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-800 uppercase">
            Smart<span className="text-emerald-500">Ledger</span>
          </h1>
        </div>
        <button
          onClick={auth.logout}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors active:scale-95"
          title="ログアウト"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* PWAインストール促進バナー */}
      <InstallPrompt />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-lg border-t border-slate-100">
        <div className="max-w-2xl mx-auto flex justify-around items-center h-20">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300 active:scale-95 ${
                  isActive ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
                <span className="text-[9px] font-black tracking-[0.05em]">{label}</span>
                {isActive && (
                  <div className="absolute -top-[1px] w-8 h-1 bg-emerald-500 rounded-full shadow-[0_-4px_8px_rgba(16,185,129,0.4)]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}