"use client";

import { useMemo, useState } from "react";
import rawSummary from "./data/battery-summary.json";

type Row = { group: string; groupKey: "total" | "origin" | "continent" | "destination"; label: string; values: number[] };
const summary = rawSummary as { sourceSheet: string; unit: string; headers: string[]; rows: Row[] };
type Filter = "all" | Row["groupKey"];
const groupLabels: Record<Filter, string> = { all: "全部", total: "总金额", origin: "出发地", continent: "到达洲", destination: "到达地" };
const ratioColumns = new Set([1, 2, 4, 7]);

function pct(v: number) { return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`; }

export function Sheet1Matrix() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(0);
  const [direction, setDirection] = useState<"desc" | "asc">("desc");
  const [selected, setSelected] = useState(summary.rows[0]?.label ?? "总金额");
  const rows = useMemo(() => summary.rows.filter((r) => (filter === "all" || r.groupKey === filter) && (!query || r.label.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => (a.values[sort] - b.values[sort]) * (direction === "desc" ? -1 : 1)), [filter, query, sort, direction]);
  const selectedRow = summary.rows.find((r) => r.label === selected) ?? rows[0] ?? summary.rows[0];
  const changeSort = (index: number) => { if (sort === index) setDirection(direction === "desc" ? "asc" : "desc"); else { setSort(index); setDirection("desc"); } };

  return <main className="summary-page">
    <nav className="summary-page-nav"><a href="../">← 返回数据总览</a><span>电池出口数据表 · 2026年6月</span></nav>
    <section className="summary-card" aria-label="电池出口数据更新表">
      <header className="summary-banner"><strong>东吴电新</strong><h1>26年6月电池出口数据更新：同比 +31.7% / 环比 +8.3%</h1></header>
      <div className="summary-interactive"><div className="summary-tools"><div className="summary-group-tabs">{(["all", "total", "origin", "continent", "destination"] as Filter[]).map((g) => <button key={g} className={filter === g ? "active" : ""} onClick={() => { setFilter(g); setQuery(""); }}>{groupLabels[g]}</button>)}</div><div className="summary-tool-fields"><label>搜索<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="国家、省份或洲别" /></label><label>排序<select value={sort} onChange={(e) => changeSort(Number(e.target.value))}>{summary.headers.slice(1).map((h, i) => <option key={h} value={i}>{h}</option>)}</select></label><button className="summary-sort-direction" onClick={() => setDirection(direction === "desc" ? "asc" : "desc")}>{direction === "desc" ? "降序 ↓" : "升序 ↑"}</button></div></div><div className="summary-detail"><div className="summary-detail-name"><span>{selectedRow.group}</span><strong>{selectedRow.label}</strong><small>点击表格任意行查看指标</small></div><div><span>26M6</span><strong>{selectedRow.values[0].toFixed(1)}<small> 亿美元</small></strong></div><div><span>M6 环比</span><strong className={selectedRow.values[1] >= 0 ? "red" : "green"}>{pct(selectedRow.values[1])}</strong></div><div><span>M6 同比</span><strong className={selectedRow.values[2] >= 0 ? "red" : "green"}>{pct(selectedRow.values[2])}</strong></div><div><span>26M1-6</span><strong>{selectedRow.values[6].toFixed(1)}<small> 亿美元</small></strong></div><div><span>累计同比</span><strong className={selectedRow.values[7] >= 0 ? "red" : "green"}>{pct(selectedRow.values[7])}</strong></div></div></div>
      <div className="summary-table-scroll" tabIndex={0}><table className="summary-table"><colgroup><col className="summary-main-col" /><col className="summary-group-col" /><col className="summary-label-col" />{summary.headers.slice(1).map((h) => <col key={h} />)}</colgroup><thead><tr><th colSpan={2}>{summary.unit}</th><th>{summary.headers[0]}</th>{summary.headers.slice(1).map((h, i) => <th key={h}><button className={sort === i ? "active" : ""} onClick={() => changeSort(i)}>{h}{sort === i ? (direction === "desc" ? " ↓" : " ↑") : ""}</button></th>)}</tr></thead><tbody>{rows.map((r) => <tr key={`${r.groupKey}-${r.label}`} className={selected === r.label ? "selected" : ""} onClick={() => setSelected(r.label)} tabIndex={0}><th>{r.groupKey === "total" ? "电池" : ""}</th><th>{r.group}</th><td className="summary-label">{r.label}</td>{r.values.map((v, i) => ratioColumns.has(i) ? <td key={i} className={`summary-ratio ${v < 0 ? "negative" : "positive"}`}><i style={{ width: `${Math.min(Math.abs(v) * 120, 92)}%` }} /><span>{pct(v)}</span></td> : <td key={i}>{v.toFixed(1)}</td>)}</tr>)}</tbody></table></div>
      <footer className="summary-source">数据来源：海关总署，欢迎东吴电新团队</footer>
    </section>
  </main>;
}
