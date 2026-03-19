// src/components/ProRateSettings.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Home, CheckCircle2, Info } from "lucide-react";
import { useProRate } from "@/hooks/useProRate";
import { DEBIT_ACCOUNT_LABELS } from "@/constants/accounts";

// 按分対象になりやすい科目のみ表示
const PRORATEABLE_ACCOUNTS = [
  "地代家賃", "水道光熱費", "通信費", "修繕費", "損害保険料",
] as const;

export function ProRateSettings() {
  const { settings, loading, saveSettings } = useProRate();
  const [saved, setSaved] = useState(false);

  const [enabled, setEnabled]               = useState(settings.enabled);
  const [ratio, setRatio]                   = useState(settings.ratio);
  const [targetAccounts, setTargetAccounts] = useState<string[]>(settings.targetAccounts);

  // settings が読み込まれたら初期値を同期
  const [initialized, setInitialized] = useState(false);
  if (!loading && !initialized) {
    setEnabled(settings.enabled);
    setRatio(settings.ratio);
    setTargetAccounts(settings.targetAccounts);
    setInitialized(true);
  }

  const toggleAccount = (account: string) => {
    setTargetAccounts(prev =>
      prev.includes(account) ? prev.filter(a => a !== account) : [...prev, account]
    );
  };

  const handleSave = async () => {
    await saveSettings({ enabled, ratio, targetAccounts });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-32"
    >
      {/* タイトル */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black">家事按分の設定</h2>
            <p className="text-[10px] font-bold text-purple-100 uppercase tracking-tight">Home Office Pro-Rate</p>
          </div>
        </div>
      </div>

      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs font-bold text-blue-700 leading-relaxed">
          自宅兼事務所の場合、家賃・光熱費などを事業使用割合で按分して経費計上できます。
          申告書CSV出力時に自動的に按分後の金額が反映されます。
        </p>
      </div>

      {/* 有効/無効 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-slate-800 text-sm">家事按分を有効にする</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              有効にすると申告書CSV出力時に按分計算されます
            </p>
          </div>
          <button
            onClick={() => setEnabled(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
              enabled ? "bg-purple-500" : "bg-slate-200"
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
              enabled ? "translate-x-7" : "translate-x-1"
            }`} />
          </button>
        </div>
      </div>

      {enabled && (
        <>
          {/* 按分率スライダー */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-4">
            <div className="flex justify-between items-center">
              <p className="font-black text-slate-800 text-sm">事業使用率</p>
              <div className="bg-purple-100 px-3 py-1 rounded-full">
                <span className="text-purple-700 font-black text-lg">{ratio}%</span>
              </div>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={ratio}
              onChange={(e) => setRatio(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-300">
              <span>0%（全て家事）</span>
              <span>100%（全て事業）</span>
            </div>

            {/* 按分例 */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">按分の例</p>
              {[
                { label: "家賃 10万円", base: 100000 },
                { label: "光熱費 2万円", base: 20000 },
              ].map(({ label, base }) => (
                <div key={label} className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-purple-600">
                    → 経費 ¥{Math.round(base * ratio / 100).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 按分対象科目 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-3">
            <p className="font-black text-slate-800 text-sm">按分対象の科目</p>
            <p className="text-[10px] font-bold text-slate-400">
              チェックした科目が申告書CSV出力時に按分されます
            </p>
            <div className="space-y-2">
              {PRORATEABLE_ACCOUNTS.map(account => (
                <button
                  key={account}
                  type="button"
                  onClick={() => toggleAccount(account)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-95 ${
                    targetAccounts.includes(account)
                      ? "border-purple-300 bg-purple-50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <span className={`text-sm font-bold ${
                    targetAccounts.includes(account) ? "text-purple-700" : "text-slate-500"
                  }`}>{account}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    targetAccounts.includes(account)
                      ? "border-purple-500 bg-purple-500"
                      : "border-slate-300"
                  }`}>
                    {targetAccounts.includes(account) && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        className={`w-full py-5 rounded-2xl font-black text-white transition-all duration-300 flex items-center justify-center gap-2
          ${saved
            ? "bg-green-500 shadow-lg shadow-green-200"
            : "bg-purple-500 shadow-lg shadow-purple-200 hover:bg-purple-600 active:scale-95"
          }`}
      >
        {saved ? <><CheckCircle2 className="w-5 h-5" /> 保存しました！</> : "設定を保存する"}
      </button>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-700 leading-relaxed">
          ⚠️ 按分率は税務署に説明できる合理的な根拠が必要です。
          部屋の面積比や使用時間比などで算出してください。
          不明な場合は税理士にご相談ください。
        </p>
      </div>
    </motion.div>
  );
}