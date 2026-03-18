// src/App.tsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/components/LoginPage";
import { MigrationDialog } from "@/components/MigrationDialog";
import { ReceiptInput } from "@/components/ReceiptInput";
import { LedgerList } from "@/components/LedgerList";
import { hasLocalData, getLocalEntries, hasFirestoreData } from "@/lib/migration";

// ── 認証済み画面 ──────────────────────────────────────────
function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [showMigration, setShowMigration]   = useState(false);
  const [migrationCount, setMigrationCount] = useState(0);

  // 初回ログイン時に localStorage → Firestore 移行が必要か確認
  useEffect(() => {
    if (!user) return;
    (async () => {
      if (hasLocalData()) {
        const alreadyMigrated = await hasFirestoreData(user.uid);
        if (!alreadyMigrated) {
          setMigrationCount(getLocalEntries().length);
          setShowMigration(true);
        }
      }
    })();
  }, [user]);

  const auth = { logout };

  return (
    <BrowserRouter>
      {/* localStorage → Firestore 移行ダイアログ */}
      {showMigration && (
        <MigrationDialog
          count={migrationCount}
          onDone={() => setShowMigration(false)}
        />
      )}

      <Layout auth={auth}>
        <Routes>
          <Route path="/"       element={<ReceiptInput />} />
          <Route path="/ledger" element={<LedgerList />} />
          <Route path="*"       element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

// ── ルートゲート ──────────────────────────────────────────
function AppGate() {
  const { user, loading } = useAuth();

  // Firebase Auth の初期化待ち
  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <AuthenticatedApp />;
}

// ── エントリポイント ──────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
