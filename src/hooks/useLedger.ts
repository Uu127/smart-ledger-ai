// src/hooks/useLedger.ts
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { LedgerEntry } from "@/types/ledger";

export function useLedger() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [syncing, setSyncing] = useState(true); // 初回読み込み中フラグ

  useEffect(() => {
    // 未ログインの場合は何もしない
    if (!user) {
      setEntries([]);
      setSyncing(false);
      return;
    }

    setSyncing(true);
    const ref = collection(db, "users", user.uid, "entries");
    const q   = query(ref, orderBy("date", "desc"));

    // onSnapshot: Firestore の変更をリアルタイムで受信
    // → スマホで入力した瞬間に PC 画面にも反映される
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LedgerEntry, "id">),
      }));
      setEntries(data);
      setSyncing(false);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      setSyncing(false);
    });

    // コンポーネントがアンマウントされたらリスナーを解除
    return () => unsub();
  }, [user]);

  const addLedgerEntry = useCallback(
    async (entry: Omit<LedgerEntry, "id" | "createdAt">) => {
      if (!user) throw new Error("ログインが必要です");

      const ref = collection(db, "users", user.uid, "entries");
      const docRef = await addDoc(ref, {
        ...entry,
        entryType: entry.entryType ?? "expense",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { id: docRef.id, ...entry } as LedgerEntry;
    },
    [user]
  );

  // Firestore はリアルタイムなので手動 refresh は不要だが、
  // 互換性のために空関数として残す
  const refresh = useCallback(() => {}, []);

  return { entries, addLedgerEntry, refresh, syncing };
}
