// src/components/FixedAssetForm.tsx
// 固定資産登録フォーム（DepreciationManager・ReceiptInputから共用）
import { useState, useEffect } from "react";
import { CheckCircle2, Plus, ChevronDown } from "lucide-react";
import {
  useDepreciation, calcDepreciation, calcUsedAssetLife, calcElapsedYears,
  ASSET_PRESETS, ASSET_CATEGORIES,
  type DepreciationMethod,
} from "@/hooks/useDepreciation";

const METHOD_LABELS: Record<DepreciationMethod, string> = {
  straight:  "定額法（毎年同じ額）",
  declining: "定率法（残存価額×定率）",
  lump:      "一括償却（30万円未満・3年均等）",
};

interface FixedAssetFormProps {
  // 外部から初期値を渡せる（ReceiptInputのAI解析結果を引き継ぐ場合）
  initialName?: string;
  initialCost?: string;
  initialDate?: string;
  onSaved?: () => void;   // 保存完了コールバック
  onCancel?: () => void;  // キャンセルコールバック
  compact?: boolean;      // コンパクトモード（ReceiptInput内埋め込み時）
}

export function FixedAssetForm({
  initialName = "",
  initialCost = "",
  initialDate = "",
  onSaved,
  onCancel,
  compact = false,
}: FixedAssetFormProps) {
  const { addAsset } = useDepreciation();
  const currentYear  = new Date().getFullYear();

  const [submitted, setSubmitted] = useState(false);
  const [name, setName]           = useState(initialName);
  const [acquisitionDate, setAcquisitionDate] = useState(initialDate);
  const [acquisitionCost, setAcquisitionCost] = useState(initialCost);
  const [selectedCategory, setSelectedCategory] = useState(ASSET_CATEGORIES[0]);
  const [selectedPreset, setSelectedPreset]     = useState(ASSET_PRESETS[0].label);
  const [usefulLife, setUsefulLife]             = useState(ASSET_PRESETS[0].years);
  const [legalYears, setLegalYears]             = useState(ASSET_PRESETS[0].years);
  const [method, setMethod]                     = useState<DepreciationMethod>(ASSET_PRESETS[0].defaultMethod);
  const [isUsed, setIsUsed]                     = useState(false);
  const [firstRegDate, setFirstRegDate]         = useState(""); // 初度登録日

  const presetsInCategory = ASSET_PRESETS.filter(p => p.category === selectedCategory);
  const cost = Number(acquisitionCost);

  // カテゴリ変更
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const first = ASSET_PRESETS.find(p => p.category === cat);
    if (!first) return;
    setSelectedPreset(first.label);
    setLegalYears(first.years);
    setMethod(first.defaultMethod);
    if (!isUsed) setUsefulLife(first.years);
  };

  // プリセット変更
  const handlePresetChange = (label: string) => {
    const preset = ASSET_PRESETS.find(p => p.label === label);
    if (!preset) return;
    setSelectedPreset(label);
    setLegalYears(preset.years);
    setMethod(preset.defaultMethod);
    if (!isUsed) setUsefulLife(preset.years);
  };

  // 中古フラグ・初度登録日・取得日変更時 → 耐用年数を再計算
  useEffect(() => {
    if (isUsed && firstRegDate && acquisitionDate) {
      const elapsed = calcElapsedYears(firstRegDate, acquisitionDate);
      setUsefulLife(calcUsedAssetLife(legalYears, elapsed));
    } else if (!isUsed) {
      setUsefulLife(legalYears);
    }
  }, [isUsed, firstRegDate, acquisitionDate, legalYears]);

  // 経過年数・計算式の表示用
  const elapsedYears = isUsed && firstRegDate && acquisitionDate
    ? calcElapsedYears(firstRegDate, acquisitionDate)
    : 0;

  // 試算
  const previewAmount = name && acquisitionDate && acquisitionCost
    ? calcDepreciation({ name, acquisitionDate, acquisitionCost: cost, usefulLife, method, isUsed, legalUsefulLife: isUsed ? legalYears : undefined, firstRegistrationDate: isUsed ? firstRegDate : undefined }, currentYear)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !acquisitionDate || !acquisitionCost) return;
    await addAsset({
      name, acquisitionDate,
      acquisitionCost: cost,
      usefulLife,
      method: cost < 300000 && method === "lump" ? "lump" : method,
      isUsed,
      legalUsefulLife:      isUsed ? legalYears   : undefined,
      firstRegistrationDate: isUsed ? firstRegDate : undefined,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onSaved?.();
    }, 800);
  };

  const labelClass = "text-[10px] font-black text-slate-400 uppercase";
  const inputClass = `w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* 資産名 */}
      <div className="space-y-1">
        <label className={labelClass}>資産名</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="例: MacBook Pro M4、トヨタ プリウス 等"
          required className={inputClass} />
      </div>

      {/* カテゴリ */}
      <div className="space-y-2">
        <label className={labelClass}>資産のカテゴリ</label>
        <div className="flex flex-wrap gap-2">
          {ASSET_CATEGORIES.map(cat => (
            <button key={cat} type="button" onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                selectedCategory === cat
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 資産の種類 */}
      <div className="space-y-1">
        <label className={labelClass}>資産の種類（耐用年数）</label>
        <div className="relative">
          <select value={selectedPreset} onChange={e => handlePresetChange(e.target.value)}
            className={inputClass + " pr-10 appearance-none"}>
            {presetsInCategory.map(p => (
              <option key={p.label} value={p.label}>{p.label}（法定{p.years}年）</option>
            ))}
            <option value="custom">カスタム（手動入力）</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* カスタム耐用年数（新品） */}
      {selectedPreset === "custom" && !isUsed && (
        <div className="space-y-1">
          <label className={labelClass}>耐用年数（年）</label>
          <input type="number" value={usefulLife} onChange={e => setUsefulLife(Number(e.target.value))}
            min={2} max={100} required className={inputClass} />
        </div>
      )}

      {/* 中古フラグ */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-700">中古で購入した</p>
            <p className="text-[10px] font-bold text-slate-400">初度登録日から耐用年数を自動計算</p>
          </div>
          <button type="button" onClick={() => setIsUsed(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isUsed ? "bg-orange-500" : "bg-slate-200"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${isUsed ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

        {isUsed && (
          <div className="space-y-3 pt-3 border-t border-amber-100">
            {/* 初度登録日 */}
            <div className="space-y-1">
              <label className={labelClass}>
                初度登録日（車検証・購入明細に記載）
              </label>
              <input type="date" value={firstRegDate} onChange={e => setFirstRegDate(e.target.value)}
                required={isUsed}
                className={inputClass + " bg-white"} />
              <p className="text-[10px] font-bold text-slate-400">
                ※ 車の場合は車検証の「初度登録年月」を入力してください
              </p>
            </div>

            {/* 法定耐用年数（カスタム時） */}
            {selectedPreset === "custom" && (
              <div className="space-y-1">
                <label className={labelClass}>法定耐用年数</label>
                <input type="number" value={legalYears} onChange={e => setLegalYears(Number(e.target.value))}
                  min={2} max={100} required className={inputClass + " bg-white"} />
              </div>
            )}

            {/* 計算結果プレビュー */}
            {firstRegDate && acquisitionDate && (
              <div className="bg-white rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">中古耐用年数（計算結果）</p>
                <p className="text-xl font-black text-orange-600">{usefulLife} 年</p>
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                  経過年数: {elapsedYears}年
                  <br />
                  ({legalYears} − {elapsedYears}) + {elapsedYears} × 0.2 = {calcUsedAssetLife(legalYears, elapsedYears)}年
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 取得日 */}
      <div className="space-y-1">
        <label className={labelClass}>取得日（自分が購入した日）</label>
        <input type="date" value={acquisitionDate} onChange={e => setAcquisitionDate(e.target.value)}
          required className={inputClass} />
      </div>

      {/* 取得価額 */}
      <div className="space-y-1">
        <label className={labelClass}>取得価額（購入金額）</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">¥</span>
          <input type="number" inputMode="numeric" value={acquisitionCost}
            onChange={e => setAcquisitionCost(e.target.value)}
            placeholder="0" required
            className={inputClass + " pl-7"} />
        </div>
        {cost > 0 && cost < 300000 && (
          <p className="text-[10px] font-bold text-blue-500">💡 30万円未満のため一括償却（3年均等）が使えます</p>
        )}
        {cost >= 300000 && method === "lump" && (
          <p className="text-[10px] font-bold text-red-400">⚠️ 30万円以上は一括償却を選択できません</p>
        )}
      </div>

      {/* 償却方法 */}
      <div className="space-y-2">
        <label className={labelClass}>償却方法</label>
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
                  : "border-slate-100 bg-slate-50 hover:border-slate-200"
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
        <div className={`rounded-2xl p-4 ${compact ? "bg-orange-50" : "bg-slate-50"}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">今年の償却額（試算）</p>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">{currentYear}年</span>
            <span className="text-xl font-black text-orange-600">¥{previewAmount.toLocaleString()}</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-1">
            耐用年数: {usefulLife}年　{METHOD_LABELS[method]}
          </p>
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all">
            キャンセル
          </button>
        )}
        <button type="submit"
          disabled={!name || !acquisitionDate || !acquisitionCost || (isUsed && !firstRegDate)}
          className={`flex-1 py-4 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
            ${(!name || !acquisitionDate || !acquisitionCost || (isUsed && !firstRegDate))
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : submitted
              ? "bg-green-500 shadow-lg shadow-green-200"
              : "bg-orange-500 shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-95"
            }`}>
          {submitted
            ? <><CheckCircle2 className="w-5 h-5" /> 登録しました！</>
            : <><Plus className="w-4 h-4" /> 固定資産を登録</>
          }
        </button>
      </div>
    </form>
  );
}