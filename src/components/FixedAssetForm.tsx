// src/components/FixedAssetForm.tsx
import { useState, useEffect } from "react";
import { DateInput } from "@/components/DateInput";
import { CheckCircle2, Plus, ChevronDown, Save } from "lucide-react";
import {
  useDepreciation, calcDepreciation, calcUsedAssetLife, calcElapsedYears,
  ASSET_PRESETS, ASSET_CATEGORIES,
  type DepreciationMethod, type FixedAsset,
} from "@/hooks/useDepreciation";

const METHOD_LABELS: Record<DepreciationMethod, string> = {
  straight:  "定額法（毎年同じ額）",
  declining: "定率法（残存価額×定率）",
  lump:      "一括償却（30万円未満・3年均等）",
};

// 既存資産から最も近いプリセットを逆引き
function resolvePreset(asset: FixedAsset) {
  const targetLife = asset.isUsed
    ? (asset.legalUsefulLife ?? asset.usefulLife)
    : asset.usefulLife;
  const match = ASSET_PRESETS.find(p => p.years === targetLife && p.defaultMethod === asset.method)
             ?? ASSET_PRESETS.find(p => p.years === targetLife);
  return match
    ? { category: match.category, preset: match.label }
    : { category: ASSET_CATEGORIES[0], preset: "custom" as const };
}

interface FixedAssetFormProps {
  asset?: FixedAsset;        // 渡すと編集モード（渡さないと新規追加モード）
  initialName?: string;
  initialCost?: string;
  initialDate?: string;
  onSaved?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function FixedAssetForm({
  asset,
  initialName = "",
  initialCost = "",
  initialDate = "",
  onSaved,
  onCancel,
  compact = false,
}: FixedAssetFormProps) {
  const { addAsset, updateAsset } = useDepreciation();
  const currentYear = new Date().getFullYear();
  const isEdit = !!asset;

  // 編集モード時は資産データで初期化、新規時は外部初期値 or 空
  const initPreset = asset ? resolvePreset(asset) : null;

  const [submitted, setSubmitted] = useState(false);
  const [name, setName]           = useState(asset?.name ?? initialName);
  const [acquisitionDate, setAcquisitionDate] = useState(asset?.acquisitionDate ?? initialDate);
  const [acquisitionCost, setAcquisitionCost] = useState(asset ? String(asset.acquisitionCost) : initialCost);
  const [selectedCategory, setSelectedCategory] = useState(initPreset?.category ?? ASSET_CATEGORIES[0]);
  const [selectedPreset, setSelectedPreset]     = useState(initPreset?.preset   ?? ASSET_PRESETS[0].label);
  const [usefulLife, setUsefulLife]             = useState(asset?.usefulLife ?? ASSET_PRESETS[0].years);
  const [legalYears, setLegalYears]             = useState(asset?.legalUsefulLife ?? asset?.usefulLife ?? ASSET_PRESETS[0].years);
  const [method, setMethod]                     = useState<DepreciationMethod>(asset?.method ?? ASSET_PRESETS[0].defaultMethod);
  const [isUsed, setIsUsed]                     = useState(asset?.isUsed ?? false);
  const [firstRegDate, setFirstRegDate]         = useState(asset?.firstRegistrationDate ?? "");

  const presetsInCategory = ASSET_PRESETS.filter(p => p.category === selectedCategory);
  const cost = Number(acquisitionCost);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const first = ASSET_PRESETS.find(p => p.category === cat);
    if (!first) return;
    setSelectedPreset(first.label);
    setLegalYears(first.years);
    setMethod(first.defaultMethod);
    if (!isUsed) setUsefulLife(first.years);
  };

  const handlePresetChange = (label: string) => {
    const preset = ASSET_PRESETS.find(p => p.label === label);
    if (!preset) return;
    setSelectedPreset(label);
    setLegalYears(preset.years);
    setMethod(preset.defaultMethod);
    if (!isUsed) setUsefulLife(preset.years);
  };

