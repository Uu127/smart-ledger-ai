// src/components/DocumentList.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Trash2, Printer, Building2, Receipt, TrendingUp, Package, ClipboardList, Pencil } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { DOCUMENT_TYPE_LABELS, type DocumentType, type BusinessDocument } from "@/types/document";

const TYPE_COLORS: Record<DocumentType, string> = {
  invoice:  "bg-blue-100 text-blue-700",
  receipt:  "bg-green-100 text-green-700",
  estimate: "bg-amber-100 text-amber-700",
  delivery: "bg-purple-100 text-purple-700",
};

const TYPE_ICONS: Record<DocumentType, React.ElementType> = {
  invoice:  TrendingUp,
  receipt:  Receipt,
  estimate: ClipboardList,
  delivery: Package,
};

const TYPE_BG: Record<DocumentType, string> = {
  invoice:  "bg-blue-500",
  receipt:  "bg-green-500",
  estimate: "bg-amber-500",
  delivery: "bg-purple-500",
};

const STATUS_LABELS = {
  draft: { label: "下書き",   color: "bg-slate-100 text-slate-500" },
  sent:  { label: "送付済み", color: "bg-blue-100 text-blue-600"   },
  paid:  { label: "入金済み", color: "bg-green-100 text-green-600" },
};

export function DocumentList() {
  const navigate = useNavigate();
  const { documents, loading, deleteDocument, updateDocument } = useDocuments();
  const [filter, setFilter] = useState<DocumentType | "all">("all");

  const filtered = filter === "all" ? documents : documents.filter(d => d.type === filter);

  const createReceiptFromInvoice = (invoice: BusinessDocument) => {
    navigate(`/documents/new?from=${invoice.id}&type=receipt`);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4 pb-24">

      {/* タイトル */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900">書類</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">請求書・領収書 等</p>
        </div>
        <Link to="/documents/settings"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black active:scale-95 transition-all hover:bg-slate-200">
          <Building2 className="w-4 h-4" /> 自社情報
        </Link>
      </div>

      {/* 書類作成ボタン */}
      <div className="grid grid-cols-2 gap-3">
        {(["invoice", "receipt", "estimate", "delivery"] as DocumentType[]).map(t => {
          const Icon = TYPE_ICONS[t];
          return (
            <Link key={t} to={`/documents/new?type=${t}`}
              className={`${TYPE_BG[t]} rounded-2xl p-4 text-white flex items-center gap-3 active:scale-95 transition-all shadow-sm`}>
              <div className="bg-white/20 p-2 rounded-xl shrink-0"><Icon className="w-4 h-4" /></div>
              <div>
                <p className="text-xs font-black">{DOCUMENT_TYPE_LABELS[t]}</p>
                <p className="text-[9px] font-bold opacity-80">新規作成</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* フィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "invoice", "receipt", "estimate", "delivery"] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
              filter === t ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-100"
            }`}>
            {t === "all" ? "すべて" : DOCUMENT_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-10 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-slate-500 animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-300">書類がありません</p>
          <p className="text-xs text-slate-200 mt-1">上のボタンから作成してください</p>
        </div>
      )}

      {/* 書類リスト */}
      <div className="space-y-3">
        {filtered.map(doc => (
          <div key={doc.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${TYPE_COLORS[doc.type]}`}>
                  {DOCUMENT_TYPE_LABELS[doc.type]}
                </span>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${STATUS_LABELS[doc.status].color}`}>
                  {STATUS_LABELS[doc.status].label}
                </span>
              </div>
              <div className="flex gap-1">
                {/* 編集ボタン */}
                <Link to={`/documents/${doc.id}/edit`}
                  className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg active:scale-90 transition-all">
                  <Pencil className="w-4 h-4" />
                </Link>
                {/* 印刷ボタン */}
                <Link to={`/documents/${doc.id}/print`}
                  className="p-2 text-slate-300 hover:text-slate-600 active:scale-90 transition-all">
                  <Printer className="w-4 h-4" />
                </Link>
                {/* 削除ボタン */}
                <button onClick={() => {
                  if (confirm("この書類を削除しますか？")) deleteDocument(doc.id);
                }} className="p-2 text-slate-300 hover:text-red-400 active:scale-90 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="font-black text-slate-800 text-sm mb-1">{doc.clientName} 御中</p>
            <p className="text-[10px] font-bold text-slate-400 mb-3">
              {doc.documentNumber}　{doc.issueDate}
            </p>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xl font-black text-slate-900">
                <span className="text-xs mr-0.5">¥</span>{doc.total.toLocaleString()}
              </span>

              <div className="flex gap-1.5 flex-wrap">
                {doc.type === "invoice" && doc.status !== "draft" && (
                  <button onClick={() => createReceiptFromInvoice(doc)}
                    className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-green-50 text-green-600 active:scale-95 transition-all">
                    領収書を作成
                  </button>
                )}
                {doc.status === "draft" && (
                  <button onClick={() => updateDocument(doc.id, { status: "sent" })}
                    className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 active:scale-95 transition-all">
                    送付済みにする
                  </button>
                )}
                {doc.status === "sent" && doc.type === "invoice" && (
                  <button onClick={() => updateDocument(doc.id, { status: "paid" })}
                    className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-green-50 text-green-600 active:scale-95 transition-all">
                    入金済みにする
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}