// src/components/DocumentPrint.tsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { DOCUMENT_TYPE_LABELS } from "@/types/document";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

// 書類タイトルの表示名（御〜書 形式）
function getDocTitle(type: string): string {
  const map: Record<string, string> = {
    invoice:  "御請求書",
    receipt:  "領収書",
    estimate: "御見積書",
    delivery: "納品書",
  };
  return map[type] ?? DOCUMENT_TYPE_LABELS[type as never] ?? type;
}

export function DocumentPrint() {
  const { id } = useParams<{ id: string }>();
  const { documents, loading } = useDocuments();
  const navigate = useNavigate();
  const doc = documents.find(d => d.id === id);

  useEffect(() => {
    if (!loading && doc) {
      setTimeout(() => window.print(), 600);
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

  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const docTitle = getDocTitle(doc.type);

  return (
    <>
      {/* 画面表示用コントロール */}
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

      {/* 印刷プレビュー（画面でも見やすく表示） */}
      <div className="print:hidden p-6 bg-slate-100 min-h-screen">
        <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <PrintBody doc={doc} docTitle={docTitle} today={today} />
        </div>
      </div>

      {/* 印刷用レイアウト */}
      <div className="hidden print:block">
        <PrintBody doc={doc} docTitle={docTitle} today={today} />
      </div>
    </>
  );
}

function PrintBody({ doc, docTitle, today }: {
  doc: ReturnType<typeof useDocuments>["documents"][number];
  docTitle: string;
  today: string;
}) {
  return (
    <div style={{
      fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif',
      fontSize: "11pt",
      color: "#1e293b",
      padding: "20mm 18mm 16mm",
      boxSizing: "border-box",
    }}>

      {/* タイトル */}
      <div style={{ textAlign: "center", marginBottom: "10mm" }}>
        <h1 style={{ fontSize: "22pt", fontWeight: "bold", margin: "0 0 3mm 0", letterSpacing: "0.1em" }}>
          {docTitle}
        </h1>
        <div style={{ display: "flex", justifyContent: "center", gap: "8mm", fontSize: "9pt", color: "#64748b" }}>
          <span>書類番号: {doc.documentNumber}</span>
          <span>発行日: {doc.issueDate}</span>
          {doc.dueDate      && <span>支払期限: {doc.dueDate}</span>}
          {doc.deliveryDate && <span>{doc.type === "receipt" ? "受領日" : "納品日"}: {doc.deliveryDate}</span>}
        </div>
      </div>

      {/* 宛先 ↔ 発行者 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm", gap: "10mm" }}>
        {/* 宛先 */}
        <div style={{ flex: 1 }}>
          {doc.clientAddress && (
            <p style={{ fontSize: "8.5pt", color: "#64748b", margin: "0 0 2mm 0" }}>{doc.clientAddress}</p>
          )}
          <p style={{ fontSize: "15pt", fontWeight: "bold", borderBottom: "1.5px solid #1e293b", paddingBottom: "2mm", margin: "0 0 2mm 0" }}>
            {doc.clientName} 御中
          </p>
          {doc.clientDepartment && (
            <p style={{ fontSize: "9pt", color: "#475569", margin: "0" }}>{doc.clientDepartment}</p>
          )}
        </div>

        {/* 発行者 */}
        <div style={{ textAlign: "right", fontSize: "9pt", minWidth: "150px" }}>
          <p style={{ fontSize: "11pt", fontWeight: "bold", margin: "0 0 2mm 0" }}>{doc.issuerName}</p>
          {doc.issuerAddress && <p style={{ color: "#64748b", margin: "1mm 0" }}>{doc.issuerAddress}</p>}
          {doc.issuerPhone   && <p style={{ color: "#64748b", margin: "1mm 0" }}>TEL: {doc.issuerPhone}</p>}
          {doc.issuerEmail   && <p style={{ color: "#64748b", margin: "1mm 0" }}>{doc.issuerEmail}</p>}
          {doc.invoiceRegistrationNo && (
            <p style={{ fontSize: "8pt", color: "#1e293b", fontWeight: "bold", margin: "2mm 0 0 0", borderTop: "1px solid #e2e8f0", paddingTop: "1mm" }}>
              登録番号: {doc.invoiceRegistrationNo}
            </p>
          )}
        </div>
      </div>

      {/* 合計金額ハイライト */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#f0fdf4", border: "1.5px solid #10b981", borderRadius: "4px",
        padding: "4mm 6mm", marginBottom: "7mm",
      }}>
        <span style={{ fontSize: "10pt", fontWeight: "bold", color: "#065f46" }}>
          {doc.type === "invoice" ? "ご請求金額（税込）" : "合計金額（税込）"}
        </span>
        <span style={{ fontSize: "20pt", fontWeight: "bold", color: "#065f46" }}>
          {yen(doc.total)}
        </span>
      </div>

      {/* 品目テーブル */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", marginBottom: "5mm" }}>
        <thead>
          <tr style={{ background: "#1e293b", color: "#fff" }}>
            <th style={{ padding: "3mm 4mm", textAlign: "left", fontWeight: "bold", width: "42%" }}>品目・内容</th>
            <th style={{ padding: "3mm 4mm", textAlign: "center", fontWeight: "bold", width: "10%" }}>数量</th>
            <th style={{ padding: "3mm 4mm", textAlign: "center", fontWeight: "bold", width: "8%" }}>単位</th>
            <th style={{ padding: "3mm 4mm", textAlign: "right",  fontWeight: "bold", width: "16%" }}>単価（税抜）</th>
            <th style={{ padding: "3mm 4mm", textAlign: "center", fontWeight: "bold", width: "8%" }}>税率</th>
            <th style={{ padding: "3mm 4mm", textAlign: "right",  fontWeight: "bold", width: "16%" }}>金額（税抜）</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
              <td style={{ padding: "3mm 4mm", borderBottom: "1px solid #e2e8f0" }}>{item.description}</td>
              <td style={{ padding: "3mm 4mm", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>{item.quantity}</td>
              <td style={{ padding: "3mm 4mm", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>{item.unit}</td>
              <td style={{ padding: "3mm 4mm", textAlign: "right",  borderBottom: "1px solid #e2e8f0" }}>{yen(item.unitPrice)}</td>
              <td style={{ padding: "3mm 4mm", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>
                {item.taxRate}%{item.taxRate === 8 ? " ※" : ""}
              </td>
              <td style={{ padding: "3mm 4mm", textAlign: "right",  borderBottom: "1px solid #e2e8f0" }}>
                {yen(item.quantity * item.unitPrice)}
              </td>
            </tr>
          ))}
          {/* 空行でテーブルを埋める */}
          {doc.items.length < 5 && Array.from({ length: 5 - doc.items.length }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td colSpan={6} style={{ padding: "3mm 4mm", borderBottom: "1px solid #e2e8f0" }}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 小計・税額・合計 */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6mm" }}>
        <table style={{ width: "220px", borderCollapse: "collapse", fontSize: "9pt" }}>
          <tbody>
            <tr>
              <td style={{ padding: "2mm 4mm", color: "#64748b", border: "1px solid #e2e8f0" }}>小計（税抜）</td>
              <td style={{ padding: "2mm 4mm", textAlign: "right", border: "1px solid #e2e8f0" }}>{yen(doc.subtotal)}</td>
            </tr>
            {doc.tax10 > 0 && (
              <tr>
                <td style={{ padding: "2mm 4mm", color: "#64748b", border: "1px solid #e2e8f0" }}>消費税（10%）</td>
                <td style={{ padding: "2mm 4mm", textAlign: "right", border: "1px solid #e2e8f0" }}>{yen(doc.tax10)}</td>
              </tr>
            )}
            {doc.tax8 > 0 && (
              <tr>
                <td style={{ padding: "2mm 4mm", color: "#64748b", border: "1px solid #e2e8f0" }}>消費税（8% 軽減）</td>
                <td style={{ padding: "2mm 4mm", textAlign: "right", border: "1px solid #e2e8f0" }}>{yen(doc.tax8)}</td>
              </tr>
            )}
            <tr style={{ background: "#f0fdf4" }}>
              <td style={{ padding: "3mm 4mm", fontWeight: "bold", borderTop: "2px solid #10b981", border: "1px solid #e2e8f0" }}>合計（税込）</td>
              <td style={{ padding: "3mm 4mm", textAlign: "right", fontWeight: "bold", borderTop: "2px solid #10b981", border: "1px solid #e2e8f0" }}>{yen(doc.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {doc.tax8 > 0 && (
        <p style={{ fontSize: "7.5pt", color: "#64748b", margin: "0 0 5mm 0" }}>※ 軽減税率（8%）対象品目</p>
      )}

      {/* 備考 */}
      {doc.notes && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4mm 5mm", marginBottom: "6mm" }}>
          <p style={{ fontSize: "8pt", fontWeight: "bold", color: "#475569", margin: "0 0 2mm 0" }}>備考</p>
          <p style={{ fontSize: "8.5pt", color: "#1e293b", whiteSpace: "pre-wrap", margin: 0 }}>{doc.notes}</p>
        </div>
      )}

      {/* フッター */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "3mm", textAlign: "right", fontSize: "7.5pt", color: "#94a3b8" }}>
        <p style={{ margin: 0 }}>出力日: {today}　　SmartLedger AI</p>
      </div>
    </div>
  );
}