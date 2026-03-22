// src/components/DocumentCreator.tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, CheckCircle2, FileText, ToggleLeft, ToggleRight } from "lucide-react";
import { useDocuments, useIssuerProfile } from "@/hooks/useDocuments";
import {
  DOCUMENT_TYPE_LABELS, calcDocument, generateDocumentNumber,
  type DocumentType, type DocumentItem,
} from "@/types/document";

const DOC_TYPES: DocumentType[] = ["invoice", "receipt", "estimate", "delivery"];
const UNITS = ["式", "個", "本", "枚", "冊", "時間", "日", "月", "件", "回"];

function newItem(): DocumentItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, unit: "式", unitPrice: 0, taxRate: 10 };
}

function taxIncToEx(taxInc: number, rate: 10 | 8 | 0): number {
  if (rate === 0) return taxInc;
  return Math.ceil(taxInc / (1 + rate / 100));
}

export function DocumentCreator() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const { id: editId }  = useParams<{ id: string }>(); // 編集モード時はidが入る
  const { documents, addDocument, updateDocument } = useDocuments();
  const { profile } = useIssuerProfile();

  const isEdit    = !!editId;
  const editDoc   = isEdit ? documents.find(d => d.id === editId) : null;

  const initialType = (searchParams.get("type") as DocumentType)
    ?? editDoc?.type ?? "invoice";
  const fromId   = searchParams.get("from");
  const sourceDoc = fromId ? documents.find(d => d.id === fromId) : null;

  // 初期値：編集モードなら既存データ、引き継ぎなら元書類、新規なら空
  const base = editDoc ?? sourceDoc;

  const [initialized, setInitialized] = useState(false);
  const [type, setType]               = useState<DocumentType>(initialType);
  const [issueDate, setIssueDate]     = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate]         = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [clientName, setClientName]   = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientDept, setClientDept]   = useState("");
  const [items, setItems]             = useState<DocumentItem[]>([newItem()]);
  const [notes, setNotes]             = useState("");
  const [submitted, setSubmitted]     = useState(false);
  const [taxIncMode, setTaxIncMode]   = useState(false);
  const [bankName, setBankName]               = useState("");
  const [bankBranch, setBankBranch]           = useState("");
  const [bankAccountType, setBankAccountType] = useState("普通");
  const [bankAccountNo, setBankAccountNo]     = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");

  // 編集データが読み込まれたら初期値をセット
  useEffect(() => {
    if (initialized) return;
    if (isEdit && !editDoc) return; // まだ読み込み中

    if (base) {
      setType(base.type);
      setIssueDate(base.issueDate ?? new Date().toISOString().slice(0, 10));
      setDueDate(base.dueDate ?? "");
      setDeliveryDate(base.deliveryDate ?? "");
      setClientName(base.clientName ?? "");
      setClientAddress(base.clientAddress ?? "");
      setClientDept(base.clientDepartment ?? "");
      setItems(base.items?.length ? base.items : [newItem()]);
      setNotes(base.notes ?? "");
      setBankName(base.bankName ?? "");
      setBankBranch(base.bankBranch ?? "");
      setBankAccountType(base.bankAccountType ?? "普通");
      setBankAccountNo(base.bankAccountNo ?? "");
      setBankAccountHolder(base.bankAccountHolder ?? "");
    }
    setInitialized(true);
  }, [base, editDoc, isEdit, initialized]);

  // 新規作成 & 自社情報の初期セット（編集時はスキップ）
  useEffect(() => {
    if (!isEdit && !sourceDoc && profile.bankName && !initialized) {
      setBankName(profile.bankName ?? "");
      setBankBranch(profile.bankBranch ?? "");
      setBankAccountType(profile.bankAccountType ?? "普通");
      setBankAccountNo(profile.bankAccountNo ?? "");
      setBankAccountHolder(profile.bankAccountHolder ?? "");
    }
  }, [profile, isEdit, sourceDoc, initialized]);

  const docNumber = isEdit
    ? (editDoc?.documentNumber ?? "")
    : generateDocumentNumber(type, documents.filter(d => d.type === type).length);

  const calc = calcDocument(items);

  const addItem    = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, key: keyof DocumentItem, value: string | number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: value } : i));

  const fillBankFromProfile = () => {
    setBankName(profile.bankName ?? "");
    setBankBranch(profile.bankBranch ?? "");
    setBankAccountType(profile.bankAccountType ?? "普通");
    setBankAccountNo(profile.bankAccountNo ?? "");
    setBankAccountHolder(profile.bankAccountHolder ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) return;
    setSubmitted(true);

    const data = {
      type, documentNumber: docNumber, issueDate,
      dueDate:      type === "invoice" ? dueDate : undefined,
      deliveryDate: (type === "delivery" || type === "receipt") ? deliveryDate : undefined,
      issuerName:    profile.name || editDoc?.issuerName || "",
      issuerAddress: profile.address || editDoc?.issuerAddress,
      issuerPhone:   profile.phone  || editDoc?.issuerPhone,
      issuerEmail:   profile.email  || editDoc?.issuerEmail,
      invoiceRegistrationNo: profile.invoiceRegistrationNo || editDoc?.invoiceRegistrationNo,
      bankName:          bankName   || undefined,
      bankBranch:        bankBranch || undefined,
      bankAccountType:   bankAccountType || undefined,
      bankAccountNo:     bankAccountNo   || undefined,
      bankAccountHolder: bankAccountHolder || undefined,
      clientName, clientAddress,
      clientDepartment: clientDept,
      items,
      subtotal: calc.subtotal,
      tax10:    calc.tax10Amount,
      tax8:     calc.tax8Amount,
      total:    calc.total,
      notes,
      status: (isEdit ? editDoc?.status : "draft") ?? "draft",
    };

    if (isEdit && editId) {
      await updateDocument(editId, data);
    } else {
      await addDocument(data);
    }

    setTimeout(() => navigate("/documents"), 800);
  };

  const inputClass = "w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-32">

      {/* タイトル */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl"><FileText className="w-5 h-5" /></div>
          <div>
            <h2 className="text-sm font-black">
              {isEdit ? `${DOCUMENT_TYPE_LABELS[type]}を編集` : "書類を作成"}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              {isEdit ? "Document Editor" : "Document Creator"}
            </p>
          </div>
        </div>
        {isEdit && editDoc && (
          <div className="mt-2 bg-white/10 rounded-xl px-3 py-2">
            <p className="text-[10px] font-bold text-slate-300">
              {editDoc.documentNumber} を編集しています
            </p>
          </div>
        )}
        {sourceDoc && !isEdit && (
          <div className="mt-2 bg-white/10 rounded-xl px-3 py-2">
            <p className="text-[10px] font-bold text-slate-300">
              {sourceDoc.documentNumber} / {sourceDoc.clientName} の情報を引き継ぎました
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* 書類種別（編集時は変更不可） */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">書類の種類</h3>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TYPES.map(t => (
              <button key={t} type="button"
                onClick={() => !isEdit && setType(t)}
                className={`py-3 rounded-xl text-sm font-black transition-all border-2 ${
                  type === t
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                } ${isEdit ? "cursor-default" : "active:scale-95"}`}>
                {DOCUMENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {isEdit && <p className="text-[10px] font-bold text-slate-400">書類の種類は編集できません</p>}
        </div>

        {/* 基本情報 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">基本情報</h3>
          <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3">
            <span className={labelClass}>書類番号</span>
            <span className="text-sm font-black text-slate-700">{docNumber}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>発行日</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                required className={inputClass} />
            </div>
            {type === "invoice" && (
              <div className="space-y-1">
                <label className={labelClass}>支払期限</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className={inputClass} />
              </div>
            )}
            {(type === "delivery" || type === "receipt") && (
              <div className="space-y-1">
                <label className={labelClass}>{type === "receipt" ? "受領日" : "納品日"}</label>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                  className={inputClass} />
              </div>
            )}
          </div>
        </div>

        {/* 宛先 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">宛先</h3>
          <div className="space-y-1">
            <label className={labelClass}>会社名 / 氏名 *</label>
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
              placeholder="例: 株式会社〇〇" required className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>部署名</label>
            <input type="text" value={clientDept} onChange={e => setClientDept(e.target.value)}
              placeholder="例: 経理部 御中" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>住所</label>
            <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)}
              placeholder="例: 大阪府大阪市〇〇区..." className={inputClass} />
          </div>
        </div>

        {/* 品目 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">品目・内容</h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setTaxIncMode(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-black active:scale-95 transition-all">
                {taxIncMode
                  ? <><ToggleRight className="w-4 h-4 text-emerald-500" /> 税込入力</>
                  : <><ToggleLeft className="w-4 h-4" /> 税抜入力</>
                }
              </button>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-black active:scale-95 transition-all">
                <Plus className="w-3.5 h-3.5" /> 追加
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.id} className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400">品目 {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(item.id)}
                      className="p-1 text-slate-300 hover:text-red-400 transition-colors active:scale-90">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>品目・内容</label>
                  <input type="text" value={item.description}
                    onChange={e => updateItem(item.id, "description", e.target.value)}
                    placeholder="例: Webサイト制作費"
                    className="w-full p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className={labelClass}>数量</label>
                    <input type="number" inputMode="numeric"
                      value={item.quantity || ""} placeholder="1" min={0} step={0.5}
                      onChange={e => updateItem(item.id, "quantity", Number(e.target.value) || 0)}
                      className="w-full p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>単位</label>
                    <select value={item.unit} onChange={e => updateItem(item.id, "unit", e.target.value)}
                      className="w-full p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>税率</label>
                    <select value={item.taxRate}
                      onChange={e => updateItem(item.id, "taxRate", Number(e.target.value) as 10 | 8 | 0)}
                      className="w-full p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      <option value={10}>10%</option>
                      <option value={8}>8% 軽減</option>
                      <option value={0}>0% 非課税</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>単価（{taxIncMode ? "税込" : "税抜"}）</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">¥</span>
                    {taxIncMode ? (
                      <input key={`inc-${item.id}`} type="number" inputMode="numeric"
                        placeholder="0" min={0}
                        onChange={e => updateItem(item.id, "unitPrice", taxIncToEx(Number(e.target.value) || 0, item.taxRate))}
                        className="w-full pl-7 p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    ) : (
                      <input key={`ex-${item.id}`} type="number" inputMode="numeric"
                        value={item.unitPrice || ""} placeholder="0" min={0}
                        onChange={e => updateItem(item.id, "unitPrice", Number(e.target.value) || 0)}
                        className="w-full pl-7 p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400">小計（税抜）</span>
                  <span className="text-sm font-black text-slate-700">
                    ¥{(item.quantity * item.unitPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 合計 */}
          <div className="bg-emerald-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>小計（税抜）</span><span>¥{calc.subtotal.toLocaleString()}</span>
            </div>
            {calc.tax10Amount > 0 && (
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>消費税（10%）</span><span>¥{calc.tax10Amount.toLocaleString()}</span>
              </div>
            )}
            {calc.tax8Amount > 0 && (
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>消費税（8% 軽減）</span><span>¥{calc.tax8Amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
              <span className="text-sm font-black text-slate-800">合計（税込）</span>
              <span className="text-xl font-black text-emerald-700">¥{calc.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 振込先 */}
        {(type === "invoice" || type === "estimate") && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">振込先口座</h3>
              {profile.bankName && (
                <button type="button" onClick={fillBankFromProfile}
                  className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                  自社情報から入力
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>銀行名</label>
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                  placeholder="〇〇銀行" className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>支店名</label>
                <input type="text" value={bankBranch} onChange={e => setBankBranch(e.target.value)}
                  placeholder="〇〇支店" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>口座種別</label>
                <select value={bankAccountType} onChange={e => setBankAccountType(e.target.value)}
                  className={inputClass}>
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                  <option value="貯蓄">貯蓄</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>口座番号</label>
                <input type="text" inputMode="numeric" value={bankAccountNo} onChange={e => setBankAccountNo(e.target.value)}
                  placeholder="1234567" className={inputClass} />
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>口座名義（カタカナ）</label>
              <input type="text" value={bankAccountHolder} onChange={e => setBankAccountHolder(e.target.value)}
                placeholder="ヤマダ タロウ" className={inputClass} />
            </div>
            {bankName && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-slate-400 mb-1">印字プレビュー</p>
                <p className="text-xs font-bold text-slate-700">
                  {bankName} {bankBranch}　{bankAccountType}　{bankAccountNo}
                </p>
                <p className="text-xs font-bold text-slate-700">{bankAccountHolder}</p>
              </div>
            )}
          </div>
        )}

        {/* 備考 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">備考</h3>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="例: お支払いは発行日より30日以内にお願いいたします。"
            rows={3}
            className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>

        {/* 保存ボタン */}
        <button type="submit" disabled={!clientName}
          className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2
            ${!clientName
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : submitted
              ? "bg-green-500 shadow-lg shadow-green-200"
              : "bg-slate-900 shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95"
            }`}>
          {submitted
            ? <><CheckCircle2 className="w-6 h-6" /> {isEdit ? "更新しました！" : "保存しました！"}</>
            : isEdit ? `${DOCUMENT_TYPE_LABELS[type]}を更新する` : `${DOCUMENT_TYPE_LABELS[type]}を保存する`
          }
        </button>
      </form>
    </motion.div>
  );
}