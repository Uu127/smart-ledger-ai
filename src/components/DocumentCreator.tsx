// src/components/DocumentCreator.tsx
import { useState, useEffect } from "react";
import { DateInput } from "@/components/DateInput";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, CheckCircle2, FileText, ToggleLeft, ToggleRight, ArrowLeft } from "lucide-react";
import { useDocuments, useIssuerProfile } from "@/hooks/useDocuments";
import {
  DOCUMENT_TYPE_LABELS, calcDocument, generateDocumentNumber,
  type DocumentType, type DocumentItem,
} from "@/types/document";

const DOC_TYPES: DocumentType[] = ["invoice", "receipt", "estimate", "delivery"];
const UNITS = ["式", "個", "本", "枚", "冊", "時間", "日", "月", "件", "回"];

const NOTE_PRESETS = [
  { label: "インボイス未登録", text: "・当方はインボイス制度の適格請求書発行事業者には登録しておりません。" },
  { label: "振込手数料", text: "・お振込み手数料はご負担をお願い致します。" },
];

function newItem(): DocumentItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, unit: "式", unitPrice: 0, taxRate: 10 };
}

function taxIncToEx(v: number, rate: 10 | 8 | 0): number {
  return rate === 0 ? v : Math.ceil(v / (1 + rate / 100));
}

