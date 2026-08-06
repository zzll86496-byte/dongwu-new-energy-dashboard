"use client";

import { useMemo, useState } from "react";
import rawSummary from "./data/battery-summary.json";

type SummaryRow = {
  group: string;
  groupKey: "total" | "origin" | "continent" | "destination";
  label: string;
  values: number[];
};

const summary = rawSummary as { sourceSheet: string; unit: string; headers: string[]; rows: SummaryRow[] };
type GroupFilter = "all" | SummaryRow["groupKey"];
const groupOrder: SummaryRow["groupKey"][] = ["total", "origin", "continent", "destination"];
const groupLabels: Record<GroupFilter, string> = { all: "全部", total: "总金额", origin: "出发地", continent: "到达洲", destination: "到达地" };
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
  return <td className={`summary-ratio ${value < -0.0005 ? "negative" : "positive"}`} title={`${shown.toFixed(1)}%`}><i style={{ width: `${Math.max(normalized * 92, value === 0 ? 0 : 2)}%` }} /><span>{shown.toFixed(1)}%</span></td>;
}

function detailPercent(value: number) {
  const shown = Math.abs(value) < 0.0005 ? 0 : value * 100;
  return `${shown > 0 ? "+" : ""}${shown.toFixed(1)}%`;
}

export function Sheet1Matrix() {
  const [group, setGroup] = useState<GroupFilter>("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState(0);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [selectedLabel, setSelectedLabel] = useState("总金额");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groupOrder.flatMap((key) => summary.rows
      .filter((row) => row.groupKey === key && (group === "all" || row.groupKey === group) && (!needle || row.label.toLowerCase().includes(needle)))
      .sort((a, b) => (a.values[sortBy] - b.values[sortBy]) * (sortDirection === "desc" ? -1 : 1)));
  }, [group, query, sortBy, sortDirection]);
  const selected = summary.rows.find((row) => row.label === selectedLabel) ?? summary.rows[0];
  const groupSizes = rows.reduce<Partial<Record<SummaryRow["groupKey"], number>>>((acc, row) => {
    acc[row.groupKey] = (acc[row.groupKey] ?? 0) + 1;
    return acc;
  }, {});
  const seen = new Set<string>();
  const chooseGroup = (next: GroupFilter) => {
    setGroup(next);
    setQuery("");
    const first = next === "all" ? summary.rows[0] : summary.rows.find((row) => row.groupKey === next);
    if (first) setSelectedLabel(first.label);
  };
  const chooseSort = (index: number) => {
    if (sortBy === index) setSortDirection((value) => value === "desc" ? "asc" : "desc");
    else { setSortBy(index); setSortDirection("desc"); }
  };

  return <main className="summary-page">
    <nav className="summary-page-nav"><a href="./">← 返回数据总览</a><span>电池总输出表 · 2026年6月</span></nav>
    <section className="summary-card" aria-label="2026年6月电池出口数据更新表">
      <header className="summary-banner"><strong>东吴电新</strong><h1>26年6月电池出口数据更新：同比+31.7%/+8.3%</h1></header>
      <div className="summary-interactive">
        <div className="summary-tools"><div className="summary-group-tabs" aria-label="分类筛选">{(["all", ...groupOrder] as GroupFilter[]).map((item) => <button key={item} className={group === item ? "active" : ""} onClick={() => chooseGroup(item)}>{groupLabels[item]}</button>)}</div><div className="summary-tool-fields"><label>搜索<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="国家、省份或洲别" /></label><label>排序<select value={sortBy} onChange={(event) => { setSortBy(Number(event.target.value)); setSortDirection("desc"); }}>{summary.headers.slice(1).map((header, index) => <option key={header} value={index}>{header}</option>)}</select></label><button className="summary-sort-direction" onClick={() => setSortDirection((value) => value === "desc" ? "asc" : "desc")} aria-label="切换排序方向">{sortDirection === "desc" ? "降序 ↓" : "升序 ↑"}</button></div></div>
        <div className="summary-detail"><div className="summary-detail-name"><span>{selected.group}</span><strong>{selected.label}</strong><small>点击表格任意行查看指标</small></div><div><span>26M6</span><strong>{amount(selected.values[0])}<small> 亿美元</small></strong></div><div><span>M6环比</span><strong className={selected.values[1] >= 0 ? "red" : "green"}>{detailPercent(selected.values[1])}</strong></div><div><span>M6同比</span><strong className={selected.values[2] >= 0 ? "red" : "green"}>{detailPercent(selected.values[2])}</strong></div><div><span>26M1-6</span><strong>{amount(selected.values[6])}<small> 亿美元</small></strong></div><div><span>累计同比</span><strong className={selected.values[7] >= 0 ? "red" : "green"}>{detailPercent(selected.values[7])}</strong></div></div>
      </div>
      <div className="summary-table-scroll" tabIndex={0}>
        <table className="summary-table">
          <colgroup><col className="summary-main-col" /><col className="summary-group-col" /><col className="summary-label-col" />{summary.headers.slice(1).map((header) => <col key={header} />)}</colgroup>
          <thead><tr><th colSpan={2}>{summary.unit}</th><th>{summary.headers[0]}</th>{summary.headers.slice(1).map((header, index) => <th key={header}><button className={sortBy === index ? "active" : ""} onClick={() => chooseSort(index)}>{header}{sortBy === index && <span>{sortDirection === "desc" ? "↓" : "↑"}</span>}</button></th>)}</tr></thead>
          <tbody>{rows.map((row, rowIndex) => {
            const firstInGroup = !seen.has(row.groupKey);
            seen.add(row.groupKey);
            return <tr key={`${row.groupKey}-${row.label}`} className={`${row.groupKey === "total" ? "summary-total-row " : ""}${selected.label === row.label ? "selected" : ""}`} onClick={() => setSelectedLabel(row.label)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedLabel(row.label); }} tabIndex={0} aria-selected={selected.label === row.label}>
              {rowIndex === 0 && <th className="summary-main" rowSpan={rows.length}>电池</th>}
              {row.groupKey === "total" ? <th className="summary-group summary-total-label" colSpan={2}>总金额</th> : firstInGroup && <th className="summary-group" rowSpan={groupSizes[row.groupKey]}>{row.group}</th>}
              {row.groupKey !== "total" && <th className="summary-label">{row.label}</th>}
              {row.values.map((value, column) => ratioIndexes.has(column) ? <RatioCell key={column} value={value} column={column} /> : <td key={column}>{amount(value)}</td>)}
            </tr>;
          })}{rows.length === 0 && <tr><td className="summary-empty" colSpan={11}>没有找到匹配项，请更换关键词。</td></tr>}</tbody>
        </table>
      </div>
      <footer className="summary-source">数据来源：海关总署，欢迎东吴电新团队</footer>
    </section>
  </main>;
}
