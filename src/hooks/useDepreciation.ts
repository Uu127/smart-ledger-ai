// src/hooks/useDepreciation.ts
import { useCallback, useEffect, useState } from "react";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type DepreciationMethod = "straight" | "declining" | "lump";

export interface FixedAsset {
  id: string;
  name: string;               // 資産名
  acquisitionDate: string;    // 取得日 YYYY-MM-DD
  acquisitionCost: number;    // 取得価額
  usefulLife: number;         // 耐用年数
  method: DepreciationMethod; // 償却方法
  createdAt: string;
}

// ── 耐用年数テーブル（主要資産） ────────────────────────
export const USEFUL_LIFE_PRESETS: { label: string; years: number }[] = [
  { label: "パソコン・タブレット", years: 4 },
  { label: "スマートフォン", years: 4 },
  { label: "カメラ・映像機器", years: 5 },
  { label: "オフィス家具", years: 8 },
  { label: "エアコン（業務用）", years: 6 },
  { label: "自動車（普通）", years: 6 },
  { label: "自動車（軽）", years: 4 },
  { label: "建物（木造）", years: 22 },
  { label: "建物（鉄筋）", years: 47 },
  { label: "ソフトウェア", years: 5 },
];

// ── 定率法の法定償却率テーブル ────────────────────────
const DECLINING_RATE: Record<number, number> = {
  2: 1.000, 3: 0.667, 4: 0.500, 5: 0.400, 6: 0.333,
  7: 0.286, 8: 0.250, 9: 0.222, 10: 0.200,
  11: 0.182, 12: 0.167, 13: 0.154, 14: 0.143, 15: 0.133,
  20: 0.100, 22: 0.091, 47: 0.043,
};

// ── 減価償却額の計算 ──────────────────────────────────
export function calcDepreciation(asset: Omit<FixedAsset, "id" | "createdAt">, year: number): number {
  const acquisitionYear = Number(asset.acquisitionDate.slice(0, 4));
  const elapsedYears    = year - acquisitionYear + 1;

  if (elapsedYears <= 0 || elapsedYears > asset.usefulLife) return 0;

  // 一括償却（30万円未満）
  if (asset.method === "lump") {
    if (elapsedYears <= 3) return Math.floor(asset.acquisitionCost / 3);
    return 0;
  }

  // 定額法
  if (asset.method === "straight") {
    const annual = Math.floor(asset.acquisitionCost / asset.usefulLife);
    if (elapsedYears === asset.usefulLife) {
      // 最終年は備忘価額1円を残す
      return asset.acquisitionCost - annual * (asset.usefulLife - 1) - 1;
    }
    return annual;
  }

  // 定率法
  if (asset.method === "declining") {
    const rate = DECLINING_RATE[asset.usefulLife] ?? (1 / asset.usefulLife * 2);
    let bookValue = asset.acquisitionCost;
    for (let i = 1; i < elapsedYears; i++) {
      bookValue = Math.max(bookValue - Math.floor(bookValue * rate), 1);
    }
    if (elapsedYears === asset.usefulLife) return Math.max(bookValue - 1, 0);
    return Math.floor(bookValue * rate);
  }

  return 0;
}

// ── 年間合計減価償却額 ────────────────────────────────
export function calcTotalDepreciation(assets: Omit<FixedAsset, "id" | "createdAt">[], year: number): number {
  return assets.reduce((sum, a) => sum + calcDepreciation(a, year), 0);
}

// ── フック ────────────────────────────────────────────
export function useDepreciation() {
  const { user } = useAuth();
  const [assets, setAssets]   = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const ref = collection(db, "users", user.uid, "fixedAssets");
    const q   = query(ref, orderBy("acquisitionDate", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FixedAsset, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const addAsset = useCallback(async (asset: Omit<FixedAsset, "id" | "createdAt">) => {
    if (!user) return;
    await addDoc(collection(db, "users", user.uid, "fixedAssets"), {
      ...asset, createdAt: serverTimestamp(),
    });
  }, [user]);

  const removeAsset = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "fixedAssets", id));
  }, [user]);

  return { assets, loading, addAsset, removeAsset };
}