  useEffect(() => {
    if (isUsed && firstRegDate && acquisitionDate) {
      const elapsed = calcElapsedYears(firstRegDate, acquisitionDate);
      setUsefulLife(calcUsedAssetLife(legalYears, elapsed));
    } else if (!isUsed) {
      setUsefulLife(legalYears);
    }
  }, [isUsed, firstRegDate, acquisitionDate, legalYears]);

  const elapsedYears = isUsed && firstRegDate && acquisitionDate
    ? calcElapsedYears(firstRegDate, acquisitionDate)
    : 0;

  const previewAmount = name && acquisitionDate && acquisitionCost
    ? calcDepreciation({ name, acquisitionDate, acquisitionCost: cost, usefulLife, method, isUsed, legalUsefulLife: isUsed ? legalYears : undefined, firstRegistrationDate: isUsed ? firstRegDate : undefined }, currentYear)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !acquisitionDate || !acquisitionCost) return;
    const data = {
      name, acquisitionDate,
      acquisitionCost: cost,
      usefulLife,
      method: cost < 300000 && method === "lump" ? "lump" : method,
      isUsed,
      legalUsefulLife:       isUsed ? legalYears   : undefined,
      firstRegistrationDate: isUsed ? firstRegDate : undefined,
    } satisfies Omit<FixedAsset, "id" | "createdAt">;

    if (isEdit) {
      await updateAsset(asset.id, data);
    } else {
      await addAsset(data);
    }
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); onSaved?.(); }, 800);
  };

  // ダークモード対応
  const labelClass = "text-[10px] font-black uppercase";
  const labelStyle = { color: "var(--text-muted)" };
  const inputClass = "w-full p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400";
  const inputStyle = { backgroundColor: "var(--bg-input)", color: "var(--text-main)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* 資産名 */}
      <div className="space-y-1">
        <label className={labelClass} style={labelStyle}>資産名</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="例: MacBook Pro M4、トヨタ プリウス 等"
          required className={inputClass} style={inputStyle} />
      </div>

      {/* カテゴリ */}
      <div className="space-y-2">
        <label className={labelClass} style={labelStyle}>資産のカテゴリ</label>
        <div className="flex flex-wrap gap-2">
          {ASSET_CATEGORIES.map(cat => (
            <button key={cat} type="button" onClick={() => handleCategoryChange(cat)}
              className="px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95"
              style={selectedCategory === cat
                ? { backgroundColor: "#f97316", color: "#fff" }
                : { backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 資産の種類 */}
      <div className="space-y-1">
        <label className={labelClass} style={labelStyle}>資産の種類（耐用年数）</label>
        <div className="relative">
          <select value={selectedPreset} onChange={e => handlePresetChange(e.target.value)}
            className={inputClass + " pr-10 appearance-none"} style={inputStyle}>
            {presetsInCategory.map(p => (
              <option key={p.label} value={p.label}>{p.label}（法定{p.years}年）</option>
            ))}
            <option value="custom">カスタム（手動入力）</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      {/* カスタム耐用年数（新品） */}
      {(selectedPreset === "custom" || !presetsInCategory.some(p => p.label === selectedPreset)) && !isUsed && (
        <div className="space-y-1">
          <label className={labelClass} style={labelStyle}>耐用年数（年）</label>
          <input type="number" value={usefulLife} onChange={e => setUsefulLife(Number(e.target.value))}
            min={2} max={100} required className={inputClass} style={inputStyle} />
        </div>
      )}

      {/* 中古フラグ */}
      <div className="rounded-2xl p-4 space-y-4 border"
        style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black" style={{ color: "var(--text-main)" }}>中古で購入した</p>
            <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>初度登録日から耐用年数を自動計算</p>
          </div>
          <button type="button" onClick={() => setIsUsed(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isUsed ? "bg-orange-500" : "bg-slate-200"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${isUsed ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

        {isUsed && (
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="space-y-1">
              <label className={labelClass} style={labelStyle}>
                初度登録日（車検証・購入明細に記載）
              </label>
              <DateInput value={firstRegDate} onChange={setFirstRegDate} required={isUsed}
                className="w-full focus-within:ring-2 focus-within:ring-orange-400" />
              <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                ※ 車の場合は車検証の「初度登録年月」を入力してください
              </p>
            </div>

            {(selectedPreset === "custom" || !presetsInCategory.some(p => p.label === selectedPreset)) && (
              <div className="space-y-1">
                <label className={labelClass} style={labelStyle}>法定耐用年数</label>
                <input type="number" value={legalYears} onChange={e => setLegalYears(Number(e.target.value))}
                  min={2} max={100} required className={inputClass} style={inputStyle} />
              </div>
            )}

            {firstRegDate && acquisitionDate && (
              <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: "var(--bg-card)" }}>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">中古耐用年数（計算結果）</p>
                <p className="text-xl font-black text-orange-600">{usefulLife} 年</p>
                <p className="text-[10px] font-bold leading-relaxed" style={{ color: "var(--text-muted)" }}>
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
        <label className={labelClass} style={labelStyle}>取得日（自分が購入した日）</label>
        <DateInput value={acquisitionDate} onChange={setAcquisitionDate} required
          className="w-full focus-within:ring-2 focus-within:ring-orange-400" />
      </div>

      {/* 取得価額 */}
      <div className="space-y-1">
        <label className={labelClass} style={labelStyle}>取得価額（購入金額）</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black" style={{ color: "var(--text-muted)" }}>¥</span>
          <input type="number" inputMode="numeric" value={acquisitionCost}
            onChange={e => setAcquisitionCost(e.target.value)}
            placeholder="0" required
            className={inputClass + " pl-7"} style={inputStyle} />
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
        <label className={labelClass} style={labelStyle}>償却方法</label>
        {(["straight", "declining", "lump"] as DepreciationMethod[]).map(m => {
          const disabled   = m === "lump" && cost >= 300000;
          const isSelected = method === m && !disabled;
          return (
            <button key={m} type="button"
              onClick={() => !disabled && setMethod(m)}
              disabled={disabled}
              className="w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-95"
              style={isSelected
                ? { borderColor: "#fb923c", backgroundColor: "#fff7ed" }
                : disabled
                ? { borderColor: "var(--border)", backgroundColor: "var(--bg-input)", opacity: 0.4, cursor: "not-allowed" }
                : { borderColor: "var(--border)", backgroundColor: "var(--bg-input)" }}>
              <p className="text-xs font-black"
                style={{ color: isSelected ? "#c2410c" : "var(--text-sub)" }}>
                {METHOD_LABELS[m]}
              </p>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: isSelected ? "#f97316" : "var(--border)", backgroundColor: isSelected ? "#f97316" : "transparent" }}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* 試算プレビュー */}
      {name && acquisitionDate && acquisitionCost && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: compact ? "#fff7ed" : "var(--bg-input)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>今年の償却額（試算）</p>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold" style={{ color: "var(--text-sub)" }}>{currentYear}年</span>
            <span className="text-xl font-black text-orange-600">¥{previewAmount.toLocaleString()}</span>
          </div>
          <p className="text-[10px] font-bold mt-1" style={{ color: "var(--text-muted)" }}>
            耐用年数: {usefulLife}年　{METHOD_LABELS[method]}
          </p>
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 py-4 rounded-2xl font-black active:scale-95 transition-all"
            style={{ backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }}>
            キャンセル
          </button>
        )}
        <button type="submit"
          disabled={!name || !acquisitionDate || !acquisitionCost || (isUsed && !firstRegDate)}
          className={`flex-1 py-4 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
            ${(!name || !acquisitionDate || !acquisitionCost || (isUsed && !firstRegDate))
              ? "cursor-not-allowed"
              : submitted
              ? "bg-green-500 shadow-lg shadow-green-200"
              : "bg-orange-500 shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-95"
            }`}
          style={(!name || !acquisitionDate || !acquisitionCost || (isUsed && !firstRegDate))
            ? { backgroundColor: "var(--bg-input)", color: "var(--text-muted)" }
            : {}}>
          {submitted ? (
            <><CheckCircle2 className="w-5 h-5" /> {isEdit ? "更新しました！" : "登録しました！"}</>
          ) : isEdit ? (
            <><Save className="w-4 h-4" /> 変更を保存</>
          ) : (
            <><Plus className="w-4 h-4" /> 固定資産を登録</>
          )}
        </button>
      </div>
    </form>
  );
}
