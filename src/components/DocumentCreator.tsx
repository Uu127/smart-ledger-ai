// src/components/DocumentCreator.tsx
import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "式",
    unitPrice: 0,
    taxRate: 10,
  };
}

// 税込→税抜 変換
function taxIncToEx(taxInc: number, rate: 10 | 8 | 0): number {
  if (rate === 0) return taxInc;
  return Math.floor(taxInc / (1 + rate / 100));
}

export function DocumentCreator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { documents, addDocument } = useDocuments();
  const { profile } = useIssuerProfile();

  // URLパラメータから書類種別・引き継ぎ元を取得
  const initialType = (searchParams.get("type") as DocumentType) ?? "invoice";
  const fromId      = searchParams.get("from"); // 請求書から領収書を作る場合

  // 引き継ぎ元の請求書データ
  const sourceDoc = fromId ? documents.find(d => d.id === fromId) : null;

  const [type, setType]           = useState<DocumentType>(initialType);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate]     = useState("");
  const [deliveryDate, setDeliveryDate] = useState(sourceDoc?.issueDate ?? "");
  const [clientName, setClientName]     = useState(sourceDoc?.clientName ?? "");
  const [clientAddress, setClientAddress] = useState(sourceDoc?.clientAddress ?? "");
  const [clientDept, setClientDept]     = useState(sourceDoc?.clientDepartment ?? "");
  const [items, setItems]         = useState<DocumentItem[]>(
    sourceDoc?.items ?? [newItem()]
  );
  const [notes, setNotes]         = useState(sourceDoc?.notes ?? "");
  const [submitted, setSubmitted] = useState(false);

  // 税込入力モード（品目ごとに切り替え可能）
  const [taxIncMode, setTaxIncMode] = useState(false);

  const docNumber = generateDocumentNumber(type, documents.filter(d => d.type === type).length);
  const calc      = calcDocument(items);

  const addItem    = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = (id: string, key: keyof DocumentItem, value: string | number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: value } : i));

  // 税込金額入力 → 税抜単価に変換してセット
  const handleTaxIncPrice = (id: string, taxIncValue: number, rate: 10 | 8 | 0) => {
    const exPrice = taxIncToEx(taxIncValue, rate);
    updateItem(id, "unitPrice", exPrice);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) return;
    setSubmitted(true);

    await addDocument({
      type,
      documentNumber: docNumber,
      issueDate,
      dueDate:       type === "invoice"  ? dueDate      : undefined,
      deliveryDate:  (type === "delivery" || type === "receipt") ? deliveryDate : undefined,
      issuerName:    profile.name,
      issuerAddress: profile.address,
      issuerPhone:   profile.phone,
      issuerEmail:   profile.email,
      invoiceRegistrationNo: profile.invoiceRegistrationNo,
      clientName,
      clientAddress,
      clientDepartment: clientDept,
      items,
      subtotal: calc.subtotal,
      tax10:    calc.tax10Amount,
      tax8:     calc.tax8Amount,
      total:    calc.total,
      notes,
      status: "draft",
    });

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
              {sourceDoc ? `${DOCUMENT_TYPE_LABELS["invoice"]}から${DOCUMENT_TYPE_LABELS[type]}を作成` : "書類を作成"}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Document Creator</p>
          </div>
        </div>
        {sourceDoc && (
          <div className="mt-2 bg-white/10 rounded-xl px-3 py-2">
            <p className="text-[10px] font-bold text-slate-300">
              {sourceDoc.documentNumber} / {sourceDoc.clientName} の情報を引き継ぎました
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* 書類種別 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">書類の種類</h3>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`py-3 rounded-xl text-sm font-black transition-all active:scale-95 border-2 ${
                  type === t ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-100 bg-slate-50 text-slate-500"
                }`}>
                {DOCUMENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
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
              placeholder="例: 東京都〇〇区..." className={inputClass} />
          </div>
        </div>

        {/* 品目 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">品目・内容</h3>
            <div className="flex items-center gap-2">
              {/* 税込/税抜 切り替えトグル */}
              <button type="button" onClick={() => setTaxIncMode(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-black active:scale-95 transition-all hover:bg-slate-100">
                {taxIncMode
                  ? <><ToggleRight className="w-4 h-4 text-emerald-500" /> 税込入力中</>
                  : <><ToggleLeft className="w-4 h-4" /> 税抜入力</>
                }
              </button>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-black active:scale-95 transition-all">
                <Plus className="w-3.5 h-3.5" /> 追加
              </button>
            </div>
          </div>

          {taxIncMode && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-600">
                💡 税込金額を入力すると、税率から税抜単価を自動計算します
              </p>
            </div>
          )}

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

                {/* 品目名 */}
                <div className="space-y-1">
                  <label className={labelClass}>品目・内容</label>
                  <input type="text" value={item.description}
                    onChange={e => updateItem(item.id, "description", e.target.value)}
                    placeholder="例: Webサイト制作費" required
                    className="w-full p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>

                {/* 数量・単位・税率 */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className={labelClass}>数量</label>
                    <input type="number" value={item.quantity} min={0} step={0.5}
                      onChange={e => updateItem(item.id, "quantity", Number(e.target.value))}
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

                {/* 単価入力（税抜 or 税込） */}
                <div className="space-y-1">
                  <label className={labelClass}>
                    単価（{taxIncMode ? "税込" : "税抜"}）
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">¥</span>
                    {taxIncMode ? (
                      /* 税込入力 → 表示は税込、保存は税抜に変換 */
                      <input type="number" inputMode="numeric" min={0}
                        defaultValue={item.taxRate > 0
                          ? Math.ceil(item.unitPrice * (1 + item.taxRate / 100))
                          : item.unitPrice}
                        onChange={e => handleTaxIncPrice(item.id, Number(e.target.value), item.taxRate)}
                        className="w-full pl-7 p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    ) : (
                      /* 税抜入力 */
                      <input type="number" inputMode="numeric" value={item.unitPrice} min={0}
                        onChange={e => updateItem(item.id, "unitPrice", Number(e.target.value))}
                        className="w-full pl-7 p-3 rounded-xl bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    )}
                  </div>
                  {/* 税込/税抜の参考表示 */}
                  {item.unitPrice > 0 && item.taxRate > 0 && (
                    <p className="text-[10px] font-bold text-slate-400">
                      {taxIncMode
                        ? `税抜単価: ¥${item.unitPrice.toLocaleString()}`
                        : `税込単価: ¥${Math.ceil(item.unitPrice * (1 + item.taxRate / 100)).toLocaleString()}`
                      }
                    </p>
                  )}
                </div>

                {/* 行合計 */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400">小計（税抜）</span>
                  <span className="text-sm font-black text-slate-700">
                    ¥{(item.quantity * item.unitPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 合計金額 */}
          <div className="bg-emerald-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>小計（税抜）</span>
              <span>¥{calc.subtotal.toLocaleString()}</span>
            </div>
            {calc.tax10Amount > 0 && (
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>消費税（10%）</span>
                <span>¥{calc.tax10Amount.toLocaleString()}</span>
              </div>
            )}
            {calc.tax8Amount > 0 && (
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>消費税（8% 軽減税率）</span>
                <span>¥{calc.tax8Amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
              <span className="text-sm font-black text-slate-800">合計金額（税込）</span>
              <span className="text-xl font-black text-emerald-700">¥{calc.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 備考 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50 space-y-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">備考・振込先</h3>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={`例: お支払いは発行日より30日以内にお願いいたします。\n振込先: 〇〇銀行 〇〇支店 普通 1234567 ヤマダ タロウ`}
            rows={4}
            className="w-full p-3 rounded-xl bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          {profile.bankName && !notes && (
            <button type="button"
              onClick={() => setNotes(`振込先: ${profile.bankName} ${profile.bankBranch} ${profile.bankAccountType} ${profile.bankAccountNo} ${profile.bankAccountHolder}`)}
              className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
              振込先を自動入力
            </button>
          )}
        </div>

        {/* 保存ボタン */}
        <button type="submit" disabled={!clientName}
          className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2
            ${!clientName ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : submitted ? "bg-green-500 shadow-lg shadow-green-200"
              : "bg-slate-900 shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95"}`}>
          {submitted
            ? <><CheckCircle2 className="w-6 h-6" /> 保存しました！</>
            : `${DOCUMENT_TYPE_LABELS[type]}を保存する`
          }
        </button>
      </form>
    </motion.div>
  );
}