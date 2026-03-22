// src/components/Layout.tsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Wallet, TrendingUp, History, Receipt, BarChart2, FileText, Moon, Sun, Bell } from "lucide-react";
import { InstallPrompt } from "@/components/InstallPrompt";

interface LayoutProps {
  auth: { logout: () => void };
  children: React.ReactNode;
}

const navItems = [
  { to: "/",          label: "経費入力", icon: Receipt    },
  { to: "/sales",     label: "収入入力", icon: TrendingUp },
  { to: "/dashboard", label: "集計",     icon: BarChart2  },
  { to: "/documents", label: "書類",     icon: FileText   },
  { to: "/ledger",    label: "履歴",     icon: History    },
] as const;

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark")  return true;
    if (saved === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) { root.classList.add("dark"); root.classList.remove("light"); localStorage.setItem("theme", "dark"); }
    else        { root.classList.remove("dark"); root.classList.add("light"); localStorage.setItem("theme", "light"); }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(v => !v) };
}

export function Layout({ auth, children }: LayoutProps) {
  const location = useLocation();
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="min-h-dvh flex flex-col font-sans select-none"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-main)" }}>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md border-b px-5 py-3.5 flex items-center justify-between"
        style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl shadow-sm">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tight uppercase" style={{ color: "var(--text-main)" }}>
            Smart<span className="text-emerald-500">Ledger</span>
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {/* 通知設定 */}
          <Link to="/settings/notifications"
            className="p-2 rounded-xl transition-all active:scale-95"
            style={{ color: "var(--text-muted)" }}
            title="通知設定">
            <Bell className="w-4 h-4" />
          </Link>
          {/* ダークモード */}
          <button onClick={toggle}
            className="p-2 rounded-xl transition-all active:scale-95"
            style={{ color: "var(--text-muted)" }}
            title={isDark ? "ライトモード" : "ダークモード"}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {/* ログアウト */}
          <button onClick={auth.logout}
            className="p-2 rounded-xl transition-all active:scale-95 hover:text-red-500"
            style={{ color: "var(--text-muted)" }}
            title="ログアウト">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24 max-w-2xl mx-auto w-full">{children}</main>

      <InstallPrompt />

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-lg border-t"
        style={{ backgroundColor: "var(--nav-bg)", borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto flex justify-around items-center h-[4.5rem]">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to ||
              (to === "/documents" && location.pathname.startsWith("/documents"));
            return (
              <Link key={to} to={to}
                className="relative flex flex-col items-center gap-1 px-3 py-2 transition-all duration-200 active:scale-90"
                style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}>
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                <span className="text-[9px] font-black tracking-[0.03em]">{label}</span>
                {isActive && <div className="absolute -top-[1px] w-8 h-0.5 bg-emerald-500 rounded-full" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}