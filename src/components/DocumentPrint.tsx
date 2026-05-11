// src/components/DocumentPrint.tsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

function getDocTitle(type: string): string {
  return { invoice: "請　求　書", receipt: "領　収　書", estimate: "御見積書", delivery: "納　品　書" }[type] ?? type;
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

  return (
    <>
      {/* 画面コントロール */}
      <div className="print:hidden p-4 border-b flex items-center gap-3"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
        <button onClick={() => navigate("/documents")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold active:scale-95 transition-all"
          style={{ borderColor: "var(--border)", color: "var(--text-sub)", backgroundColor: "var(--bg-card)" }}>
          <ArrowLeft className="w-4 h-4" /> 一覧に戻る
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold active:scale-95 transition-all">
          <Printer className="w-4 h-4" /> PDF保存・印刷
        </button>
        <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
          印刷ダイアログで「PDFに保存」を選択してください
        </p>
      </div>

      {/* 画面プレビュー */}
      <div className="print:hidden p-6 min-h-screen" style={{ backgroundColor: "#e2e8f0" }}>
        <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
          <PrintLayout doc={doc} docTitle={docTitle} today={today} />
        </div>
      </div>

      {/* 印刷用 */}
      <div className="hidden print:block">
        <PrintLayout doc={doc} docTitle={docTitle} today={today} />
      </div>
    </>
  );
}

function PrintLayout({ doc, docTitle, today }: { doc: Doc; docTitle: string; today: string }) {
  const hasBankInfo   = !!(doc.bankName && doc.bankAccountNo);
  const allZeroTax    = doc.items.every(i => i.taxRate === 0);
  const showTaxLabels = !allZeroTax || (doc.showTaxLabels ?? true);

  // 共通スタイル定数
  const border = "1px solid #cbd5e1";
  const ff     = '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif';

  return (
    <div style={{ fontFamily: ff, fontSize: "10pt", color: "#1e293b", background: "#fff", padding: "12mm 14mm 10mm" }}>

      {/* タイトル */}
      <div style={{ textAlign: "center", marginBottom: "6mm" }}>
        <h1 style={{ fontSize: "18pt", fontWeight: "bold", margin: 0, letterSpacing: "0.15em" }}>
          {docTitle}
        </h1>
      </div>

      {/* 書類情報行（右寄せ） */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "5mm" }}>
        <table style={{ fontSize: "8.5pt", borderCollapse: "collapse" }}>
          <tbody>
            {[
              { label: "請求書番号", value: doc.documentNumber },
              { label: "発　行　日", value: doc.issueDate },
              ...(doc.dueDate      ? [{ label: "お支払期限", value: doc.dueDate }] : []),
              ...(doc.deliveryDate ? [{ label: doc.type === "receipt" ? "受　領　日" : "納　品　日", value: doc.deliveryDate }] : []),
            ].map(({ label, value }) => (
              <tr key={label}>
                <td style={{ padding: "1mm 3mm 1mm 0", color: "#64748b", whiteSpace: "nowrap" }}>{label}：</td>
                <td style={{ padding: "1mm 0" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 宛先 ↔ 発行者 の2カラム */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm", marginBottom: "5mm", alignItems: "flex-start" }}>

        {/* 宛先 */}
        <div style={{ flex: 1 }}>
          {doc.clientAddress && (
            <p style={{ fontSize: "8pt", color: "#64748b", margin: "0 0 1mm 0" }}>{doc.clientAddress}</p>
          )}
          <p style={{ fontSize: "15pt", fontWeight: "bold", margin: "0 0 1mm 0", borderBottom: "2px solid #1e293b", paddingBottom: "1.5mm", display: "inline-block", minWidth: "60%" }}>
            {doc.clientName}　御中
          </p>
          {doc.clientDepartment && (
            <p style={{ fontSize: "9pt", color: "#475569", margin: "1mm 0 0 0" }}>{doc.clientDepartment}</p>
          )}
        </div>

        {/* 発行者情報 */}
        <div style={{ textAlign: "right", fontSize: "8.5pt", color: "#1e293b", minWidth: "140px" }}>
          <p style={{ fontSize: "11pt", fontWeight: "bold", margin: "0 0 1.5mm 0" }}>{doc.issuerName}</p>
          {doc.issuerAddress && <p style={{ margin: "0.5mm 0", color: "#64748b" }}>{doc.issuerAddress}</p>}
          {doc.issuerPhone   && <p style={{ margin: "0.5mm 0", color: "#64748b" }}>TEL: {doc.issuerPhone}</p>}
          {doc.issuerEmail   && <p style={{ margin: "0.5mm 0", color: "#64748b" }}>{doc.issuerEmail}</p>}
          {doc.invoiceRegistrationNo && (
            <p style={{ margin: "1.5mm 0 0 0", fontSize: "7.5pt", fontWeight: "bold", borderTop: "1px solid #e2e8f0", paddingTop: "1mm" }}>
              登録番号: {doc.invoiceRegistrationNo}
            </p>
          )}
        </div>
      </div>

      {/* 件名 */}
      {doc.subject && (
        <div style={{ marginBottom: "4mm", padding: "2mm 4mm", backgroundColor: "#f8fafc", border, borderRadius: "3px" }}>
          <span style={{ fontSize: "8pt", color: "#64748b" }}>件名：</span>
          <span style={{ fontSize: "10pt", fontWeight: "bold", marginLeft: "2mm" }}>{doc.subject}</span>
        </div>
      )}

      {/* ご請求金額ハイライト */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        border: "2px solid #1e293b", borderRadius: "4px",
        padding: "3mm 6mm", marginBottom: "5mm", background: "#f8fafc",
      }}>
        <span style={{ fontSize: "10pt", fontWeight: "bold" }}>
          {doc.type === "invoice" ? "ご請求金額" : "合計金額"}{showTaxLabels ? "（税込）" : ""}
        </span>
        <span style={{ fontSize: "20pt", fontWeight: "bold" }}>{yen(doc.total)}</span>
      </div>

      {/* 明細テーブル */}
      <div style={{ marginBottom: "4mm" }}>
        <p style={{ fontSize: "8.5pt", fontWeight: "bold", margin: "0 0 1.5mm 0", color: "#475569" }}>■ 請求明細</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e293b", color: "#fff" }}>
              <th style={{ padding: "2.5mm 4mm", textAlign: "left",   width: "44%" }}>項　目</th>
              <th style={{ padding: "2.5mm 4mm", textAlign: "center", width: "9%"  }}>数量</th>
              <th style={{ padding: "2.5mm 4mm", textAlign: "center", width: "7%"  }}>単位</th>
              <th style={{ padding: "2.5mm 4mm", textAlign: "right",  width: "16%" }}>{showTaxLabels ? "単価（税抜）" : "単価"}</th>
              <th style={{ padding: "2.5mm 4mm", textAlign: "center", width: "8%"  }}>税率</th>
              <th style={{ padding: "2.5mm 4mm", textAlign: "right",  width: "16%" }}>{showTaxLabels ? "金額（税込）" : "金額"}</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, i) => {
              const taxAmt = item.taxRate === 10 ? Math.floor(item.quantity * item.unitPrice * 0.1)
                           : item.taxRate === 8  ? Math.floor(item.quantity * item.unitPrice * 0.08) : 0;
              const total  = item.quantity * item.unitPrice + taxAmt;
              return (
                <tr key={item.id} style={{ backgroundColor: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
                  <td style={{ padding: "2.5mm 4mm", border }}>{item.description}</td>
                  <td style={{ padding: "2.5mm 4mm", border, textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ padding: "2.5mm 4mm", border, textAlign: "center" }}>{item.unit}</td>
                  <td style={{ padding: "2.5mm 4mm", border, textAlign: "right"  }}>{yen(item.unitPrice)}</td>
                  <td style={{ padding: "2.5mm 4mm", border, textAlign: "center" }}>
                    {item.taxRate}%{item.taxRate === 8 ? " ※" : ""}
                  </td>
                  <td style={{ padding: "2.5mm 4mm", border, textAlign: "right"  }}>{yen(total)}</td>
                </tr>
              );
            })}
            {/* 空行パディング */}
            {doc.items.length < 5 && Array.from({ length: 5 - doc.items.length }).map((_, i) => (
              <tr key={`pad-${i}`}>
                <td colSpan={6} style={{ padding: "2.5mm 4mm", border }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 合計サマリー（右寄せ） */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "5mm" }}>
        <table style={{ borderCollapse: "collapse", fontSize: "8.5pt", minWidth: "200px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "2mm 4mm", color: "#64748b", border }}>小　計{showTaxLabels ? "（参考：税抜）" : ""}</td>
              <td style={{ padding: "2mm 4mm", textAlign: "right", border }}>{yen(doc.subtotal)}</td>
            </tr>
            {doc.tax10 > 0 && (
              <tr>
                <td style={{ padding: "2mm 4mm", color: "#64748b", border }}>消費税（10%）　※参考</td>
                <td style={{ padding: "2mm 4mm", textAlign: "right", border }}>{yen(doc.tax10)}</td>
              </tr>
            )}
            {doc.tax8 > 0 && (
              <tr>
                <td style={{ padding: "2mm 4mm", color: "#64748b", border }}>消費税（8% 軽減）※参考</td>
                <td style={{ padding: "2mm 4mm", textAlign: "right", border }}>{yen(doc.tax8)}</td>
              </tr>
            )}
            <tr style={{ backgroundColor: "#f0fdf4" }}>
              <td style={{ padding: "2.5mm 4mm", fontWeight: "bold", border, borderTop: "2px solid #1e293b" }}>
                ご請求合計{showTaxLabels ? "（税込）" : ""}
              </td>
              <td style={{ padding: "2.5mm 4mm", textAlign: "right", fontWeight: "bold", border, borderTop: "2px solid #1e293b" }}>
                {yen(doc.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {doc.tax8 > 0 && (
        <p style={{ fontSize: "7pt", color: "#64748b", margin: "0 0 4mm 0" }}>※ 軽減税率（8%）対象品目</p>
      )}

      {/* 備考 */}
      {doc.notes && (
        <div style={{ marginBottom: "5mm" }}>
          <p style={{ fontSize: "8.5pt", fontWeight: "bold", margin: "0 0 1.5mm 0", color: "#475569" }}>■ 備考</p>
          <div style={{ border, borderRadius: "3px", padding: "3mm 4mm", fontSize: "8.5pt", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {doc.notes}
          </div>
        </div>
      )}

      {/* 振込先 */}
      {hasBankInfo && (
        <div style={{ marginBottom: "5mm" }}>
          <p style={{ fontSize: "8.5pt", fontWeight: "bold", margin: "0 0 1.5mm 0", color: "#475569" }}>■ お振込先</p>
          <div style={{ border, borderRadius: "3px", padding: "3mm 4mm" }}>
            <table style={{ fontSize: "8.5pt", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "0.5mm 3mm 0.5mm 0", color: "#64748b", whiteSpace: "nowrap" }}>金融機関：</td>
                  <td>{doc.bankName}　{doc.bankBranch}</td>
                </tr>
                <tr>
                  <td style={{ padding: "0.5mm 3mm 0.5mm 0", color: "#64748b" }}>口座種別：</td>
                  <td>{doc.bankAccountType}</td>
                </tr>
                <tr>
                  <td style={{ padding: "0.5mm 3mm 0.5mm 0", color: "#64748b" }}>口座番号：</td>
                  <td>{doc.bankAccountNo}</td>
                </tr>
                <tr>
                  <td style={{ padding: "0.5mm 3mm 0.5mm 0", color: "#64748b" }}>口座名義：</td>
                  <td style={{ fontWeight: "bold" }}>{doc.bankAccountHolder}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* フッター */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "2.5mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "7pt", color: "#94a3b8", margin: 0 }}>SmartLedger AI</p>
        <p style={{ fontSize: "7pt", color: "#94a3b8", margin: 0 }}>出力日: {today}</p>
      </div>
    </div>
  );
}