// src/App.tsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/components/LoginPage";
import { ReceiptInput } from "@/components/ReceiptInput";
import { LedgerList } from "@/components/LedgerList";

function isAuthenticated() {
  return localStorage.getItem("access_granted") === "true";
}

const auth = {
  logout: () => {
    localStorage.removeItem("access_granted");
    window.location.reload();
  },
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated);

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <Layout auth={auth}>
        <Routes>
          <Route path="/" element={<ReceiptInput />} />
          <Route path="/ledger" element={<LedgerList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}