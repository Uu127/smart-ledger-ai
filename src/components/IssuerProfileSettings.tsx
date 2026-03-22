// src/components/IssuerProfileSettings.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, CreditCard, Info } from "lucide-react";
import { useIssuerProfile } from "@/hooks/useDocuments";
import type { IssuerProfile } from "@/types/document";

const DEFAULT_PROFILE: IssuerProfile = {
  name: "", address: "", phone: "", email: "",
  invoiceRegistrationNo: "",
  bankName: "", bankBranch: "", bankAccountType: "普通",
  bankAccountNo: "", bankAccountHolder: "",
};

export function IssuerProfileSettings() {
  const { profile, loading, saveProfile } = useIssuerProfile();
  const [form, setForm]   = useState<IssuerProfile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!loading && !initialized) {
      setForm({ ...DEFAULT_PROFILE, ...profile });
      setInitialized(true);
    }
  }, [loading, profile, initialized]);

  const set = (key: keyof IssuerProfile, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ダークモード対応スタイル
  const cardStyle  = { backgroundColor: "var(--bg-card)", borderColor: "var(--border)" };
  const inputStyle = { backgroundColor: "var(--bg-input)", color: "var(--text-main)" };
  const labelStyle = { color: "var(--text-muted)" };
  const textStyle  = { color: "var(--text-main)" };
  const inputClass = "w-full p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400";
  const labelClass = "text-[10px] font-black uppercase";

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-32">

      {/* タイトル */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl"><Building2 className="w-5 h-5" /></div>
          <div>
            <h2 className="text-sm font-black">自社情報の設定</h2>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-tight">Company Profile</p>
          </div>
        </div>
        <p className="text-[11px] text-emerald-200 font-bold mt-2">
          書類に自動で印字される発行者情報・振込先を設定します
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* 基本情報 */}
        <div className="rounded-2xl p-5 border shadow-sm space-y-4" style={cardStyle}>
          <h3 className="text-xs font-black uppercase tracking-widest" style={labelStyle}>基本情報</h3>

          <div className="space-y-1">
            <label className={labelClass} style={labelStyle}>屋号 / 会社名 *</label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="例: 山田太郎事務所" required
              className={inputClass} style={inputStyle} />
          </div>

          <div className="space-y-1">
            <label className={labelClass} style={labelStyle}>住所</label>
            <input type="text" value={form.address ?? ""} onChange={e => set("address", e.target.value)}
              placeholder="例: 大阪府大阪市〇〇区1-2-3"
              className={inputClass} style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass} style={labelStyle}>電話番号</label>
              <input type="tel" value={form.phone ?? ""} onChange={e => set("phone", e.target.value)}
                placeholder="090-0000-0000"
                className={inputClass} style={inputStyle} />
            </div>
            <div className="space-y-1">
              <label className={labelClass} style={labelStyle}>メール</label>
              <input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)}
                placeholder="example@mail.com"
                className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* インボイス */}
        <div className="rounded-2xl p-5 border shadow-sm space-y-3" style={cardStyle}>
          <h3 className="text-xs font-black uppercase tracking-widest" style={labelStyle}>インボイス登録番号</h3>
          <div className="rounded-xl p-3 flex gap-2" style={{ backgroundColor: "var(--bg-input)" }}>
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold" style={{ color: "var(--text-sub)" }}>
              適格請求書発行事業者に登録済みの場合のみ入力してください。未登録の場合は空白のままOKです。
            </p>
          </div>
          <div className="space-y-1">
            <label className={labelClass} style={labelStyle}>登録番号（T + 13桁）</label>
            <input type="text" value={form.invoiceRegistrationNo ?? ""} onChange={e => set("invoiceRegistrationNo", e.target.value)}
              placeholder="T1234567890123"
              className={inputClass} style={inputStyle} />
          </div>
        </div>

        {/* 振込先口座 */}
        <div className="rounded-2xl p-5 border shadow-sm space-y-4" style={cardStyle}>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-widest" style={labelStyle}>振込先口座</h3>
          </div>
          <p className="text-[10px] font-bold" style={labelStyle}>
            請求書・見積書の振込先欄に自動で印字されます
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass} style={labelStyle}>銀行名</label>
              <input type="text" value={form.bankName ?? ""} onChange={e => set("bankName", e.target.value)}
                placeholder="〇〇銀行"
                className={inputClass} style={inputStyle} />
            </div>
            <div className="space-y-1">
              <label className={labelClass} style={labelStyle}>支店名</label>
              <input type="text" value={form.bankBranch ?? ""} onChange={e => set("bankBranch", e.target.value)}
                placeholder="〇〇支店"
                className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass} style={labelStyle}>口座種別</label>
              <select
                value={form.bankAccountType ?? "普通"}
                onChange={e => set("bankAccountType", e.target.value)}
                className={inputClass} style={inputStyle}>
                <option value="普通">普通</option>
                <option value="当座">当座</option>
                <option value="貯蓄">貯蓄</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass} style={labelStyle}>口座番号</label>
              <input type="text" inputMode="numeric"
                value={form.bankAccountNo ?? ""} onChange={e => set("bankAccountNo", e.target.value)}
                placeholder="1234567"
                className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass} style={labelStyle}>口座名義（カタカナ）</label>
            <input type="text" value={form.bankAccountHolder ?? ""} onChange={e => set("bankAccountHolder", e.target.value)}
              placeholder="ヤマダ タロウ"
              className={inputClass} style={inputStyle} />
          </div>

          {/* プレビュー */}
          {form.bankName && (
            <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: "var(--bg-input)" }}>
              <p className="text-[10px] font-black" style={labelStyle}>印字プレビュー</p>
              <p className="text-xs font-bold" style={textStyle}>
                {form.bankName} {form.bankBranch}　{form.bankAccountType ?? "普通"}　{form.bankAccountNo}
              </p>
              <p className="text-xs font-bold" style={textStyle}>{form.bankAccountHolder}</p>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <button type="submit" disabled={!form.name}
          className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2
            ${!form.name
              ? "opacity-30 cursor-not-allowed"
              : saved
              ? "bg-green-500 shadow-lg shadow-green-200"
              : "bg-emerald-500 shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95"
            }`}>
          {saved
            ? <><CheckCircle2 className="w-5 h-5" /> 保存しました！</>
            : "設定を保存する"
          }
        </button>
      </form>
    </motion.div>
  );
}