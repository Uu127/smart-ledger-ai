// src/components/SheetsDrawer.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TableProperties, CheckCircle2, AlertCircle, Link2, RefreshCw, ExternalLink, FilePlus, Unlink2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSheets, filterByPeriod, type SheetsPeriod } from "@/hooks/useSheets";
import { useDepreciation } from "@/hooks/useDepreciation";
import type { LedgerEntry } from "@/types/ledger";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: LedgerEntry[];
}

const PERIODS: { value: SheetsPeriod; label: string }[] = [
  { value: "thisMonth", label: "今月" },
  { value: "lastMonth", label: "先月" },
  { value: "thisYear",  label: "今年" },
  { value: "all",       label: "全期間" },
];

type ExportState = "idle" | "loading" | "success" | "error";

export function SheetsDrawer({ isOpen, onClose, entries }: Props) {
  const { sheetsToken, connectSheets } = useAuth();
  const { spreadsheetId, settingsLoading, saveSpreadsheetId, exportToSheets, createAndLinkSpreadsheet, unlinkSpreadsheet } = useSheets();
  const { assets } = useDepreciation();

  const [urlInput, setUrlInput]       = useState("");
  const [period, setPeriod]           = useState<SheetsPeriod>("thisMonth");
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [errorMsg, setErrorMsg]       = useState("");
  const [savedMsg, setSavedMsg]       = useState(false);
  const [createState, setCreateState]   = useState<"idle" | "loading" | "done">("idle");
  const [unlinkConfirm, setUnlinkConfirm] = useState(false);

  const targetEntries  = filterByPeriod(entries, period);
  const BANK_ACCOUNTS  = ["普通預金", "当座預金", "口座振替"];
  const cashCount      = targetEntries.filter(e => e.creditAccount === "現金").length;
  const bankCount      = targetEntries.filter(e => BANK_ACCOUNTS.includes(e.creditAccount)).length;
  const expenseCount   = targetEntries.filter(e => e.entryType === "expense" && e.debitAccount !== "仕入高").length;
  const isConnected    = !!sheetsToken;
  const hasSpreadsheet = !!spreadsheetId;

  const handleCreate = async () => {
    setCreateState("loading");
    try {
      await createAndLinkSpreadsheet();
      setCreateState("done");
    } catch (err) {
      setErrorMsg((err as Error).message || "作成に失敗しました");
      setCreateState("idle");
    }
  };

  const handleSaveUrl = async () => {
    if (!urlInput.trim()) return;
    await saveSpreadsheetId(urlInput.trim());
    setUrlInput("");
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const handleExport = async () => {
    if (targetEntries.length === 0) return;
    setExportState("loading");
    setErrorMsg("");
    try {
      await exportToSheets(targetEntries, assets);
      setExportState("success");
    } catch (err) {
      setErrorMsg((err as Error).message || "書き出しに失敗しました");
      setExportState("error");
    }
  };

  const labelClass = "text-[10px] font-black uppercase tracking-wider";
  const labelStyle = { color: "var(--text-muted)" };
  const inputStyle = { backgroundColor: "var(--bg-input)", color: "var(--text-main)" };
  const cardStyle  = { backgroundColor: "var(--bg-input)" };
  const borderStyle = { borderColor: "var(--border)" };
  const inputClass = "w-full p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景 */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* ドロワー */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.12)]"
            style={{ maxHeight: "88dvh", backgroundColor: "var(--bg-card)" }}
          >
            {/* ハンドル */}
            <div className="flex justify-center pt-3 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--border)" }} />
            </div>

            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={borderStyle}>
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-100 p-1.5 rounded-lg">
                  <TableProperties className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-black" style={{ color: "var(--text-main)" }}>
                  Google Sheets に書き出す
                </h3>
              </div>
              <button onClick={onClose}
                className="p-2 rounded-full active:scale-90 transition-all"
                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-6 py-5 space-y-6 pb-10">

              {/* ── スプレッドシート設定 ── */}
              <div className="space-y-3">
                <p className={labelClass} style={labelStyle}>スプレッドシート</p>

                {hasSpreadsheet && !settingsLoading && !unlinkConfirm && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 active:opacity-70 transition-opacity flex-1 min-w-0"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-xs font-bold text-emerald-700 truncate flex-1">
                        {spreadsheetId}
                      </p>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </a>
                    <button
                      onClick={() => setUnlinkConfirm(true)}
                      className="p-2.5 rounded-xl transition-all active:scale-90 shrink-0"
                      style={{ backgroundColor: "var(--bg-input)", color: "var(--text-muted)" }}
                      title="連携を解除"
                    >
                      <Unlink2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {hasSpreadsheet && !settingsLoading && unlinkConfirm && (
                  <div className="rounded-xl p-4 space-y-3 border" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)" }}>
                    <p className="text-xs font-black" style={{ color: "var(--text-main)" }}>
                      スプレッドシートの連携を解除しますか？
                    </p>
                    <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                      スプレッドシート本体は削除されません。再度URLを貼り付けるか、新規作成で再連携できます。
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setUnlinkConfirm(false)}
                        className="flex-1 py-2 rounded-xl text-xs font-black active:scale-95 transition-all"
                        style={{ backgroundColor: "var(--bg-card)", color: "var(--text-sub)" }}
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={async () => {
                          await unlinkSpreadsheet();
                          setUnlinkConfirm(false);
                          setCreateState("idle");
                          setExportState("idle");
                        }}
                        className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-red-500 active:scale-95 transition-all"
                      >
                        解除する
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="スプレッドシートのURLを貼り付け"
                    className={`${inputClass} flex-1`}
                    style={inputStyle}
                  />
                  <button
                    onClick={handleSaveUrl}
                    disabled={!urlInput.trim()}
                    className="px-4 py-3 rounded-xl font-black text-sm bg-slate-900 text-white disabled:opacity-30 active:scale-95 transition-all shrink-0"
                  >
                    {savedMsg ? "✓" : "設定"}
                  </button>
                </div>
                <p className="text-[10px] font-bold" style={labelStyle}>
                  Google スプレッドシートの URL をそのまま貼り付けてください
                </p>

                {/* スプレッドシートがない場合：新規作成ボタン */}
                {!hasSpreadsheet && !settingsLoading && (
                  <div className="rounded-2xl border-2 border-dashed p-4 space-y-3"
                    style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs font-bold text-center" style={{ color: "var(--text-muted)" }}>
                      まだスプレッドシートがない場合は自動で作成できます
                    </p>
                    <button
                      onClick={handleCreate}
                      disabled={createState === "loading" || createState === "done"}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all active:scale-95"
                      style={createState === "done"
                        ? { backgroundColor: "#ecfdf5", color: "#065f46" }
                        : { backgroundColor: "var(--bg-input)", color: "var(--text-main)" }}
                    >
                      {createState === "loading" && (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          作成中...
                        </>
                      )}
                      {createState === "done" && (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> 作成・連携しました！
                        </>
                      )}
                      {createState === "idle" && (
                        <>
                          <FilePlus className="w-4 h-4" /> 新規スプレッドシートを作成して連携
                        </>
                      )}
                    </button>
                    {createState === "done" && spreadsheetId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 active:opacity-70"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Sheets で開く
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* ── 期間選択 ── */}
              <div className="space-y-3">
                <p className={labelClass} style={labelStyle}>書き出す期間</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {PERIODS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => { setPeriod(p.value); setExportState("idle"); }}
                      className="py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 border-2"
                      style={period === p.value
                        ? { borderColor: "#34d399", backgroundColor: "#ecfdf5", color: "#065f46" }
                        : { borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* 書き出し内訳 */}
                <div className="rounded-xl overflow-hidden border" style={borderStyle}>
                  {[
                    { label: "仕訳帳",       sub: "全仕訳",              count: targetEntries.length, unit: "件" },
                    { label: "総勘定元帳",   sub: "科目別転記",           count: targetEntries.length, unit: "件" },
                    { label: "現金出納帳",   sub: "貸方=現金",            count: cashCount,            unit: "件" },
                    { label: "預金出納帳",   sub: "貸方=銀行口座",        count: bankCount,            unit: "件" },
                    { label: "経費帳",       sub: "経費（仕入除く）",     count: expenseCount,         unit: "件" },
                    { label: "固定資産台帳", sub: "今年度の償却額",        count: assets.length,        unit: "件" },
                  ].map((row, i, arr) => (
                    <div
                      key={row.label}
                      className={`flex justify-between items-center px-4 py-2.5${i < arr.length - 1 ? " border-b" : ""}`}
                      style={i % 2 === 1 ? { ...cardStyle, borderColor: "var(--border)" } : { borderColor: "var(--border)" }}
                    >
                      <div>
                        <span className="text-xs font-black" style={{ color: "var(--text-main)" }}>{row.label}</span>
                        <span className="text-[10px] font-bold ml-1.5" style={{ color: "var(--text-muted)" }}>{row.sub}</span>
                      </div>
                      <span className="text-sm font-black" style={{ color: "var(--text-main)" }}>
                        {row.count} {row.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Google 接続状態 ── */}
              <div className="space-y-2">
                <p className={labelClass} style={labelStyle}>Google アカウント</p>
                {isConnected ? (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-black text-emerald-700">接続済み</span>
                    </div>
                    <button
                      onClick={connectSheets}
                      className="flex items-center gap-1 text-[10px] font-black active:scale-95 transition-all"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <RefreshCw className="w-3 h-3" /> 再接続
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={connectSheets}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black active:scale-95 transition-all"
                    style={{ backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }}
                  >
                    <Link2 className="w-4 h-4" /> Google で接続する
                  </button>
                )}
              </div>

              {/* ── 書き出しボタン ── */}
              <div className="space-y-3">
                <button
                  onClick={handleExport}
                  disabled={
                    !hasSpreadsheet ||
                    targetEntries.length === 0 ||
                    exportState === "loading" ||
                    exportState === "success"
                  }
                  className={`w-full py-4 rounded-2xl font-black text-white text-sm transition-all active:scale-95
                    ${exportState === "success"
                      ? "bg-green-500 shadow-lg shadow-green-200"
                      : exportState === "loading"
                      ? "bg-emerald-400 opacity-70"
                      : !hasSpreadsheet || targetEntries.length === 0
                      ? "cursor-not-allowed opacity-40"
                      : "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-100"
                    }`}
                  style={(!hasSpreadsheet || targetEntries.length === 0)
                    ? { backgroundColor: "var(--bg-input)", color: "var(--text-muted)" }
                    : {}}
                >
                  {exportState === "loading" && (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      書き出し中...
                    </span>
                  )}
                  {exportState === "success" && (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> 書き出し完了！
                    </span>
                  )}
                  {(exportState === "idle" || exportState === "error") &&
                    `Sheets に ${targetEntries.length} 件を書き出す`}
                </button>

                {exportState === "error" && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-red-600">{errorMsg || "書き出しに失敗しました"}</p>
                  </div>
                )}

                {!hasSpreadsheet && (
                  <p className="text-center text-[10px] font-bold" style={labelStyle}>
                    スプレッドシートの URL を先に設定してください
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
