"use client";

import rawSummary from "./data/battery-summary.json";

type SummaryRow = {
  group: string;
  groupKey: "total" | "origin" | "continent" | "destination";
  label: string;
  values: number[];
};

const summary = rawSummary as { sourceSheet: string; unit: string; headers: string[]; rows: SummaryRow[] };
const groupSizes: Record<SummaryRow["groupKey"], number> = { total: 1, origin: 6, continent: 6, destination: 17 };
const ratioIndexes = new Set([1, 2, 4, 7]);
const ratioMax = [...ratioIndexes].reduce<Record<number, number>>((acc, index) => {
  acc[index] = Math.max(...summary.rows.map((row) => Math.abs(row.values[index])), 0.01);
  return acc;
}, {});

function amount(value: number) {
  return value.toFixed(1);
}

function RatioCell({ value, column }: { value: number; column: number }) {
  const normalized = Math.min(Math.abs(value) / ratioMax[column], 1);
  const shown = Math.abs(value) < 0.0005 ? 0 : value * 100;
  return <td className={`summary-ratio ${value < -0.0005 ? "negative" : "positive"}`}><i style={{ width: `${Math.max(normalized * 92, value === 0 ? 0 : 2)}%` }} /><span>{shown.toFixed(1)}%</span></td>;
}

export function Sheet1Matrix() {
  const seen = new Set<string>();
  return <main className="summary-page">
    <nav className="summary-page-nav"><a href="/">← 返回数据总览</a><span>电池总输出表 · 2026年6月</span></nav>
    <section className="summary-card" aria-label="2026年6月电池出口数据更新表">
      <header className="summary-banner"><strong>东吴电新</strong><h1>26年6月电池出口数据更新：同比+31.7%/+8.3%</h1></header>
      <div className="summary-table-scroll" tabIndex={0}>
        <table className="summary-table">
          <colgroup><col className="summary-main-col" /><col className="summary-group-col" /><col className="summary-label-col" />{summary.headers.slice(1).map((header) => <col key={header} />)}</colgroup>
          <thead><tr><th colSpan={2}>{summary.unit}</th>{summary.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{summary.rows.map((row, rowIndex) => {
            const firstInGroup = !seen.has(row.groupKey);
            seen.add(row.groupKey);
            return <tr key={`${row.groupKey}-${row.label}`} className={row.groupKey === "total" ? "summary-total-row" : ""}>
              {rowIndex === 0 && <th className="summary-main" rowSpan={summary.rows.length}>电池</th>}
              {row.groupKey === "total" ? <th className="summary-group summary-total-label" colSpan={2}>总金额</th> : firstInGroup && <th className="summary-group" rowSpan={groupSizes[row.groupKey]}>{row.group}</th>}
              {row.groupKey !== "total" && <th className="summary-label">{row.label}</th>}
              {row.values.map((value, column) => ratioIndexes.has(column) ? <RatioCell key={column} value={value} column={column} /> : <td key={column}>{amount(value)}</td>)}
            </tr>;
          })}</tbody>
        </table>
      </div>
      <footer className="summary-source">数据来源：海关总署，欢迎东吴电新团队</footer>
    </section>
  </main>;
}
