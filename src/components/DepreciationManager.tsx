// src/components/DepreciationManager.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Trash2, X, CheckCircle2, ChevronDown } from "lucide-react";
import {
  useDepreciation, calcDepreciation, calcTotalDepreciation,
  calcUsedAssetLife, ASSET_PRESETS, ASSET_CATEGORIES,
  type DepreciationMethod,
} from "@/hooks/useDepreciation";

const METHOD_LABELS: Record<DepreciationMethod, string> = {
  straight:  "定額法（毎年同じ額）",
  declining: "定率法（残存価額×定率）",
  lump:      "一括償却（30万円未満・3年均等）",
};

export function DepreciationManager() {
  const { assets, loading, addAsset, removeAsset } = useDepreciation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear]     = useState(currentYear);

  // ── フォームの状態 ──
  const [name, setName]                       = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ASSET_CATEGORIES[0]);
  const [selectedPreset, setSelectedPreset]   = useState(ASSET_PRESETS[0].label);
  const [usefulLife, setUsefulLife]           = useState(ASSET_PRESETS[0].years);
  const [method, setMethod]                   = useState<DepreciationMethod>(ASSET_PRESETS[0].defaultMethod);
  const [isUsed, setIsUsed]                   = useState(false);
  const [legalYears, setLegalYears]           = useState(ASSET_PRESETS[0].years);
  const [elapsedYears, setElapsedYears]       = useState(1);

  // カテゴリ内のプリセット
  const presetsInCategory = ASSET_PRESETS.filter(p => p.category === selectedCategory);

  // カテゴリ変更時 → そのカテゴリの最初のプリセットを選択
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const first = ASSET_PRESETS.find(p => p.category === cat);
    if (first) {
      setSelectedPreset(first.label);
      setLegalYears(first.years);
      setMethod(first.defaultMethod);
      if (!isUsed) setUsefulLife(first.years);
    }
  };

  // プリセット変更時 → 耐用年数・償却方法を同期
  const handlePresetChange = (label: string) => {
    const preset = ASSET_PRESETS.find(p => p.label === label);
    if (!preset) return;
    setSelectedPreset(label);
    setLegalYears(preset.years);
    setMethod(preset.defaultMethod);
    if (!isUsed) {
      setUsefulLife(preset.years);
    } else {
      setUsefulLife(calcUsedAssetLife(preset.years, elapsedYears));
    }
  };

  // 中古フラグ・経過年数変更時 → 耐用年数を再計算
  useEffect(() => {
    if (isUsed) {
      setUsefulLife(calcUsedAssetLife(legalYears, elapsedYears));
    } else {
      setUsefulLife(legalYears);
    }
  }, [isUsed, legalYears, elapsedYears]);

  const cost = Number(acquisitionCost);

  const resetForm = () => {
    setName(""); setAcquisitionDate(""); setAcquisitionCost("");
    setSelectedCategory(ASSET_CATEGORIES[0]);
    const first = ASSET_PRESETS[0];
    setSelectedPreset(first.label);
    setLegalYears(first.years);
    setUsefulLife(first.years);
    setMethod(first.defaultMethod);
    setIsUsed(false); setElapsedYears(1);
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !acquisitionDate || !acquisitionCost) return;

    await addAsset({
      name, acquisitionDate,
      acquisitionCost: cost,
      usefulLife,
      method: cost < 300000 && method === "lump" ? "lump" : method,
      isUsed,
      legalUsefulLife: isUsed ? legalYears : undefined,
      elapsedYears: isUsed ? elapsedYears : undefined,
    });

    setSubmitted(true);
    setTimeout(() => { setIsFormOpen(false); resetForm(); }, 800);
  };

  const totalThisYear = calcTotalDepreciation(assets, viewYear);

  const previewAmount = name && acquisitionDate && acquisitionCost
    ? calcDepreciation({ name, acquisitionDate, acquisitionCost: cost, usefulLife, method, isUsed, legalUsefulLife: isUsed ? legalYears : undefined, elapsedYears: isUsed ? elapsedYears : undefined }, currentYear)
    : 0;

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
          <button onClick={() => { setIsFormOpen(true); resetForm(); }}
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
          <p className="text-xs text-slate-200 mt-1">右上の＋ボタンから追加してください</p>
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
                  {asset.isUsed && (
                    <span className="text-[9px] bg-amber-100 text-amber-600 font-black px-1.5 py-0.5 rounded-full">中古</span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  取得: {asset.acquisitionDate}　¥{asset.acquisitionCost.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {METHOD_LABELS[asset.method]}・耐用{asset.usefulLife}年
                  {asset.isUsed && asset.legalUsefulLife && (
                    <span className="text-slate-300">（法定{asset.legalUsefulLife}年・{asset.elapsedYears}年落ち）</span>
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
                {viewYear}年の償却額{isDone && <span className="ml-1 text-slate-300">（償却完了）</span>}
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
          ⚠️ 計算結果は概算です。中古資産の耐用年数は国税庁の簡便法で算出しています。
          実際の申告には税理士にご確認ください。
        </p>
      </div>

      {/* ドロワー */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsFormOpen(false); resetForm(); }}
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
                <button onClick={() => { setIsFormOpen(false); resetForm(); }}
                  className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 active:scale-90 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <form onSubmit={handleSubmit} className="px-6 pt-5 pb-12 space-y-5">

                  {/* 資産名 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">資産名</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="例: MacBook Pro M4、トヨタ プリウス 等"
                      required
                      className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>

                  {/* 資産カテゴリ */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">資産のカテゴリ</label>
                    <div className="flex flex-wrap gap-2">
                      {ASSET_CATEGORIES.map(cat => (
                        <button key={cat} type="button" onClick={() => handleCategoryChange(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                            selectedCategory === cat
                              ? "bg-orange-500 text-white shadow-sm"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 資産の種類（プリセット） */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">資産の種類</label>
                    <div className="relative">
                      <select value={selectedPreset} onChange={e => handlePresetChange(e.target.value)}
                        className="w-full p-3 pr-10 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none">
                        {presetsInCategory.map(p => (
                          <option key={p.label} value={p.label}>{p.label}（法定{p.years}年）</option>
                        ))}
                        <option value="custom">カスタム（手動で耐用年数を入力）</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* 中古フラグ */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-700">中古で購入した</p>
                        <p className="text-[10px] font-bold text-slate-400">耐用年数を自動計算します</p>
                      </div>
                      <button type="button" onClick={() => setIsUsed(v => !v)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isUsed ? "bg-orange-500" : "bg-slate-200"}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${isUsed ? "translate-x-7" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {isUsed && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        {/* 法定耐用年数（カスタム入力用） */}
                        {selectedPreset === "custom" && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">法定耐用年数</label>
                            <input type="number" value={legalYears} onChange={e => setLegalYears(Number(e.target.value))}
                              min={2} max={100} required
                              className="w-full p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" />
                          </div>
                        )}

                        {/* 経過年数 */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">
                            経過年数（前オーナーが何年使ったか）
                          </label>
                          <div className="flex items-center gap-3">
                            <input type="range" min={1} max={Math.max(legalYears, 2)} value={elapsedYears}
                              onChange={e => setElapsedYears(Number(e.target.value))}
                              className="flex-1 accent-orange-500" />
                            <span className="text-base font-black text-orange-600 w-12 text-right">
                              {elapsedYears}年
                            </span>
                          </div>
                        </div>

                        {/* 計算結果プレビュー */}
                        <div className="bg-orange-50 rounded-xl p-3 space-y-1">
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">中古耐用年数（計算結果）</p>
                          <p className="text-lg font-black text-orange-600">
                            {usefulLife} 年
                          </p>
                          <p className="text-[10px] font-bold text-orange-400">
                            ({legalYears}年 − {elapsedYears}年) + {elapsedYears}年 × 0.2 = {calcUsedAssetLife(legalYears, elapsedYears)}年
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* カスタム耐用年数（新品・カスタム時） */}
                  {selectedPreset === "custom" && !isUsed && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">耐用年数（年）</label>
                      <input type="number" value={usefulLife} onChange={e => setUsefulLife(Number(e.target.value))}
                        min={2} max={100} required
                        className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  )}

                  {/* 取得日 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">取得日（購入日）</label>
                    <input type="date" value={acquisitionDate} onChange={e => setAcquisitionDate(e.target.value)}
                      required
                      className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>

                  {/* 取得価額 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">取得価額（購入金額）</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">¥</span>
                      <input type="number" inputMode="numeric" value={acquisitionCost}
                        onChange={e => setAcquisitionCost(e.target.value)}
                        placeholder="0" required
                        className="w-full pl-7 p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    {cost > 0 && cost < 300000 && (
                      <p className="text-[10px] font-bold text-blue-500">
                        💡 30万円未満のため一括償却（3年均等）が利用できます
                      </p>
                    )}
                    {cost >= 300000 && method === "lump" && (
                      <p className="text-[10px] font-bold text-red-400">
                        ⚠️ 30万円以上は一括償却を選択できません
                      </p>
                    )}
                  </div>

                  {/* 償却方法 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">償却方法</label>
                    {(["straight", "declining", "lump"] as DepreciationMethod[]).map(m => {
                      const disabled = m === "lump" && cost >= 300000;
                      return (
                        <button key={m} type="button"
                          onClick={() => !disabled && setMethod(m)}
                          disabled={disabled}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-95 ${
                            method === m && !disabled
                              ? "border-orange-400 bg-orange-50"
                              : disabled
                              ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed"
                              : "border-slate-100 bg-slate-50"
                          }`}>
                          <p className={`text-xs font-black ${method === m && !disabled ? "text-orange-700" : "text-slate-600"}`}>
                            {METHOD_LABELS[m]}
                          </p>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === m && !disabled ? "border-orange-500 bg-orange-500" : "border-slate-300"}`}>
                            {method === m && !disabled && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 試算プレビュー */}
                  {name && acquisitionDate && acquisitionCost && (
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">今年の償却額（試算）</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">{currentYear}年</span>
                        <span className="text-xl font-black text-orange-600">¥{previewAmount.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">
                        耐用年数: {usefulLife}年　償却方法: {METHOD_LABELS[method]}
                      </p>
                    </div>
                  )}

                  {/* 登録ボタン */}
                  <button type="submit" disabled={!name || !acquisitionDate || !acquisitionCost}
                    className={`w-full py-5 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
                      ${(!name || !acquisitionDate || !acquisitionCost)
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : submitted
                        ? "bg-green-500 shadow-lg shadow-green-200"
                        : "bg-orange-500 shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-95"
                      }`}>
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