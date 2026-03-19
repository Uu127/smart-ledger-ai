// src/components/TaxReportPrint.tsx
// 印刷・PDF出力用レイアウト（画面には表示しない・印刷時のみ表示）
import { useMemo } from "react";
import type { LedgerEntry } from "@/types/ledger";

interface TaxReportPrintProps {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  expenses: { account: string; amount: number }[];
  proRateEnabled: boolean;
  proRateRatio: number;
  depreciation: number;
  entries: LedgerEntry[];
}

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

export function TaxReportPrint({
  year, totalIncome, totalExpense, netIncome,
  expenses, proRateEnabled, proRateRatio, depreciation, entries,
}: TaxReportPrintProps) {

  const monthlyIncome = useMemo(() => {
    const map = new Map<number, number>();
    entries.filter(e => e.date.startsWith(String(year)) && e.entryType === "income")
      .forEach(e => {
        const m = Number(e.date.slice(5, 7));
        map.set(m, (map.get(m) ?? 0) + e.amount);
      });
    return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: map.get(i + 1) ?? 0 }));
  }, [entries, year]);

  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div id="tax-report-print" className="hidden print:block print-container">
      {/* ── ページ1：収支サマリー ── */}
      <div className="print-page">

        {/* ヘッダー */}
        <div className="print-header">
          <div>
            <h1 className="print-title">青色申告決算書（収支内訳）</h1>
            <p className="print-subtitle">{year}年1月1日 〜 {year}年12月31日</p>
          </div>
          <div className="print-header-right">
            <p>SmartLedger AI 出力</p>
            <p>出力日: {today}</p>
          </div>
        </div>

        {/* 収支サマリー */}
        <section className="print-section">
          <h2 className="print-section-title">■ 収支サマリー</h2>
          <table className="print-table">
            <tbody>
              <tr>
                <td className="print-td-label">売上高（収入金額）</td>
                <td className="print-td-value">{yen(totalIncome)}</td>
                <td className="print-td-note">e-Tax「売上（収入）金額」欄</td>
              </tr>
              <tr>
                <td className="print-td-label">必要経費 合計</td>
                <td className="print-td-value">{yen(totalExpense)}</td>
                <td className="print-td-note">
                  e-Tax「必要経費 合計」欄
                  {proRateEnabled && `（家事按分${proRateRatio}%適用済み）`}
                </td>
              </tr>
              <tr className="print-tr-total">
                <td className="print-td-label">所得金額</td>
                <td className="print-td-value">{yen(netIncome)}</td>
                <td className="print-td-note">e-Tax「所得金額」欄</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 経費科目別明細 */}
        <section className="print-section">
          <h2 className="print-section-title">■ 経費 科目別明細</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th className="print-th-label">勘定科目</th>
                <th className="print-th-value">金額</th>
                <th className="print-th-note">備考</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.account}>
                  <td className="print-td-label">{e.account}</td>
                  <td className="print-td-value">{yen(e.amount)}</td>
                  <td className="print-td-note">
                    {proRateEnabled && e.account === "地代家賃" && `按分${proRateRatio}%`}
                    {e.account === "減価償却費" && depreciation > 0 && `固定資産計上含む`}
                  </td>
                </tr>
              ))}
              <tr className="print-tr-total">
                <td className="print-td-label">経費合計</td>
                <td className="print-td-value">{yen(totalExpense)}</td>
                <td className="print-td-note"></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 月次売上内訳 */}
        <section className="print-section">
          <h2 className="print-section-title">■ 月次売上内訳</h2>
          <table className="print-table">
            <thead>
              <tr>
                {monthlyIncome.slice(0, 6).map(({ month }) => (
                  <th key={month} className="print-th-month">{month}月</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {monthlyIncome.slice(0, 6).map(({ month, amount }) => (
                  <td key={month} className="print-td-month">{yen(amount)}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <table className="print-table" style={{ marginTop: "4px" }}>
            <thead>
              <tr>
                {monthlyIncome.slice(6, 12).map(({ month }) => (
                  <th key={month} className="print-th-month">{month}月</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {monthlyIncome.slice(6, 12).map(({ month, amount }) => (
                  <td key={month} className="print-td-month">{yen(amount)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        {/* 注意書き */}
        <div className="print-notice">
          <p>※ この資料はSmartLedger AIが生成した入力補助用の参考資料です。</p>
          <p>※ 実際の確定申告はe-Taxまたは税務署の申告書用紙をご使用ください。</p>
          <p>※ 金額の正確性についてはご自身でご確認いただき、不明点は税理士にご相談ください。</p>
          {proRateEnabled && <p>※ 家事按分（事業使用率{proRateRatio}%）を適用した金額で計算しています。</p>}
        </div>

        {/* フッター */}
        <div className="print-footer">
          <p>SmartLedger AI — {year}年分 申告補助資料　出力日: {today}</p>
        </div>
      </div>

      {/* ── ページ2：仕訳明細 ── */}
      <div className="print-page print-page-break">
        <div className="print-header">
          <div>
            <h1 className="print-title">仕訳明細</h1>
            <p className="print-subtitle">{year}年1月1日 〜 {year}年12月31日</p>
          </div>
          <div className="print-header-right">
            <p>SmartLedger AI 出力</p>
            <p>出力日: {today}</p>
          </div>
        </div>

        <section className="print-section">
          <table className="print-table">
            <thead>
              <tr>
                <th className="print-th" style={{ width: "80px" }}>日付</th>
                <th className="print-th" style={{ width: "40px" }}>種別</th>
                <th className="print-th" style={{ width: "100px" }}>借方科目</th>
                <th className="print-th" style={{ width: "80px" }}>貸方科目</th>
                <th className="print-th" style={{ width: "80px" }}>金額</th>
                <th className="print-th">取引先・摘要</th>
              </tr>
            </thead>
            <tbody>
              {entries
                .filter(e => e.date.startsWith(String(year)))
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(e => (
                  <tr key={e.id} className="print-tr-detail">
                    <td className="print-td-sm">{e.date}</td>
                    <td className="print-td-sm">{e.entryType === "income" ? "収入" : "経費"}</td>
                    <td className="print-td-sm">{e.debitAccount}</td>
                    <td className="print-td-sm">{e.creditAccount}</td>
                    <td className="print-td-sm print-td-right">¥{e.amount.toLocaleString()}</td>
                    <td className="print-td-sm">{e.counterparty} {e.description && `/ ${e.description}`}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>

        <div className="print-footer">
          <p>SmartLedger AI — {year}年分 仕訳明細　出力日: {today}</p>
        </div>
      </div>
    </div>
  );
}