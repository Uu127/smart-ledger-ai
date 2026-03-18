// src/lib/migration.ts
// localStorage のデータを Firestore へ移行するユーティリティ
import {
    collection,
    writeBatch,
    doc,
    getDocs,
    serverTimestamp,
  } from "firebase/firestore";
  import { db } from "@/lib/firebase";
  import type { LedgerEntry } from "@/types/ledger";
  
  const LOCAL_KEY = "smart_ledger_entries";
  
  /** localStorage に移行対象データが存在するか確認 */
  export function hasLocalData(): boolean {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as LedgerEntry[];
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }
  
  /** localStorage から旧データを取得 */
  export function getLocalEntries(): LedgerEntry[] {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as LedgerEntry[];
    } catch {
      return [];
    }
  }
  
  /** Firestore にすでにデータが存在するか確認 */
  export async function hasFirestoreData(uid: string): Promise<boolean> {
    const ref = collection(db, "users", uid, "entries");
    const snap = await getDocs(ref);
    return !snap.empty;
  }
  
  /**
   * localStorage → Firestore へ一括移行
   * 500件ずつバッチ書き込み（Firestore の上限）
   */
  export async function migrateToFirestore(uid: string): Promise<number> {
    const entries = getLocalEntries();
    if (entries.length === 0) return 0;
  
    const BATCH_SIZE = 500;
    let migrated = 0;
  
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = entries.slice(i, i + BATCH_SIZE);
  
      for (const entry of chunk) {
        const ref = doc(collection(db, "users", uid, "entries"));
        batch.set(ref, {
          ...entry,
          // entryType が未定義の旧データは expense として扱う
          entryType: "expense",
          migratedFrom: "localStorage",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
  
      await batch.commit();
      migrated += chunk.length;
    }
  
    return migrated;
  }
  
  /** 移行完了後に localStorage をクリア */
  export function clearLocalData(): void {
    localStorage.removeItem(LOCAL_KEY);
  }
  