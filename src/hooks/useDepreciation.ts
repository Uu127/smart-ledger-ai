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
  name: string;
  acquisitionDate: string;    // 取得日 YYYY-MM-DD
  acquisitionCost: number;    // 取得価額
  usefulLife: number;         // 耐用年数（中古計算後の値）
  method: DepreciationMethod;
  isUsed: boolean;            // 中古フラグ
  legalUsefulLife?: number;   // 法定耐用年数（中古の場合の元の年数）
  elapsedYears?: number;      // 経過年数（中古の場合）
  createdAt: string;
}

// ── 耐用年数プリセット ────────────────────────────────────
export const ASSET_PRESETS: {
  label: string;
  years: number;
  category: string;
  defaultMethod: DepreciationMethod;
}[] = [
  // コンピュータ・通信機器
  { label: "パソコン・タブレット",   years: 4,  category: "IT機器",     defaultMethod: "declining" },
  { label: "スマートフォン",         years: 4,  category: "IT機器",     defaultMethod: "declining" },
  { label: "サーバー・NAS",          years: 5,  category: "IT機器",     defaultMethod: "declining" },
  { label: "プリンター・複合機",     years: 5,  category: "IT機器",     defaultMethod: "declining" },
  { label: "ソフトウェア",           years: 5,  category: "IT機器",     defaultMethod: "straight"  },
  // 映像・音響
  { label: "カメラ・映像機器",       years: 5,  category: "映像・音響", defaultMethod: "declining" },
  { label: "マイク・音響機器",       years: 5,  category: "映像・音響", defaultMethod: "declining" },
  // 車両
  { label: "普通自動車",             years: 6,  category: "車両",       defaultMethod: "declining" },
  { label: "軽自動車",               years: 4,  category: "車両",       defaultMethod: "declining" },
  { label: "バイク（125cc以下）",    years: 3,  category: "車両",       defaultMethod: "declining" },
  { label: "バイク（125cc超）",      years: 4,  category: "車両",       defaultMethod: "declining" },
  // 家具・設備
  { label: "オフィス家具（木製）",   years: 8,  category: "家具・設備", defaultMethod: "straight"  },
  { label: "オフィス家具（金属製）", years: 15, category: "家具・設備", defaultMethod: "straight"  },
  { label: "エアコン（業務用）",     years: 6,  category: "家具・設備", defaultMethod: "declining" },
  { label: "冷蔵庫・厨房機器",      years: 6,  category: "家具・設備", defaultMethod: "declining" },
  // 建物
  { label: "建物（木造）",           years: 22, category: "建物",       defaultMethod: "straight"  },
  { label: "建物（軽量鉄骨）",       years: 19, category: "建物",       defaultMethod: "straight"  },
  { label: "建物（鉄骨・鉄筋）",    years: 47, category: "建物",       defaultMethod: "straight"  },
  // その他
  { label: "自転車",                 years: 2,  category: "その他",     defaultMethod: "straight"  },
  { label: "工具・器具",             years: 4,  category: "その他",     defaultMethod: "declining" },
];

// カテゴリー一覧
export const ASSET_CATEGORIES = [...new Set(ASSET_PRESETS.map(p => p.category))];

// ── 中古資産の耐用年数計算 ────────────────────────────────
// 国税庁の簡便法: (法定耐用年数 - 経過年数) + 経過年数 × 0.2
// 計算結果が2年未満の場合は2年
export function calcUsedAssetLife(legalYears: number, elapsedYears: number): number {
  if (elapsedYears >= legalYears) {
    // 法定耐用年数を超えて経過している場合: 法定耐用年数 × 0.2
    const result = Math.floor(legalYears * 0.2);
    return Math.max(result, 2);
  }
  const remaining = legalYears - elapsedYears;
  const result    = Math.floor(remaining + elapsedYears * 0.2);
  return Math.max(result, 2);
}

// ── 定率法の法定償却率 ────────────────────────────────────
const DECLINING_RATE: Record<number, number> = {
  2: 1.000, 3: 0.667, 4: 0.500, 5: 0.400, 6: 0.333,
  7: 0.286, 8: 0.250, 9: 0.222, 10: 0.200,
  11: 0.182, 12: 0.167, 13: 0.154, 14: 0.143, 15: 0.133,
  19: 0.105, 20: 0.100, 22: 0.091, 47: 0.043,
};

function getDecliningRate(years: number): number {
  if (DECLINING_RATE[years]) return DECLINING_RATE[years];
  // テーブルにない年数は近似値
  return Math.round((1 / years * 2) * 1000) / 1000;
}

// ── 減価償却額の計算 ──────────────────────────────────────
export function calcDepreciation(
  asset: Omit<FixedAsset, "id" | "createdAt">,
  year: number
): number {
  const acquisitionYear = Number(asset.acquisitionDate.slice(0, 4));
  const elapsedYears    = year - acquisitionYear + 1;

  if (elapsedYears <= 0 || elapsedYears > asset.usefulLife) return 0;

  // 一括償却（30万円未満・3年均等）
  if (asset.method === "lump") {
    if (elapsedYears <= 3) return Math.floor(asset.acquisitionCost / 3);
    return 0;
  }

  // 定額法
  if (asset.method === "straight") {
    const annual = Math.floor(asset.acquisitionCost / asset.usefulLife);
    if (elapsedYears === asset.usefulLife) {
      return Math.max(asset.acquisitionCost - annual * (asset.usefulLife - 1) - 1, 0);
    }
    return annual;
  }

  // 定率法
  if (asset.method === "declining") {
    const rate = getDecliningRate(asset.usefulLife);
    let bookValue = asset.acquisitionCost;
    for (let i = 1; i < elapsedYears; i++) {
      bookValue = Math.max(bookValue - Math.floor(bookValue * rate), 1);
    }
    if (elapsedYears === asset.usefulLife) return Math.max(bookValue - 1, 0);
    return Math.floor(bookValue * rate);
  }

  return 0;
}

export function calcTotalDepreciation(
  assets: Omit<FixedAsset, "id" | "createdAt">[],
  year: number
): number {
  return assets.reduce((sum, a) => sum + calcDepreciation(a, year), 0);
}

// ── フック ────────────────────────────────────────────────
export function useDepreciation() {
  const { user } = useAuth();
  const [assets, setAssets]   = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const ref   = collection(db, "users", user.uid, "fixedAssets");
    const q     = query(ref, orderBy("acquisitionDate", "desc"));
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