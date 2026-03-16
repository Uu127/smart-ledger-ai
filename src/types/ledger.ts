// src/types/ledger.ts
export type ExpenseCategory = string; // 後で具体的なリストにできます

export interface LedgerEntry {
  id: string;
  date: string;
  debitAccount: string;   // 借方（経費科目）
  creditAccount: string;  // 貸方（支払方法）
  amount: number;
  description: string;
  counterparty: string;
  createdAt: string;
}

export interface ReceiptParseResult {
  date: string;
  amount: number;
  counterparty: string;
  suggestedDebitAccount: string;
  suggestedDescription: string;
}