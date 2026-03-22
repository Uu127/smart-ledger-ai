// src/components/NotificationSettings.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, CheckCircle2, AlertCircle, FileText, Calendar, Clock } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

interface ToggleRowProps {
  icon: React.ElementType;
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ icon: Icon, label, desc, value, onChange, disabled }: ToggleRowProps) {
  return (
    <div className={`flex items-center justify-between py-4 border-b last:border-0 transition-opacity ${disabled ? "opacity-40" : ""}`}
      style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
          <Icon className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black" style={{ color: "var(--text-main)" }}>{label}</p>
          <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{desc}</p>
        </div>
      </div>
      <button type="button" disabled={disabled} onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0 ml-3 ${value ? "bg-emerald-500" : ""}`}
        style={!value ? { backgroundColor: "var(--border)" } : {}}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${value ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

export function NotificationSettings() {
  const { settings, loading, permission, enableNotifications, disableNotifications, saveSettings } = useNotifications();
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [enabling, setEnabling] = useState(false);

  const handleMasterToggle = async () => {
    if (settings.enabled) {
      await disableNotifications();
    } else {
      setEnabling(true);
      const ok = await enableNotifications();
      setEnabling(false);
      if (!ok) return;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(settings);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    saveSettings({ ...settings, [key]: value });
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-32">

      {/* タイトル */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black">通知・リマインダー</h2>
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-tight">Notifications</p>
          </div>
        </div>
        <p className="text-[11px] text-indigo-200 font-bold mt-2">
          締切・支払期限・未送付書類をお知らせします
        </p>
      </div>

      {/* パーミッション状態 */}
      {permission === "denied" && (
        <div className="rounded-2xl p-4 flex gap-3 bg-red-50 border border-red-100">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-red-700">通知がブロックされています</p>
            <p className="text-[11px] font-bold text-red-500 mt-0.5">
              ブラウザの設定から通知を許可してください。<br />
              Safari: 設定 → SmartLedger → 通知を許可
            </p>
          </div>
        </div>
      )}

      {/* メインスイッチ */}
      <div className="rounded-2xl p-5 border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${settings.enabled ? "bg-emerald-100" : ""}`}
              style={!settings.enabled ? { backgroundColor: "var(--bg-input)" } : {}}>
              {settings.enabled
                ? <Bell className="w-5 h-5 text-emerald-600" />
                : <BellOff className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
              }
            </div>
            <div>
              <p className="font-black text-sm" style={{ color: "var(--text-main)" }}>プッシュ通知</p>
              <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                {settings.enabled ? "有効" : "無効"} — {permission === "granted" ? "許可済み" : "未許可"}
              </p>
            </div>
          </div>
          <button onClick={handleMasterToggle} disabled={enabling || permission === "denied"}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 disabled:opacity-40 ${settings.enabled ? "bg-emerald-500" : ""}`}
            style={!settings.enabled ? { backgroundColor: "var(--border)" } : {}}>
            <div className={`absolute top-1.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${settings.enabled ? "translate-x-8" : "translate-x-1.5"}`} />
          </button>
        </div>
        {enabling && (
          <p className="text-[10px] font-bold text-emerald-600 mt-2 animate-pulse">
            通知の許可を求めています...
          </p>
        )}
      </div>

      {/* 個別設定 */}
      <div className="rounded-2xl p-5 border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h3 className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          通知の種類
        </h3>
        <ToggleRow
          icon={Calendar}
          label="確定申告の締切リマインダー"
          desc="3月1日・10日・14日にお知らせ"
          value={settings.taxDeadline}
          onChange={v => updateSetting("taxDeadline", v)}
          disabled={!settings.enabled}
        />
        <ToggleRow
          icon={FileText}
          label="未送付の請求書がある場合"
          desc="下書きのまま3日以上経過した書類"
          value={settings.unpaidInvoices}
          onChange={v => updateSetting("unpaidInvoices", v)}
          disabled={!settings.enabled}
        />
        <ToggleRow
          icon={Clock}
          label="支払期限リマインダー"
          desc="請求書の支払期限3日前にお知らせ"
          value={settings.invoiceDueDate}
          onChange={v => updateSetting("invoiceDueDate", v)}
          disabled={!settings.enabled}
        />
      </div>

      {/* テスト通知 */}
      {settings.enabled && permission === "granted" && (
        <button
          onClick={() => {
            new Notification("SmartLedger AI テスト通知", {
              body: "通知が正常に設定されています！",
              icon: "/icon-192.png",
            });
          }}
          className="w-full py-3.5 rounded-2xl border-2 text-sm font-black transition-all active:scale-95"
          style={{ borderColor: "var(--border)", color: "var(--text-sub)", backgroundColor: "var(--bg-card)" }}>
          テスト通知を送る
        </button>
      )}

      {/* 注意書き */}
      <div className="rounded-2xl p-4 text-[11px] font-bold leading-relaxed"
        style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-muted)" }}>
        <p>⚠️ プッシュ通知はブラウザが開いているか、バックグラウンド実行中に届きます。</p>
        <p className="mt-1">iOSの場合はホーム画面に追加（PWA）してから通知を有効にしてください。</p>
      </div>
    </motion.div>
  );
}