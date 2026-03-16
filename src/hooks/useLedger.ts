// src/hooks/useLedger.ts
import { useCallback, useState, useEffect } from "react";
import type { LedgerEntry } from "@/types/ledger";

const STORAGE_KEY = "smart_ledger_entries";

export function useLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  // 初期読み込み
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse storage", e);
      }
    }
  }, []);

  const addLedgerEntry = useCallback((entry: Omit<LedgerEntry, "id" | "createdAt">) => {
    const newEntry: LedgerEntry = {
      ...entry,
      id: crypto.randomUUID(), // ブラウザ標準の機能でID生成
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => {
      const next = [newEntry, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    return newEntry;
  }, []);

  const refresh = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  return { entries, addLedgerEntry, refresh };
}