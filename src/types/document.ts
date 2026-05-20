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
  unitPrice: number;
  taxRate: 10 | 8 | 0;
}

export interface BusinessDocument {
  id: string;
  type: DocumentType;
  documentNumber: string;
  issueDate: string;
  dueDate?: string;
  deliveryDate?: string;
  subject?: string;           // 件名（例：ホームページ制作費 着手金）

  // 発行者
  issuerName: string;
  issuerContactPerson?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  invoiceRegistrationNo?: string;

  // 振込先
  bankName?: string;
  bankBranch?: string;
  bankAccountType?: string;
  bankAccountNo?: string;
  bankAccountHolder?: string;

  // 宛先
  clientName: string;
  clientAddress?: string;
  clientDepartment?: string;

  // 品目
  items: DocumentItem[];

  // 金額
  subtotal: number;
  tax10: number;
  tax8: number;
  total: number;

  // 備考
  notes?: string;

  hideTaxDisplay?: boolean;

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
  contactPerson?: string;
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

export function calcDocument(items: DocumentItem[]): DocumentCalculation {
  let subtotal    = 0;
  let tax10Amount = 0;
  let tax8Amount  = 0;
  for (const item of items) {
    const line = item.quantity * item.unitPrice;
    subtotal += line;
    if (item.taxRate === 10) tax10Amount += Math.floor(line * 0.1);
    if (item.taxRate === 8)  tax8Amount  += Math.floor(line * 0.08);
  }
  return { subtotal, tax10Amount, tax8Amount, total: subtotal + tax10Amount + tax8Amount };
}

export function generateDocumentNumber(type: DocumentType, count: number): string {
  const prefix: Record<DocumentType, string> = {
    invoice: "INV", receipt: "REC", estimate: "EST", delivery: "DEL",
  };
  return `${prefix[type]}-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
}