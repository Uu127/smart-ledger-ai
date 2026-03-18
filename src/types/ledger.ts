// src/types/ledger.ts
import type { DebitAccountLabel, CreditAccountLabel } from "@/constants/accounts";

export type { DebitAccountLabel, CreditAccountLabel };

export interface LedgerEntry {
  id: string;
  date: string;
  debitAccount: DebitAccountLabel;
  creditAccount: CreditAccountLabel;
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