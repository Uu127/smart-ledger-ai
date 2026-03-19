// src/hooks/useProRate.ts
import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface ProRateSettings {
  enabled: boolean;
  ratio: number;          // 事業使用率 0〜100（%）
  targetAccounts: string[]; // 按分対象の科目
}

const DEFAULT_SETTINGS: ProRateSettings = {
  enabled: false,
  ratio: 50,
  targetAccounts: ["地代家賃", "水道光熱費", "通信費"],
};

export function useProRate() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ProRateSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(true);

  // Firestoreから設定を読み込む
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const ref  = doc(db, "users", user.uid, "settings", "proRate");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setSettings(snap.data() as ProRateSettings);
        }
      } catch (e) {
        console.error("ProRate load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // 設定を保存
  const saveSettings = useCallback(async (next: ProRateSettings) => {
    if (!user) return;
    setSettings(next);
    const ref = doc(db, "users", user.uid, "settings", "proRate");
    await setDoc(ref, { ...next, updatedAt: serverTimestamp() }, { merge: true });
  }, [user]);

  return { settings, loading, saveSettings };
}