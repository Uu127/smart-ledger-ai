// src/components/DepreciationManager.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Trash2, X, CheckCircle2, ChevronDown } from "lucide-react";
import {
  useDepreciation, calcDepreciation, calcTotalDepreciation,
  USEFUL_LIFE_PRESETS,
  type DepreciationMethod,
} from "@/hooks/useDepreciation";

const METHOD_LABELS: Record<DepreciationMethod, string> = {
  straight:  "定額法（毎年同額）",
  declining: "定率法（残存価額×定率）",
  lump:      "一括償却（30万円未満・3年均等）",
};

export function DepreciationManager() {
  const { assets, loading, addAsset, removeAsset } = useDepreciation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(currentYear);

  // フォームの状態
  const [name, setName]                     = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [usefulLife, setUsefulLife]         = useState(4);
  const [method, setMethod]                 = useState<DepreciationMethod>("straight");

  const resetForm = () => {
    setName(""); setAcquisitionDate(""); setAcquisitionCost("");
    setUsefulLife(4); setMethod("straight"); setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !acquisitionDate || !acquisitionCost) return;

    // 30万円未満は一括償却を自動推薦
    const cost = Number(acquisitionCost);

    await addAsset({
      name,
      acquisitionDate,
      acquisitionCost: cost,
      usefulLife,
      method: cost < 300000 && method === "lump" ? "lump" : method,
    });

    setSubmitted(true);
    setTimeout(() => {
      setIsFormOpen(false);
      resetForm();
    }, 800);
  };

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
            <div className="bg-white/20 p-2 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black">減価償却の管理</h2>
              <p className="text-[10px] font-bold text-orange-100 uppercase tracking-tight">Fixed Asset Depreciation</p>
            </div>
          </div>
          <button
            onClick={() => { setIsFormOpen(true); resetForm(); }}
            className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all p-2.5 rounded-xl"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 年度選択 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <select
            value={viewYear}
            onChange={e => setViewYear(Number(e.target.value))}
            className="w-full p-3 pr-10 rounded-2xl bg-white border border-slate-100 text-slate-800 font-black text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}年の償却額</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {/* 年間合計 */}
        <div className="bg-orange-500 text-white rounded-2xl px-4 py-3 shrink-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-200">合計償却費</p>
          <p className="text-lg font-black">¥{totalThisYear.toLocaleString()}</p>
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="py-10 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
        </div>
      )}

      {/* 資産なし */}
      {!loading && assets.length === 0 && (
        <div className="py-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-300">固定資産が登録されていません</p>
          <p className="text-xs text-slate-200 mt-1">右上の＋ボタンから追加してください</p>
        </div>
      )}

      {/* 資産リスト */}
      {!loading && assets.length > 0 && (
        <div className="space-y-3">
          {assets.map(asset => {
            const depr = calcDepreciation(asset, viewYear);
            const acqYear = Number(asset.acquisitionDate.slice(0, 4));
            const elapsed = viewYear - acqYear + 1;
            const isDone  = elapsed > asset.usefulLife || elapsed <= 0;

            return (
              <div key={asset.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-black text-slate-800 text-sm">{asset.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      取得: {asset.acquisitionDate}　¥{asset.acquisitionCost.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {METHOD_LABELS[asset.method]}・耐用{asset.usefulLife}年
                    </p>
                  </div>
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="p-2 text-slate-300 hover:text-red-400 active:scale-90 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 償却額表示 */}
                <div className={`rounded-xl p-3 flex items-center justify-between ${
                  isDone ? "bg-slate-50" : "bg-orange-50"
                }`}>
                  <span className="text-xs font-bold text-slate-500">
                    {viewYear}年の償却額
                    {isDone && <span className="ml-1 text-slate-300">（償却完了）</span>}
                  </span>
                  <span className={`font-black text-base ${isDone ? "text-slate-300" : "text-orange-600"}`}>
                    ¥{depr.toLocaleString()}
                  </span>
                </div>

                {/* 進捗バー */}
                {!isDone && elapsed > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[9px] font-bold text-slate-300 mb-1">
                      <span>{elapsed}年目 / {asset.usefulLife}年</span>
                      <span>{Math.round(elapsed / asset.usefulLife * 100)}%完了</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(elapsed / asset.usefulLife * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 注意書き */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-700 leading-relaxed">
          ⚠️ 計算結果は概算です。実際の申告には税務署の耐用年数表と照合し、
          必要に応じて税理士にご確認ください。申告書CSVの「減価償却費」欄に自動反映されます。
        </p>
      </div>

      {/* 資産追加フォーム（ドロワー） */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsFormOpen(false); resetForm(); }}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.12)]"
              style={{ maxHeight: "90dvh" }}
            >
              <div className="flex justify-center pt-3 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h3 className="font-black text-slate-800">固定資産を登録</h3>
                <button
                  onClick={() => { setIsFormOpen(false); resetForm(); }}
                  className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 active:scale-90 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <form onSubmit={handleSubmit} className="px-6 pt-5 pb-12 space-y-5">

                  {/* 資産名 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">資産名</label>
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="例: MacBook Pro、デスク等"
                      required
                      className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* 取得日 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">取得日</label>
                    <input
                      type="date" value={acquisitionDate} onChange={e => setAcquisitionDate(e.target.value)}
                      required
                      className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* 取得価額 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">取得価額（円）</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">¥</span>
                      <input
                        type="number" inputMode="numeric" value={acquisitionCost}
                        onChange={e => setAcquisitionCost(e.target.value)}
                        placeholder="0" required
                        className="w-full pl-7 pr-4 p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                    {Number(acquisitionCost) > 0 && Number(acquisitionCost) < 300000 && (
                      <p className="text-[10px] font-bold text-blue-500">
                        💡 30万円未満のため一括償却（3年均等）が利用できます
                      </p>
                    )}
                  </div>

                  {/* 耐用年数プリセット */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">資産の種類（耐用年数）</label>
                    <select
                      value={usefulLife}
                      onChange={e => setUsefulLife(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {USEFUL_LIFE_PRESETS.map(p => (
                        <option key={p.label} value={p.years}>{p.label}（{p.years}年）</option>
                      ))}
                      <option value={3}>その他（3年）</option>
                      <option value={5}>その他（5年）</option>
                      <option value={10}>その他（10年）</option>
                      <option value={15}>その他（15年）</option>
                      <option value={20}>その他（20年）</option>
                    </select>
                  </div>

                  {/* 償却方法 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">償却方法</label>
                    {(["straight", "declining", "lump"] as DepreciationMethod[]).map(m => (
                      <button
                        key={m} type="button"
                        onClick={() => setMethod(m)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-95 ${
                          method === m ? "border-orange-400 bg-orange-50" : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <div className="text-left">
                          <p className={`text-xs font-black ${method === m ? "text-orange-700" : "text-slate-600"}`}>
                            {METHOD_LABELS[m]}
                          </p>
                          {m === "lump" && Number(acquisitionCost) >= 300000 && (
                            <p className="text-[9px] text-red-400 font-bold">30万円以上には適用不可</p>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          method === m ? "border-orange-500 bg-orange-500" : "border-slate-300"
                        }`}>
                          {method === m && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* 試算プレビュー */}
                  {name && acquisitionDate && acquisitionCost && (
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">今年の償却額（試算）</p>
                      <div className="flex justify-between">
                        <span className="text-sm font-bold text-slate-600">{currentYear}年</span>
                        <span className="text-sm font-black text-orange-600">
                          ¥{calcDepreciation({
                            name, acquisitionDate, acquisitionCost: Number(acquisitionCost),
                            usefulLife, method
                          }, currentYear).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 登録ボタン */}
                  <button
                    type="submit"
                    disabled={!name || !acquisitionDate || !acquisitionCost}
                    className={`w-full py-5 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
                      ${(!name || !acquisitionDate || !acquisitionCost)
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : submitted
                        ? "bg-green-500 shadow-lg shadow-green-200"
                        : "bg-orange-500 shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-95"
                      }`}
                  >
                    {submitted
                      ? <><CheckCircle2 className="w-6 h-6" /> 登録しました！</>
                      : <><Plus className="w-5 h-5" /> 固定資産を登録する</>
                    }
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}