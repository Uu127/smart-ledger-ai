// src/types/document.ts

export type DocumentType = "invoice" | "receipt" | "estimate" | "delivery";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice:  "請求書",
  receipt:  "領収書",
  estimate: "見積書",
  delivery: "納品書",
};

export interface DocumentItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;          // 税抜単価（taxInclusive=trueの場合は税込単価）
  taxRate: 10 | 8 | 0;
  taxInclusive?: boolean;     // true = unitPriceが税込金額
}

export interface BusinessDocument {
  id: string;
  type: DocumentType;
  documentNumber: string;
  issueDate: string;
  dueDate?: string;
  deliveryDate?: string;
  issuerName: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  invoiceRegistrationNo?: string;
  clientName: string;
  clientAddress?: string;
  clientDepartment?: string;
  items: DocumentItem[];
  subtotal: number;           // 税抜合計
  tax10: number;
  tax8: number;
  total: number;              // 税込合計
  notes?: string;
  status: "draft" | "sent" | "paid";
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCalculation {
  subtotal: number;
  tax10Amount: number;
  tax8Amount: number;
  total: number;
}

export interface IssuerProfile {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  invoiceRegistrationNo?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountType?: string;
  bankAccountNo?: string;
  bankAccountHolder?: string;
}

// ── 計算ロジック ──────────────────────────────────────────
export function calcDocument(items: DocumentItem[]): DocumentCalculation {
  let subtotal    = 0;
  let tax10Amount = 0;
  let tax8Amount  = 0;

  for (const item of items) {
    if (item.taxInclusive) {
      // 税込入力の場合：税込合計から税抜・税額を逆算
      // Math.round を使って ¥400,000 → ¥400,000 になるよう保証
      const taxIncLineTotal = item.quantity * item.unitPrice;
      const taxExLineTotal  = Math.round(taxIncLineTotal / (1 + item.taxRate / 100));
      const taxAmount       = taxIncLineTotal - taxExLineTotal;
      subtotal += taxExLineTotal;
      if (item.taxRate === 10) tax10Amount += taxAmount;
      if (item.taxRate === 8)  tax8Amount  += taxAmount;
    } else {
      // 税抜入力の場合：通常計算
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      if (item.taxRate === 10) tax10Amount += Math.floor(lineTotal * 0.1);
      if (item.taxRate === 8)  tax8Amount  += Math.floor(lineTotal * 0.08);
    }
  }

  return {
    subtotal,
    tax10Amount,
    tax8Amount,
    total: subtotal + tax10Amount + tax8Amount,
  };
}

export function generateDocumentNumber(type: DocumentType, count: number): string {
  const prefix: Record<DocumentType, string> = {
    invoice:  "INV",
    receipt:  "REC",
    estimate: "EST",
    delivery: "DEL",
  };
  const year = new Date().getFullYear();
  const seq  = String(count + 1).padStart(3, "0");
  return `${prefix[type]}-${year}-${seq}`;
}