export function DocumentCreator() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams<{ id: string }>();
  const { documents, addDocument, updateDocument } = useDocuments();
  const { profile } = useIssuerProfile();

  const isEdit    = !!editId;
  const editDoc   = isEdit ? documents.find(d => d.id === editId) : null;
  const fromId    = searchParams.get("from");
  const sourceDoc = fromId ? documents.find(d => d.id === fromId) : null;
  const base      = editDoc ?? sourceDoc;
  const initialType = (searchParams.get("type") as DocumentType) ?? editDoc?.type ?? "invoice";

  const [initialized, setInitialized] = useState(false);
  const [type, setType]               = useState<DocumentType>(initialType);
  const [issueDate, setIssueDate]     = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate]         = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [subject, setSubject]         = useState(""); // 件名
  const [clientName, setClientName]   = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientDept, setClientDept]   = useState("");
  const [items, setItems]             = useState<DocumentItem[]>([newItem()]);
  const [notes, setNotes]             = useState("");
  const [taxIncMode, setTaxIncMode]     = useState(false);
  const [hideTaxDisplay, setHideTaxDisplay] = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [saveError, setSaveError]     = useState(false);
  const [bankName, setBankName]               = useState("");
  const [bankBranch, setBankBranch]           = useState("");
  const [bankAccountType, setBankAccountType] = useState("普通");
  const [bankAccountNo, setBankAccountNo]     = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");

  useEffect(() => {
    if (initialized) return;
    if (isEdit && !editDoc) return;
    if (base) {
      setType(base.type);
      setIssueDate(base.issueDate ?? new Date().toISOString().slice(0, 10));
      setDueDate(base.dueDate ?? "");
      setDeliveryDate(base.deliveryDate ?? "");
      setSubject(base.subject ?? "");
      setClientName(base.clientName ?? "");
      setClientAddress(base.clientAddress ?? "");
      setClientDept(base.clientDepartment ?? "");
      setItems(base.items?.length ? base.items : [newItem()]);
      setNotes(base.notes ?? "");
      setHideTaxDisplay(base.hideTaxDisplay ?? false);
      setBankName(base.bankName ?? "");
      setBankBranch(base.bankBranch ?? "");
      setBankAccountType(base.bankAccountType ?? "普通");
      setBankAccountNo(base.bankAccountNo ?? "");
      setBankAccountHolder(base.bankAccountHolder ?? "");
    } else if (!isEdit) {
      setBankName(profile.bankName ?? "");
      setBankBranch(profile.bankBranch ?? "");
      setBankAccountType(profile.bankAccountType ?? "普通");
      setBankAccountNo(profile.bankAccountNo ?? "");
      setBankAccountHolder(profile.bankAccountHolder ?? "");
    }
    setInitialized(true);
  }, [base, editDoc, isEdit, profile, initialized]);

  const docNumber = isEdit
    ? (editDoc?.documentNumber ?? "")
    : generateDocumentNumber(type, documents.filter(d => d.type === type).length);

  const calc = calcDocument(items);
  const allZeroTax = items.every(i => i.taxRate === 0);

  useEffect(() => {
    if (!allZeroTax) setHideTaxDisplay(false);
    // 0%税率では税込・税抜が同一なので、税込入力モードを解除して値の変化を防ぐ
    if (allZeroTax && taxIncMode) setTaxIncMode(false);
  }, [allZeroTax, taxIncMode]);

  const addItem    = () => setItems(p => [...p, newItem()]);
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const updateItem = (id: string, key: keyof DocumentItem, value: string | number) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [key]: value } : i));
  const togglePreset = (text: string) => {
    setNotes(prev => {
      if (prev.includes(text)) {
        return prev.split("\n").filter(line => line.trim() !== text.trim()).join("\n").trimStart();
      }
      return prev ? `${prev}\n${text}` : text;
    });
  };

  const fillBank = () => {
    setBankName(profile.bankName ?? ""); setBankBranch(profile.bankBranch ?? "");
    setBankAccountType(profile.bankAccountType ?? "普通"); setBankAccountNo(profile.bankAccountNo ?? "");
    setBankAccountHolder(profile.bankAccountHolder ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) return;
    setSaveError(false);
    const data = {
      type, documentNumber: docNumber, issueDate,
      dueDate:      type === "invoice" ? dueDate : undefined,
      deliveryDate: (type === "delivery" || type === "receipt") ? deliveryDate : undefined,
      subject:      subject || undefined,
      issuerName:          profile.name || editDoc?.issuerName || "",
      issuerContactPerson: profile.contactPerson || editDoc?.issuerContactPerson,
      issuerAddress: profile.address  || editDoc?.issuerAddress,
      issuerPhone:   profile.phone    || editDoc?.issuerPhone,
      issuerEmail:   profile.email    || editDoc?.issuerEmail,
      invoiceRegistrationNo: profile.invoiceRegistrationNo || editDoc?.invoiceRegistrationNo,
      bankName: bankName || undefined, bankBranch: bankBranch || undefined,
      bankAccountType: bankAccountType || undefined, bankAccountNo: bankAccountNo || undefined,
      bankAccountHolder: bankAccountHolder || undefined,
      clientName, clientAddress, clientDepartment: clientDept,
      items, subtotal: calc.subtotal, tax10: calc.tax10Amount, tax8: calc.tax8Amount, total: calc.total,
      notes,
      hideTaxDisplay: allZeroTax ? hideTaxDisplay : false,
      status: (isEdit ? editDoc?.status : "draft") ?? "draft",
    };
    try {
      if (isEdit && editId) {
        await updateDocument(editId, data);
      } else {
        await addDocument(data);
      }
      setSubmitted(true);
      setTimeout(() => navigate("/documents"), 800);
    } catch {
      setSaveError(true);
    }
  };

  const cardStyle  = { backgroundColor: "var(--bg-card)", borderColor: "var(--border)" };
  const inputStyle = { backgroundColor: "var(--bg-input)", color: "var(--text-main)" };
  const labelStyle = { color: "var(--text-muted)" };
  const inputClass = "w-full p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400";
  const labelClass = "text-[10px] font-black uppercase";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-32">

      {/* ヘッダー（戻るボタン付き） */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate("/documents")}
          className="p-2 rounded-xl border transition-all active:scale-90"
          style={{ backgroundColor: "var(--bg-card)", color: "var(--text-sub)", borderColor: "var(--border)" }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl px-5 py-4 text-white flex items-center gap-3">
          <div className="bg-white/10 p-1.5 rounded-lg"><FileText className="w-4 h-4" /></div>
          <div>
            <h2 className="text-sm font-black">
              {isEdit ? `${DOCUMENT_TYPE_LABELS[type]}を編集` : "書類を作成"}
            </h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase">
              {isEdit ? editDoc?.documentNumber : "Document Creator"}
            </p>
          </div>
        </div>
      </div>

      {sourceDoc && !isEdit && (
        <div className="rounded-xl px-3 py-2 text-[10px] font-bold"
          style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-muted)" }}>
          {sourceDoc.documentNumber} / {sourceDoc.clientName} の情報を引き継ぎました
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* 書類種別 */}
        <div className="rounded-2xl p-5 border shadow-sm space-y-3" style={cardStyle}>
          <h3 className="text-xs font-black uppercase tracking-widest" style={labelStyle}>書類の種類</h3>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TYPES.map(t => (
              <button key={t} type="button" onClick={() => !isEdit && setType(t)}
                className={`py-3 rounded-xl text-sm font-black transition-all border-2 ${
                  type === t ? "border-emerald-400 bg-emerald-50 text-emerald-700" : ""
                } ${isEdit ? "cursor-default" : "active:scale-95"}`}
                style={type === t ? {} : { borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }}>
                {DOCUMENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* 基本情報 */}
        <div className="rounded-2xl p-5 border shadow-sm space-y-4" style={cardStyle}>
          <h3 className="text-xs font-black uppercase tracking-widest" style={labelStyle}>基本情報</h3>
          <div className="flex justify-between items-center rounded-xl p-3" style={{ backgroundColor: "var(--bg-input)" }}>
            <span className={labelClass} style={labelStyle}>書類番号</span>
            <span className="text-sm font-black" style={{ color: "var(--text-main)" }}>{docNumber}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass} style={labelStyle}>発行日</label>
              <DateInput value={issueDate} onChange={setIssueDate} required
                className="w-full focus-within:ring-2 focus-within:ring-emerald-400" />
            </div>
            {type === "invoice" && (
              <div className="space-y-1">
                <label className={labelClass} style={labelStyle}>支払期限</label>
                <DateInput value={dueDate} onChange={setDueDate}
                  className="w-full focus-within:ring-2 focus-within:ring-emerald-400" />
              </div>
            )}
            {(type === "delivery" || type === "receipt") && (
              <div className="space-y-1">
                <label className={labelClass} style={labelStyle}>{type === "receipt" ? "受領日" : "納品日"}</label>
                <DateInput value={deliveryDate} onChange={setDeliveryDate}
                  className="w-full focus-within:ring-2 focus-within:ring-emerald-400" />
              </div>
            )}
          </div>

          {/* 件名 */}
          <div className="space-y-1">
            <label className={labelClass} style={labelStyle}>件名（例：ホームページ制作費 着手金）</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="例: ウェブサイト制作費 【着手金】"
              className={inputClass} style={inputStyle} />
          </div>
        </div>

        {/* 宛先 */}
        <div className="rounded-2xl p-5 border shadow-sm space-y-4" style={cardStyle}>
          <h3 className="text-xs font-black uppercase tracking-widest" style={labelStyle}>宛先</h3>
          {[
            { label: "会社名 / 氏名 *", value: clientName,    set: setClientName,    placeholder: "例: 株式会社〇〇", req: true },
            { label: "部署名 / 担当者",  value: clientDept,    set: setClientDept,    placeholder: "例: ご担当者様" },
            { label: "住所",             value: clientAddress, set: setClientAddress, placeholder: "例: 東京都〇〇区..." },
          ].map(({ label, value, set, placeholder, req }) => (
            <div key={label} className="space-y-1">
              <label className={labelClass} style={labelStyle}>{label}</label>
              <input type="text" value={value} onChange={e => set(e.target.value)}
                placeholder={placeholder} required={req}
                className={inputClass} style={inputStyle} />
            </div>
          ))}
        </div>

        {/* 品目 */}
        <div className="rounded-2xl p-5 border shadow-sm space-y-4" style={cardStyle}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest" style={labelStyle}>品目・内容</h3>
            <div className="flex items-center gap-2">
              {!allZeroTax && (
                <button type="button" onClick={() => setTaxIncMode(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black active:scale-95 transition-all"
                  style={{ backgroundColor: "var(--bg-input)", color: "var(--text-sub)" }}>
                  {taxIncMode
                    ? <><ToggleRight className="w-4 h-4 text-emerald-500" /> 税込入力</>
                    : <><ToggleLeft className="w-4 h-4" /> 税抜入力</>}
                </button>
              )}
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-black active:scale-95 transition-all">
                <Plus className="w-3.5 h-3.5" /> 追加
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.id} className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--bg-input)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black" style={labelStyle}>品目 {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(item.id)}
                      className="p-1 text-slate-300 hover:text-red-400 active:scale-90">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input type="text" value={item.description}
                  onChange={e => updateItem(item.id, "description", e.target.value)}
                  placeholder="例: ホームページ制作費 【着手金】"
                  className={inputClass} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }} />
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className={labelClass} style={labelStyle}>数量</label>
                    <input type="number" inputMode="numeric"
                      value={item.quantity || ""} placeholder="1" min={0} step={0.5}
                      onChange={e => updateItem(item.id, "quantity", Number(e.target.value) || 0)}
                      className={inputClass} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass} style={labelStyle}>単位</label>
                    <select value={item.unit} onChange={e => updateItem(item.id, "unit", e.target.value)}
                      className={inputClass} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass} style={labelStyle}>税率</label>
                    <select value={item.taxRate}
                      onChange={e => updateItem(item.id, "taxRate", Number(e.target.value) as 10 | 8 | 0)}
                      className={inputClass} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }}>
                      <option value={10}>10%</option>
                      <option value={8}>8% 軽減</option>
                      <option value={0}>0% 非課税</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={labelClass} style={labelStyle}>
                    {allZeroTax && hideTaxDisplay ? "単価" : `単価（${taxIncMode ? "税込" : "税抜"}）`}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black" style={labelStyle}>¥</span>
                    {taxIncMode ? (
                      <input key={`inc-${item.id}`} type="number" inputMode="numeric" placeholder="0" min={0}
                        onChange={e => updateItem(item.id, "unitPrice", taxIncToEx(Number(e.target.value) || 0, item.taxRate))}
                        className={`${inputClass} pl-7`} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }} />
                    ) : (
                      <input key={`ex-${item.id}`} type="number" inputMode="numeric"
                        value={item.unitPrice || ""} placeholder="0" min={0}
                        onChange={e => updateItem(item.id, "unitPrice", Number(e.target.value) || 0)}
                        className={`${inputClass} pl-7`} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }} />
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[10px] font-bold" style={labelStyle}>{allZeroTax && hideTaxDisplay ? "小計" : "小計（税抜）"}</span>
                  <span className="text-sm font-black" style={{ color: "var(--text-main)" }}>
                    ¥{(item.quantity * item.unitPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 税込・税抜の非表示設定（全品目0%のときのみ） */}
          {allZeroTax && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ backgroundColor: "var(--bg-input)" }}>
              <span className="text-xs font-black" style={{ color: "var(--text-sub)" }}>
                税込・税抜の表示を非表示にする
              </span>
              <button type="button" onClick={() => setHideTaxDisplay(v => !v)}
                className="flex items-center gap-1.5 text-[10px] font-black active:scale-95 transition-all"
                style={{ color: "var(--text-sub)" }}>
                {hideTaxDisplay
                  ? <><ToggleRight className="w-5 h-5 text-emerald-500" /> 非表示中</>
                  : <><ToggleLeft className="w-5 h-5" /> 表示する</>}
              </button>
            </div>
          )}

          {/* 合計 */}
          <div className="bg-emerald-50 rounded-2xl p-4 space-y-2">
            {[
              { label: hideTaxDisplay ? "小計" : "小計（税抜）",       value: calc.subtotal,    show: true,                   bold: false },
              { label: "消費税（10%）",                                  value: calc.tax10Amount, show: calc.tax10Amount > 0,   bold: false },
              { label: "消費税（8% 軽減）",                              value: calc.tax8Amount,  show: calc.tax8Amount > 0,    bold: false },
              { label: hideTaxDisplay ? "合計金額" : "合計金額（税込）", value: calc.total,       show: true,                   bold: true  },
            ].filter(r => r.show).map(({ label, value, bold }) => (
              <div key={label} className={`flex justify-between ${bold ? "pt-2 border-t border-emerald-200 items-center" : ""}`}>
                <span className={bold ? "text-sm font-black text-slate-800" : "text-xs font-bold text-slate-600"}>{label}</span>
                <span className={bold ? "text-xl font-black text-emerald-700" : "text-xs font-bold text-slate-600"}>
                  ¥{value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 備考 */}
        <div className="rounded-2xl p-5 border shadow-sm space-y-3" style={cardStyle}>
          <h3 className="text-xs font-black uppercase tracking-widest" style={labelStyle}>備考</h3>
          <div className="flex flex-wrap gap-2">
            {NOTE_PRESETS.map(({ label, text }) => {
              const active = notes.includes(text);
              return (
                <button key={label} type="button" onClick={() => togglePreset(text)}
                  className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    active ? "border-emerald-400 bg-emerald-50 text-emerald-700" : ""
                  }`}
                  style={active ? {} : { backgroundColor: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text-sub)" }}>
                  {active ? "✓ " : "+ "}{label}
                </button>
              );
            })}
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={"例:\n・ご不明な点はお気軽にご連絡ください。"}
            rows={5}
            className={`${inputClass} resize-none leading-relaxed`} style={inputStyle} />
        </div>

        {/* 振込先 */}
        {(type === "invoice" || type === "estimate") && (
          <div className="rounded-2xl p-5 border shadow-sm space-y-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest" style={labelStyle}>振込先口座</h3>
              {profile.bankName && (
                <button type="button" onClick={fillBank}
                  className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95">
                  自社情報から入力
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass} style={labelStyle}>銀行名</label>
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="〇〇銀行" className={inputClass} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelClass} style={labelStyle}>支店名</label>
                <input type="text" value={bankBranch} onChange={e => setBankBranch(e.target.value)} placeholder="〇〇支店" className={inputClass} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass} style={labelStyle}>口座種別</label>
                <select value={bankAccountType} onChange={e => setBankAccountType(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                  <option value="貯蓄">貯蓄</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass} style={labelStyle}>口座番号</label>
                <input type="text" inputMode="numeric" value={bankAccountNo} onChange={e => setBankAccountNo(e.target.value)} placeholder="1234567" className={inputClass} style={inputStyle} />
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClass} style={labelStyle}>口座名義（カタカナ）</label>
              <input type="text" value={bankAccountHolder} onChange={e => setBankAccountHolder(e.target.value)} placeholder="ヤマダ タロウ" className={inputClass} style={inputStyle} />
            </div>
            {bankName && (
              <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-input)" }}>
                <p className="text-[10px] font-black mb-1" style={labelStyle}>印字プレビュー</p>
                <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
                  {bankName} {bankBranch}　{bankAccountType}　{bankAccountNo}
                </p>
                <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>{bankAccountHolder}</p>
              </div>
            )}
          </div>
        )}

        {/* 保存ボタン */}
        {saveError && (
          <div className="rounded-xl px-4 py-3 text-sm font-bold text-red-700 bg-red-50 border border-red-200">
            保存に失敗しました。再度お試しください。
          </div>
        )}
        <button type="submit" disabled={!clientName || submitted}
          className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2
            ${!clientName ? "opacity-30 cursor-not-allowed"
              : submitted ? "bg-green-500 shadow-lg shadow-green-200"
              : "bg-slate-900 hover:bg-slate-800 active:scale-95"}`}>
          {submitted
            ? <><CheckCircle2 className="w-6 h-6" /> {isEdit ? "更新しました！" : "保存しました！"}</>
            : isEdit ? `${DOCUMENT_TYPE_LABELS[type]}を更新する` : `${DOCUMENT_TYPE_LABELS[type]}を保存する`
          }
        </button>
      </form>
    </motion.div>
  );
}
