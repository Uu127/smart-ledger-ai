// src/components/DocumentList.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, Printer, Settings } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/types/document";

const TYPE_COLORS: Record<DocumentType, string> = {
  invoice:  "bg-blue-100 text-blue-700",
  receipt:  "bg-green-100 text-green-700",
  estimate: "bg-amber-100 text-amber-700",
  delivery: "bg-purple-100 text-purple-700",
};

const STATUS_LABELS = {
  draft: { label: "下書き",   color: "bg-slate-100 text-slate-500" },
  sent:  { label: "送付済み", color: "bg-blue-100 text-blue-600"   },
  paid:  { label: "入金済み", color: "bg-green-100 text-green-600" },
};

export function DocumentList() {
  const { documents, loading, deleteDocument, updateDocument } = useDocuments();
  const [filter, setFilter] = useState<DocumentType | "all">("all");

  const filtered = filter === "all" ? documents : documents.filter(d => d.type === filter);

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
        <div className="flex gap-2">
          <Link to="/documents/settings"
            className="p-2.5 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-slate-600 transition-all active:scale-95">
            <Settings className="w-5 h-5" />
          </Link>
          <Link to="/documents/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-black active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> 新規作成
          </Link>
        </div>
      </div>

      {/* フィルタータブ */}
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
          <Link to="/documents/new"
            className="inline-flex items-center gap-1 mt-3 text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl active:scale-95 transition-all">
            <Plus className="w-3.5 h-3.5" /> 書類を作成する
          </Link>
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
                <Link to={`/documents/${doc.id}/print`}
                  className="p-2 text-slate-300 hover:text-slate-600 active:scale-90 transition-all">
                  <Printer className="w-4 h-4" />
                </Link>
                <button onClick={() => {
                  if (confirm("この書類を削除しますか？")) deleteDocument(doc.id);
                }}
                  className="p-2 text-slate-300 hover:text-red-400 active:scale-90 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="font-black text-slate-800 text-sm mb-1">{doc.clientName} 御中</p>
            <p className="text-[10px] font-bold text-slate-400 mb-3">
              {doc.documentNumber}　{doc.issueDate}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-slate-900">
                <span className="text-xs mr-0.5">¥</span>
                {doc.total.toLocaleString()}
              </span>

              {/* ステータス更新 */}
              <div className="flex gap-1">
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