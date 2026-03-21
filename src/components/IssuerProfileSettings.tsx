// src/components/IssuerProfileSettings.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2 } from "lucide-react";
import { useIssuerProfile } from "@/hooks/useDocuments";
import type { IssuerProfile } from "@/types/document";

export function IssuerProfileSettings() {
  const { profile, loading, saveProfile } = useIssuerProfile();
  const [form, setForm]     = useState<IssuerProfile>({ name: "" });
  const [saved, setSaved]   = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!loading && !initialized) {
      setForm(profile);
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

  const inputClass = "w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase";

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-32">

      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl"><Building2 className="w-5 h-5" /></div>
          <div>
            <h2 className="text-sm font-black">発行者情報の設定</h2>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-tight">Issuer Profile</p>
          </div>
        </div>
        <p className="text-[11px] text-emerald-200 font-bold mt-2">
          書類に自動で印字される発行者情報を設定します
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* 基本情報 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">基本情報</h3>

          <div className="space-y-1">
            <label className={labelClass}>屋号 / 会社名 *</label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="例: 山田太郎事務所" required className={inputClass} />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>住所</label>
            <input type="text" value={form.address ?? ""} onChange={e => set("address", e.target.value)}
              placeholder="例: 東京都渋谷区〇〇1-2-3" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>電話番号</label>
              <input type="tel" value={form.phone ?? ""} onChange={e => set("phone", e.target.value)}
                placeholder="090-0000-0000" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>メールアドレス</label>
              <input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)}
                placeholder="example@mail.com" className={inputClass} />
            </div>
          </div>
        </div>

        {/* インボイス登録番号 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">インボイス制度</h3>
          <div className="space-y-1">
            <label className={labelClass}>適格請求書発行事業者 登録番号</label>
            <input type="text" value={form.invoiceRegistrationNo ?? ""} onChange={e => set("invoiceRegistrationNo", e.target.value)}
              placeholder="T1234567890123（T + 13桁）" className={inputClass} />
            <p className="text-[10px] font-bold text-slate-400">
              未登録の場合は空白のままでOKです
            </p>
          </div>
        </div>

        {/* 銀行口座 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">振込先口座（請求書に印字）</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>銀行名</label>
              <input type="text" value={form.bankName ?? ""} onChange={e => set("bankName", e.target.value)}
                placeholder="〇〇銀行" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>支店名</label>
              <input type="text" value={form.bankBranch ?? ""} onChange={e => set("bankBranch", e.target.value)}
                placeholder="〇〇支店" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>口座種別</label>
              <select value={form.bankAccountType ?? "普通"} onChange={e => set("bankAccountType", e.target.value)}
                className={inputClass}>
                <option value="普通">普通</option>
                <option value="当座">当座</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>口座番号</label>
              <input type="text" value={form.bankAccountNo ?? ""} onChange={e => set("bankAccountNo", e.target.value)}
                placeholder="1234567" className={inputClass} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>口座名義（カナ）</label>
            <input type="text" value={form.bankAccountHolder ?? ""} onChange={e => set("bankAccountHolder", e.target.value)}
              placeholder="ヤマダ タロウ" className={inputClass} />
          </div>
        </div>

        <button type="submit" disabled={!form.name}
          className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2
            ${!form.name ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : saved ? "bg-green-500 shadow-lg shadow-green-200"
              : "bg-emerald-500 shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95"}`}>
          {saved ? <><CheckCircle2 className="w-5 h-5" /> 保存しました！</> : "設定を保存する"}
        </button>
      </form>
    </motion.div>
  );
}