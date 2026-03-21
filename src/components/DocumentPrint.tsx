// src/components/DocumentPrint.tsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import type { } from "@/types/document";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

function getDocTitle(type: string): string {
  return { invoice: "御請求書", receipt: "領収書", estimate: "御見積書", delivery: "納品書" }[type] ?? type;
}

type Doc = ReturnType<typeof useDocuments>["documents"][number];

export function DocumentPrint() {
  const { id }     = useParams<{ id: string }>();
  const { documents, loading } = useDocuments();
  const navigate   = useNavigate();
  const doc        = documents.find(d => d.id === id);

  useEffect(() => {
    if (!loading && doc) setTimeout(() => window.print(), 600);
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
        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">一覧に戻る</button>
    </div>
  );

  const today    = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const docTitle = getDocTitle(doc.type);
  const hasBankInfo = !!(doc.bankName && doc.bankAccountNo);

  return (
    <>
      {/* 画面コントロール */}
      <div className="print:hidden p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
        <button onClick={() => navigate("/documents")}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold active:scale-95 transition-all">
          ← 一覧に戻る
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold active:scale-95 transition-all">
          <Printer className="w-4 h-4" /> PDF保存・印刷
        </button>
        <p className="text-xs text-slate-400 font-bold">印刷ダイアログで「PDFに保存」を選択</p>
      </div>

      {/* 画面プレビュー */}
      <div className="print:hidden p-6 bg-slate-100 min-h-screen">
        <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <PrintBody doc={doc} docTitle={docTitle} today={today} hasBankInfo={hasBankInfo} />
        </div>
      </div>

      {/* 印刷用 */}
      <div className="hidden print:block">
        <PrintBody doc={doc} docTitle={docTitle} today={today} hasBankInfo={hasBankInfo} />
      </div>
    </>
  );
}

function PrintBody({ doc, docTitle, today, hasBankInfo }: {
  doc: Doc; docTitle: string; today: string; hasBankInfo: boolean;
}) {
  const s = (style: React.CSSProperties): React.CSSProperties => style;

  return (
    <div style={s({
      fontFamily: '"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif',
      fontSize: "10pt", color: "#1e293b",
      padding: "18mm 18mm 14mm", boxSizing: "border-box",
    })}>

      {/* タイトル */}
      <div style={s({ textAlign: "center", marginBottom: "8mm" })}>
        <h1 style={s({ fontSize: "20pt", fontWeight: "bold", margin: "0 0 2mm 0", letterSpacing: "0.12em" })}>
          {docTitle}
        </h1>
        <div style={s({ display: "flex", justifyContent: "center", gap: "6mm", fontSize: "8.5pt", color: "#64748b" })}>
          <span>書類番号: {doc.documentNumber}</span>
          <span>発行日: {doc.issueDate}</span>
          {doc.dueDate      && <span>支払期限: {doc.dueDate}</span>}
          {doc.deliveryDate && <span>{doc.type === "receipt" ? "受領日" : "納品日"}: {doc.deliveryDate}</span>}
        </div>
      </div>

      {/* 宛先 ↔ 発行者 */}
      <div style={s({ display: "flex", justifyContent: "space-between", marginBottom: "7mm", gap: "8mm" })}>
        <div style={s({ flex: 1 })}>
          {doc.clientAddress && (
            <p style={s({ fontSize: "8pt", color: "#64748b", margin: "0 0 1.5mm 0" })}>{doc.clientAddress}</p>
          )}
          <p style={s({ fontSize: "14pt", fontWeight: "bold", borderBottom: "1.5px solid #1e293b", paddingBottom: "2mm", margin: "0 0 2mm 0" })}>
            {doc.clientName} 御中
          </p>
          {doc.clientDepartment && (
            <p style={s({ fontSize: "9pt", color: "#475569", margin: "0" })}>{doc.clientDepartment}</p>
          )}
        </div>
        <div style={s({ textAlign: "right", fontSize: "8.5pt", minWidth: "140px" })}>
          <p style={s({ fontSize: "11pt", fontWeight: "bold", margin: "0 0 1.5mm 0" })}>{doc.issuerName}</p>
          {doc.issuerAddress && <p style={s({ color: "#64748b", margin: "0.8mm 0" })}>{doc.issuerAddress}</p>}
          {doc.issuerPhone   && <p style={s({ color: "#64748b", margin: "0.8mm 0" })}>TEL: {doc.issuerPhone}</p>}
          {doc.issuerEmail   && <p style={s({ color: "#64748b", margin: "0.8mm 0" })}>{doc.issuerEmail}</p>}
          {doc.invoiceRegistrationNo && (
            <p style={s({ fontSize: "7.5pt", fontWeight: "bold", borderTop: "1px solid #e2e8f0", paddingTop: "1mm", marginTop: "1.5mm" })}>
              登録番号: {doc.invoiceRegistrationNo}
            </p>
          )}
        </div>
      </div>

      {/* 合計金額ハイライト */}
      <div style={s({
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#f0fdf4", border: "1.5px solid #10b981", borderRadius: "4px",
        padding: "3.5mm 6mm", marginBottom: "6mm",
      })}>
        <span style={s({ fontSize: "9.5pt", fontWeight: "bold", color: "#065f46" })}>
          {doc.type === "invoice" ? "ご請求金額（税込）" : "合計金額（税込）"}
        </span>
        <span style={s({ fontSize: "18pt", fontWeight: "bold", color: "#065f46" })}>
          {yen(doc.total)}
        </span>
      </div>

      {/* 品目テーブル */}
      <table style={s({ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", marginBottom: "4mm" })}>
        <thead>
          <tr style={s({ background: "#1e293b", color: "#fff" })}>
            {[
              { label: "品目・内容", w: "42%", align: "left" },
              { label: "数量",       w: "9%",  align: "center" },
              { label: "単位",       w: "7%",  align: "center" },
              { label: "単価（税抜）", w: "16%", align: "right" },
              { label: "税率",       w: "8%",  align: "center" },
              { label: "金額（税抜）", w: "18%", align: "right" },
            ].map(({ label, w, align }) => (
              <th key={label} style={s({ padding: "2.5mm 3.5mm", textAlign: align as never, fontWeight: "bold", width: w })}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={item.id} style={s({ background: i % 2 === 1 ? "#f8fafc" : "#fff" })}>
              <td style={s({ padding: "2.5mm 3.5mm", borderBottom: "1px solid #e2e8f0" })}>{item.description}</td>
              <td style={s({ padding: "2.5mm 3.5mm", textAlign: "center", borderBottom: "1px solid #e2e8f0" })}>{item.quantity}</td>
              <td style={s({ padding: "2.5mm 3.5mm", textAlign: "center", borderBottom: "1px solid #e2e8f0" })}>{item.unit}</td>
              <td style={s({ padding: "2.5mm 3.5mm", textAlign: "right",  borderBottom: "1px solid #e2e8f0" })}>{yen(item.unitPrice)}</td>
              <td style={s({ padding: "2.5mm 3.5mm", textAlign: "center", borderBottom: "1px solid #e2e8f0" })}>
                {item.taxRate}%{item.taxRate === 8 ? " ※" : ""}
              </td>
              <td style={s({ padding: "2.5mm 3.5mm", textAlign: "right",  borderBottom: "1px solid #e2e8f0" })}>
                {yen(item.quantity * item.unitPrice)}
              </td>
            </tr>
          ))}
          {/* 空行パディング */}
          {doc.items.length < 6 && Array.from({ length: 6 - doc.items.length }).map((_, i) => (
            <tr key={`pad-${i}`}>
              <td colSpan={6} style={s({ padding: "2.5mm 3.5mm", borderBottom: "1px solid #e2e8f0" })}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 小計・税額 */}
      <div style={s({ display: "flex", justifyContent: "flex-end", marginBottom: "5mm" })}>
        <table style={s({ width: "210px", borderCollapse: "collapse", fontSize: "8.5pt" })}>
          <tbody>
            {[
              { label: "小計（税抜）", value: doc.subtotal, bold: false },
              ...(doc.tax10 > 0 ? [{ label: "消費税（10%）", value: doc.tax10, bold: false }] : []),
              ...(doc.tax8  > 0 ? [{ label: "消費税（8% 軽減）", value: doc.tax8,  bold: false }] : []),
              { label: "合計（税込）", value: doc.total,    bold: true  },
            ].map(({ label, value, bold }) => (
              <tr key={label} style={s({ background: bold ? "#f0fdf4" : "transparent" })}>
                <td style={s({ padding: "2mm 4mm", color: bold ? "#065f46" : "#64748b", fontWeight: bold ? "bold" : "normal", border: "1px solid #e2e8f0", borderTop: bold ? "2px solid #10b981" : undefined })}>
                  {label}
                </td>
                <td style={s({ padding: "2mm 4mm", textAlign: "right", fontWeight: bold ? "bold" : "normal", color: bold ? "#065f46" : "#1e293b", border: "1px solid #e2e8f0", borderTop: bold ? "2px solid #10b981" : undefined })}>
                  {yen(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {doc.tax8 > 0 && (
        <p style={s({ fontSize: "7pt", color: "#64748b", margin: "0 0 4mm 0" })}>※ 軽減税率（8%）対象品目</p>
      )}

      {/* 振込先（専用セクション） */}
      {hasBankInfo && (
        <div style={s({
          border: "1px solid #10b981", borderRadius: "4px",
          padding: "3.5mm 5mm", marginBottom: "5mm", background: "#f0fdf4",
        })}>
          <p style={s({ fontSize: "8pt", fontWeight: "bold", color: "#065f46", margin: "0 0 2mm 0" })}>
            お振込先
          </p>
          <div style={s({ display: "flex", gap: "8mm", fontSize: "8.5pt", color: "#1e293b" })}>
            <div>
              <p style={s({ margin: "0 0 1mm 0", fontWeight: "bold" })}>
                {doc.bankName}　{doc.bankBranch}
              </p>
              <p style={s({ margin: "0" })}>
                {doc.bankAccountType}　{doc.bankAccountNo}　{doc.bankAccountHolder}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 備考 */}
      {doc.notes && (
        <div style={s({ border: "1px solid #e2e8f0", borderRadius: "3px", padding: "3.5mm 5mm", marginBottom: "5mm" })}>
          <p style={s({ fontSize: "7.5pt", fontWeight: "bold", color: "#475569", margin: "0 0 1.5mm 0" })}>備考</p>
          <p style={s({ fontSize: "8.5pt", whiteSpace: "pre-wrap", margin: 0 })}>{doc.notes}</p>
        </div>
      )}

      {/* フッター */}
      <div style={s({ borderTop: "1px solid #e2e8f0", paddingTop: "2.5mm", textAlign: "right", fontSize: "7pt", color: "#94a3b8" })}>
        出力日: {today}　　SmartLedger AI
      </div>
    </div>
  );
}