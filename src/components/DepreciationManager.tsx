// src/components/DepreciationManager.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Trash2, X, ChevronDown } from "lucide-react";
import { useDepreciation, calcDepreciation, calcTotalDepreciation } from "@/hooks/useDepreciation";
import { FixedAssetForm } from "@/components/FixedAssetForm";

const METHOD_LABELS = {
  straight:  "定額法",
  declining: "定率法",
  lump:      "一括償却",
};

export function DepreciationManager() {
  const { assets, loading, removeAsset } = useDepreciation();
  const [isFormOpen, setIsFormOpen]      = useState(false);
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear]          = useState(currentYear);

  const totalThisYear = calcTotalDepreciation(assets, viewYear);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-32"
    >
      {/* タイトル */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><Package className="w-5 h-5" /></div>
            <div>
              <h2 className="text-sm font-black">減価償却の管理</h2>
              <p className="text-[10px] font-bold text-orange-100 uppercase tracking-tight">Fixed Asset Depreciation</p>
            </div>
          </div>
          <button onClick={() => setIsFormOpen(true)}
            className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all p-2.5 rounded-xl">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 年度選択 + 合計 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))}
            className="w-full p-3 pr-10 rounded-2xl bg-white border border-slate-100 text-slate-800 font-black text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none">
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}年の償却額</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="bg-orange-500 text-white rounded-2xl px-4 py-3 shrink-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-200">合計償却費</p>
          <p className="text-lg font-black">¥{totalThisYear.toLocaleString()}</p>
        </div>
      </div>

      {loading && (
        <div className="py-10 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
        </div>
      )}

      {!loading && assets.length === 0 && (
        <div className="py-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-300">固定資産が登録されていません</p>
          <p className="text-xs text-slate-200 mt-1">右上の＋から追加してください</p>
        </div>
      )}

      {/* 資産リスト */}
      {!loading && assets.map(asset => {
        const depr    = calcDepreciation(asset, viewYear);
        const acqYear = Number(asset.acquisitionDate.slice(0, 4));
        const elapsed = viewYear - acqYear + 1;
        const isDone  = elapsed > asset.usefulLife || elapsed <= 0;
        return (
          <div key={asset.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-slate-800 text-sm">{asset.name}</p>
                  {asset.isUsed && <span className="text-[9px] bg-amber-100 text-amber-600 font-black px-1.5 py-0.5 rounded-full">中古</span>}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  取得: {asset.acquisitionDate}　¥{asset.acquisitionCost.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {METHOD_LABELS[asset.method]}・耐用{asset.usefulLife}年
                  {asset.isUsed && asset.legalUsefulLife && (
                    <span className="text-slate-300">（法定{asset.legalUsefulLife}年）</span>
                  )}
                </p>
              </div>
              <button onClick={() => removeAsset(asset.id)}
                className="p-2 text-slate-300 hover:text-red-400 active:scale-90 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className={`rounded-xl p-3 flex items-center justify-between ${isDone ? "bg-slate-50" : "bg-orange-50"}`}>
              <span className="text-xs font-bold text-slate-500">
                {viewYear}年の償却額
                {isDone && <span className="ml-1 text-slate-300">（償却完了）</span>}
              </span>
              <span className={`font-black text-base ${isDone ? "text-slate-300" : "text-orange-600"}`}>
                ¥{depr.toLocaleString()}
              </span>
            </div>

            {!isDone && elapsed > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-[9px] font-bold text-slate-300 mb-1">
                  <span>{elapsed}年目 / {asset.usefulLife}年</span>
                  <span>{Math.round(elapsed / asset.usefulLife * 100)}%完了</span>
                </div>
                <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(elapsed / asset.usefulLife * 100, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-700 leading-relaxed">
          ⚠️ 中古資産の耐用年数は国税庁の簡便法で算出しています。実際の申告には税理士にご確認ください。
        </p>
      </div>

      {/* 固定資産登録ドロワー */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.12)]"
              style={{ maxHeight: "92dvh" }}
            >
              <div className="flex justify-center pt-3 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h3 className="font-black text-slate-800">固定資産を登録</h3>
                <button onClick={() => setIsFormOpen(false)}
                  className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 active:scale-90 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="px-6 pt-5 pb-12">
                  <FixedAssetForm
                    onSaved={() => setIsFormOpen(false)}
                    onCancel={() => setIsFormOpen(false)}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}