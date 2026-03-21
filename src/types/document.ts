// src/types/document.ts

export type DocumentType = "invoice" | "receipt" | "estimate" | "delivery";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice:  "請求書",
  receipt:  "領収書",
  estimate: "見積書",
  delivery: "納品書",
};

// 書類の品目行
export interface DocumentItem {
  id: string;
  description: string;  // 品目・内容
  quantity: number;     // 数量
  unit: string;         // 単位
  unitPrice: number;    // 単価
  taxRate: 10 | 8 | 0; // 消費税率
}

// 書類本体
export interface BusinessDocument {
  id: string;
  type: DocumentType;
  documentNumber: string;   // 書類番号（例: INV-2026-001）
  issueDate: string;        // 発行日 YYYY-MM-DD
  dueDate?: string;         // 支払期限（請求書のみ）
  deliveryDate?: string;    // 納品日（納品書・領収書）

  // 発行者情報
  issuerName: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  invoiceRegistrationNo?: string; // インボイス登録番号 T+13桁

  // 宛先情報
  clientName: string;
  clientAddress?: string;
  clientDepartment?: string;

  // 品目
  items: DocumentItem[];

  // 金額（計算値・保存用）
  subtotal: number;         // 小計（税抜）
  tax10: number;            // 消費税10%
  tax8: number;             // 消費税8%（軽減税率）
  total: number;            // 合計（税込）

  // 備考
  notes?: string;

  // 管理
  status: "draft" | "sent" | "paid";
  createdAt: string;
  updatedAt: string;
}

// 計算結果
export interface DocumentCalculation {
  subtotal: number;
  tax10Amount: number;
  tax8Amount: number;
  total: number;
}

// 発行者プロフィール（設定として保存）
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

// 計算ロジック
export function calcDocument(items: DocumentItem[]): DocumentCalculation {
  let subtotal     = 0;
  let tax10Amount  = 0;
  let tax8Amount   = 0;

  for (const item of items) {
    const lineTotal = item.quantity * item.unitPrice;
    subtotal += lineTotal;
    if (item.taxRate === 10) tax10Amount += Math.floor(lineTotal * 0.1);
    if (item.taxRate === 8)  tax8Amount  += Math.floor(lineTotal * 0.08);
  }

  return {
    subtotal,
    tax10Amount,
    tax8Amount,
    total: subtotal + tax10Amount + tax8Amount,
  };
}

// 書類番号の自動生成
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