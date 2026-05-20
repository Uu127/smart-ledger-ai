// src/App.tsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/components/LoginPage";
import { MigrationDialog } from "@/components/MigrationDialog";
import { ReceiptInput } from "@/components/ReceiptInput";
import { SalesInput } from "@/components/SalesInput";
import { Dashboard } from "@/components/Dashboard";
import { LedgerList } from "@/components/LedgerList";
import { TaxReport } from "@/components/TaxReport";
import { ETaxHelper } from "@/components/ETaxHelper";
import { ProRateSettings } from "@/components/ProRateSettings";
import { DepreciationManager } from "@/components/DepreciationManager";
import { GeneralLedger } from "@/components/GeneralLedger";
import { DocumentList } from "@/components/DocumentList";
import { DocumentCreator } from "@/components/DocumentCreator";
import { DocumentPrint } from "@/components/DocumentPrint";
import { IssuerProfileSettings } from "@/components/IssuerProfileSettings";
import { NotificationSettings } from "@/components/NotificationSettings";
import { hasLocalData, getLocalEntries, hasFirestoreData } from "@/lib/migration";

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [showMigration, setShowMigration]   = useState(false);
  const [migrationCount, setMigrationCount] = useState(0);

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

  return (
    <BrowserRouter>
      {showMigration && (
        <MigrationDialog count={migrationCount} onDone={() => setShowMigration(false)} />
      )}
      <Layout auth={{ logout }}>
        <Routes>
          <Route path="/"                    element={<ReceiptInput />} />
          <Route path="/sales"               element={<SalesInput />} />
          <Route path="/dashboard"           element={<Dashboard />} />
          <Route path="/ledger"              element={<LedgerList />} />
          <Route path="/tax"                 element={<TaxReport />} />
          <Route path="/etax"                element={<ETaxHelper />} />
          <Route path="/settings/prorate"    element={<ProRateSettings />} />
          <Route path="/settings/notifications" element={<NotificationSettings />} />
          <Route path="/depreciation"          element={<DepreciationManager />} />
          <Route path="/general-ledger"       element={<GeneralLedger />} />
          <Route path="/documents"           element={<DocumentList />} />
          <Route path="/documents/new"       element={<DocumentCreator />} />
          <Route path="/documents/:id/edit"  element={<DocumentCreator />} />
          <Route path="/documents/:id/print" element={<DocumentPrint />} />
          <Route path="/documents/settings"  element={<IssuerProfileSettings />} />
          <Route path="*"                    element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function AppGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
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

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}