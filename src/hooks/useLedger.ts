// src/hooks/useLedger.ts
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { LedgerEntry } from "@/types/ledger";

export function useLedger() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setSyncing(false);
      return;
    }

    setSyncing(true);
    const ref   = collection(db, "users", user.uid, "entries");
    const q     = query(ref, orderBy("date", "desc"));

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

    return () => unsub();
  }, [user]);

  const addLedgerEntry = useCallback(
    async (entry: Omit<LedgerEntry, "id" | "createdAt">) => {
      if (!user) throw new Error("ログインが必要です");
      const ref    = collection(db, "users", user.uid, "entries");
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

  const updateLedgerEntry = useCallback(
    async (id: string, data: Partial<Omit<LedgerEntry, "id" | "createdAt">>) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid, "entries", id);
      await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    },
    [user]
  );

  const deleteLedgerEntry = useCallback(
    async (id: string) => {
      if (!user) return;
      await deleteDoc(doc(db, "users", user.uid, "entries", id));
    },
    [user]
  );

  const refresh = useCallback(() => {}, []);

  return { entries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry, refresh, syncing };
}