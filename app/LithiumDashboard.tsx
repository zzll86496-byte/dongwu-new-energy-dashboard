"use client";

import { useMemo, useState } from "react";
import rawData from "./data/lithium-production.json";

type Value = { period: string; raw: string; value: number | null; mom: number | null };
type Company = { name: string; values: Value[] };
type Category = { key: string; name: string; unit: string; color: string; companies: Company[]; totals: Value[] };
const data = rawData as { meta: { title: string; latestPeriod: string; source: string; disclaimer: string }; periods: string[]; categories: Category[] };
const recentPeriods = data.periods.slice(-12);
const periodLabel = (p: string) => `${p.slice(2, 4)}.${p.slice(5)}`;
const fmt = (v: number | null | undefined, digits = 1) => v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const signed = (v: number | null) => v == null || !Number.isFinite(v) ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

export function LithiumDashboard() {
  const [categoryKey, setCategoryKey] = useState("battery");
  const [period, setPeriod] = useState(data.meta.latestPeriod);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"value" | "mom">("value");
  const category = data.categories.find((c) => c.key === categoryKey) ?? data.categories[0];
  const selectedTotal = category.totals.find((v) => v.period === period) ?? category.totals.at(-1)!;
  const rows = useMemo(() => category.companies.filter((r) => !search || r.name.includes(search.trim())), [category, search]);
  const recentTotals = category.totals.filter((v) => recentPeriods.includes(v.period));
  const max = Math.max(...rows.map((r) => r.values.find((v) => v.period === period)?.value ?? 0), 1);
  const allLatest = data.categories.map((c) => ({ ...c, latest: c.totals.find((v) => v.period === period) ?? c.totals.at(-1)! }));
  const composition = rows.map((r) => ({ name: r.name, value: r.values.find((v) => v.period === period)?.value ?? 0 })).sort((a, b) => b.value - a.value);

  return <main className="pbix-shell">
    <header className="pbix-header"><div><div className="pbix-brand">东吴电新</div><h1>锂电产业链排产数据库</h1><small>Li-ion production planning · Power BI style workspace</small></div><div className="pbix-filters"><label>月份<select value={period} onChange={(e) => setPeriod(e.target.value)}>{data.periods.map((p) => <option key={p}>{p}</option>)}</select></label><label>环节<select value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)}>{data.categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label></div></header>
    <section className="pbix-kpis">{allLatest.map((c) => <button className={`pbix-kpi ${c.key === categoryKey ? "selected" : ""}`} key={c.key} onClick={() => setCategoryKey(c.key)}><span>{c.name}</span><strong>{fmt(c.latest.value)}</strong><small>{c.unit} · 环比 <b className={c.latest.mom != null && c.latest.mom < 0 ? "down" : "up"}>{signed(c.latest.mom)}</b></small></button>)}</section>
    <div className="pbix-body"><section className="pbix-left"><div className="pbix-panel raw-panel"><div className="pbix-panel-head"><div><b>原始数据</b><small>{category.name} · 企业排产明细 · {period}</small></div><div className="pbix-tools"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索企业" /><button onClick={() => setSearch("")}>清除</button></div></div><div className="pbix-table-wrap"><table className="pbix-table"><thead><tr><th>企业</th>{recentPeriods.map((p) => <th key={p}>{periodLabel(p)}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.name}><th>{r.name}</th>{recentPeriods.map((p) => { const v = r.values.find((x) => x.period === p); return <td key={p} title={v?.raw}>{mode === "value" ? (v?.raw || "—") : signed(v?.mom ?? null)}</td>; })}</tr>)}</tbody></table></div><div className="pbix-note">原始单元格保留 Excel 文本口径；鼠标悬停可查看完整拆分（如铁锂、三元、湿法、干法）。</div></div></section>
      <section className="pbix-right"><div className="pbix-panel trend-panel"><div className="pbix-panel-head"><div><b>{category.name}趋势</b><small>总量与月度环比</small></div><div className="pbix-toggle"><button className={mode === "value" ? "active" : ""} onClick={() => setMode("value")}>产量</button><button className={mode === "mom" ? "active" : ""} onClick={() => setMode("mom")}>环比</button></div></div><div className="pbix-chart"><div className="pbix-yaxis"><span>{fmt(Math.max(...recentTotals.map((v) => v.value ?? 0)), 0)}</span><span>{fmt(Math.max(...recentTotals.map((v) => v.value ?? 0)) / 2, 0)}</span><span>0</span></div><div className="pbix-bars">{recentTotals.map((v) => { const height = mode === "value" ? ((v.value ?? 0) / Math.max(...recentTotals.map((x) => x.value ?? 0), 1)) * 100 : Math.min(Math.abs(v.mom ?? 0) * 260, 100); return <div className="pbix-bar-item" key={v.period}><span className={v.mom != null && v.mom < 0 ? "down" : "up"}>{mode === "value" ? fmt(v.value) : signed(v.mom)}</span><i className={v.mom != null && v.mom < 0 ? "negative" : ""} style={{ height: `${Math.max(height, 3)}%` }} /><small>{periodLabel(v.period)}</small></div>; })}</div></div></div><div className="pbix-dual"><div className="pbix-panel composition-panel"><div className="pbix-panel-head"><div><b>企业结构</b><small>{period} · {category.unit}</small></div></div><div className="donut-wrap"><div className="pbix-donut"><div><strong>{fmt(selectedTotal.value)}</strong><small>{category.unit}</small></div></div><div className="donut-rows">{composition.slice(0, 6).map((r, i) => <div key={r.name}><i style={{ background: ["#70b0e0", "#fcb714", "#2878bd", "#0eb194", "#f15628", "#af916d"][i] }} /><span>{r.name}</span><b>{fmt(r.value)}</b></div>)}</div></div></div><div className="pbix-panel ratio-panel"><div className="pbix-panel-head"><div><b>环比观察</b><small>最新月份 {period}</small></div></div><div className="ratio-value"><strong className={selectedTotal.mom != null && selectedTotal.mom < 0 ? "down" : "up"}>{signed(selectedTotal.mom)}</strong><span>较上月</span></div><div className="ratio-list">{allLatest.map((c) => <div key={c.key}><span>{c.name}</span><b className={c.latest.mom != null && c.latest.mom < 0 ? "down" : "up"}>{signed(c.latest.mom)}</b></div>)}</div></div></div></section></div>
    <footer className="pbix-footer"><span>数据来源：{data.meta.source}</span><span>文件更新：2026-08-05</span><span>{data.meta.disclaimer}</span></footer>
  </main>;
}
