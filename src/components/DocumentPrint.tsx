// src/components/DocumentPrint.tsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDocuments } from "@/hooks/useDocuments";
import { DOCUMENT_TYPE_LABELS } from "@/types/document";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

export function DocumentPrint() {
  const { id } = useParams<{ id: string }>();
  const { documents, loading } = useDocuments();
  const navigate = useNavigate();
  const doc = documents.find(d => d.id === id);

  useEffect(() => {
    if (!loading && doc) {
      // レンダリング後に印刷ダイアログを開く
      setTimeout(() => window.print(), 500);
    }
  }, [loading, doc]);

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-slate-500 animate-spin" />
    </div>
  );

  if (!doc) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <p className="text-slate-500 font-bold">書類が見つかりません</p>
      <button onClick={() => navigate("/documents")}
        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">
        一覧に戻る
      </button>
    </div>
  );

  const hasInvoiceNo = !!doc.invoiceRegistrationNo;
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      {/* 印刷時以外に表示するコントロール */}
      <div className="print:hidden p-4 flex gap-3">
        <button onClick={() => navigate("/documents")}
          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold active:scale-95 transition-all">
          ← 一覧に戻る
        </button>
        <button onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold active:scale-95 transition-all">
          PDF保存・印刷
        </button>
      </div>

      {/* 印刷レイアウト */}
      <div id="doc-print" className="doc-print-container">
        <div className="doc-print-page">

          {/* タイトル */}
          <div className="doc-title-row">
            <h1 className="doc-title">{DOCUMENT_TYPE_LABELS[doc.type]}</h1>
            <div className="doc-doc-number">
              <p>書類番号: {doc.documentNumber}</p>
              <p>発行日: {doc.issueDate}</p>
              {doc.dueDate      && <p>支払期限: {doc.dueDate}</p>}
              {doc.deliveryDate && <p>納品日: {doc.deliveryDate}</p>}
            </div>
          </div>

          {/* 宛先 ↔ 発行者 */}
          <div className="doc-header-grid">
            {/* 宛先 */}
            <div className="doc-client-block">
              <p className="doc-client-name">{doc.clientName} 御中</p>
              {doc.clientDepartment && <p className="doc-client-dept">{doc.clientDepartment}</p>}
              {doc.clientAddress    && <p className="doc-small">{doc.clientAddress}</p>}
            </div>

            {/* 発行者 */}
            <div className="doc-issuer-block">
              <p className="doc-issuer-name">{doc.issuerName}</p>
              {doc.issuerAddress && <p className="doc-small">{doc.issuerAddress}</p>}
              {doc.issuerPhone   && <p className="doc-small">TEL: {doc.issuerPhone}</p>}
              {doc.issuerEmail   && <p className="doc-small">Email: {doc.issuerEmail}</p>}
              {hasInvoiceNo && (
                <p className="doc-small doc-invoice-no">
                  登録番号: {doc.invoiceRegistrationNo}
                </p>
              )}
            </div>
          </div>

          {/* 合計金額（強調表示） */}
          <div className="doc-total-highlight">
            <span className="doc-total-label">
              {doc.type === "invoice" ? "ご請求金額" : "合計金額"}（税込）
            </span>
            <span className="doc-total-amount">{yen(doc.total)}</span>
          </div>

          {/* 品目テーブル */}
          <table className="doc-table">
            <thead>
              <tr>
                <th className="doc-th" style={{ width: "40%" }}>品目・内容</th>
                <th className="doc-th" style={{ width: "10%" }}>数量</th>
                <th className="doc-th" style={{ width: "8%" }}>単位</th>
                <th className="doc-th" style={{ width: "15%" }}>単価</th>
                <th className="doc-th" style={{ width: "8%" }}>税率</th>
                <th className="doc-th" style={{ width: "19%" }}>金額（税抜）</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map(item => (
                <tr key={item.id} className="doc-tr">
                  <td className="doc-td">{item.description}</td>
                  <td className="doc-td doc-td-center">{item.quantity}</td>
                  <td className="doc-td doc-td-center">{item.unit}</td>
                  <td className="doc-td doc-td-right">{yen(item.unitPrice)}</td>
                  <td className="doc-td doc-td-center">
                    {item.taxRate}%{item.taxRate === 8 && " ※"}
                  </td>
                  <td className="doc-td doc-td-right">
                    {yen(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 小計・税額・合計 */}
          <div className="doc-summary">
            <table className="doc-summary-table">
              <tbody>
                <tr>
                  <td className="doc-summary-label">小計（税抜）</td>
                  <td className="doc-summary-value">{yen(doc.subtotal)}</td>
                </tr>
                {doc.tax10 > 0 && (
                  <tr>
                    <td className="doc-summary-label">消費税（10%）</td>
                    <td className="doc-summary-value">{yen(doc.tax10)}</td>
                  </tr>
                )}
                {doc.tax8 > 0 && (
                  <tr>
                    <td className="doc-summary-label">消費税（8% 軽減税率）</td>
                    <td className="doc-summary-value">{yen(doc.tax8)}</td>
                  </tr>
                )}
                <tr className="doc-summary-total-row">
                  <td className="doc-summary-label">合計（税込）</td>
                  <td className="doc-summary-value">{yen(doc.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 軽減税率の注記 */}
          {doc.tax8 > 0 && (
            <p className="doc-note">※ 軽減税率（8%）対象品目</p>
          )}

          {/* 備考 */}
          {doc.notes && (
            <div className="doc-remarks">
              <p className="doc-remarks-title">備考</p>
              <p className="doc-remarks-text">{doc.notes}</p>
            </div>
          )}

          {/* フッター */}
          <div className="doc-footer">
            <p>出力日: {today}　　SmartLedger AI</p>
          </div>
        </div>
      </div>
    </>
  );
}