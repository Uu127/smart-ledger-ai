import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ReceiptInput } from "@/components/ReceiptInput";
import { LedgerList } from "@/components/LedgerList";

// モックのAuth（後で本物に入れ替え可能）
const mockAuth = {
  logout: () => {
    localStorage.removeItem("access_granted");
    window.location.reload();
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <Layout auth={mockAuth}>
        <Routes>
          <Route path="/" element={<ReceiptInput />} />
          <Route path="/ledger" element={<LedgerList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}