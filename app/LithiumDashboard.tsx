"use client";

import { useMemo, useState } from "react";
import rawData from "./data/lithium-production.json";

type Value = { period: string; raw: string; value: number | null; mom: number | null };
type Company = { name: string; values: Value[] };
type Category = { key: string; name: string; unit: string; color: string; companies: Company[]; totals: Value[] };
type DataSet = { meta: { title: string; latestPeriod: string; source: string; disclaimer: string }; periods: string[]; categories: Category[] };

const data = rawData as DataSet;
const periods = data.periods.slice(-12);
const palette = ["#9aa6b7", "#8052e8", "#2d6fe7", "#1c9b57", "#d18d12", "#ff514e", "#173e69", "#a99b5a"];
const T = {
  brand: "\u4e1c\u5434\u7535\u65b0", title: "\u9502\u7535\u4ea7\u4e1a\u94fe\u6392\u4ea7\u6570\u636e\u5e93", month: "\u5206\u6790\u6708\u4efd", segment: "\u4ea7\u4e1a\u73af\u8282", raw: "\u539f\u59cb\u6570\u636e", company: "\u4f01\u4e1a", search: "\u641c\u7d22\u4f01\u4e1a", clear: "\u6e05\u9664", trend: "\u603b\u91cf\u8d8b\u52bf", line: "\u4f01\u4e1a\u6a2a\u5411\u5bf9\u6bd4", vertical: "\u516c\u53f8\u7eb5\u5411\u6570\u636e", value: "\u4ea7\u91cf", mom: "\u73af\u6bd4", structure: "\u4f01\u4e1a\u7ed3\u6784", observe: "\u73af\u6bd4\u89c2\u5bdf", selected: "\u5f53\u524d\u4f01\u4e1a", update: "\u6700\u540e\u66f4\u65b0", interaction: "\u4ea4\u4e92\u65b9\u5f0f", interactionDesc: "\u70b9\u51fb\u4f01\u4e1a\u884c\u3001\u6298\u7ebf\u6216\u56fe\u4f8b\uff0c\u53ef\u8054\u52a8\u516c\u53f8\u7eb5\u5411\u67f1\u72b6\u56fe\u3002"
};

const periodLabel = (period: string) => `${period.slice(2, 4)}.${period.slice(5)}`;
const fmt = (value: number | null | undefined, digits = 1) => value == null || !Number.isFinite(value) ? "\u2014" : value.toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const signed = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "\u2014" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
const valueAt = (company: Company, period: string) => company.values.find((value) => value.period === period);

function linePoint(value: number, max: number, index: number, count: number) {
  const x = 58 + (index * 660) / Math.max(count - 1, 1);
  const y = 220 - (value / Math.max(max, 1)) * 176;
  return { x, y };
}

function linePoints(company: Company, max: number) {
  return periods.map((period, index) => { const point = linePoint(valueAt(company, period)?.value ?? 0, max, index, periods.length); return `${point.x.toFixed(1)},${point.y.toFixed(1)}`; }).join(" ");
}

export function LithiumDashboard() {
  const [categoryKey, setCategoryKey] = useState("battery");
  const [period, setPeriod] = useState(data.meta.latestPeriod);
  const [mode, setMode] = useState<"value" | "mom">("value");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const category = data.categories.find((item) => item.key === categoryKey) ?? data.categories[0];
  const selectedTotal = category.totals.find((value) => value.period === period) ?? category.totals.at(-1)!;
  const rows = useMemo(() => category.companies, [category]);
  const selectedCompany = category.companies.find((company) => company.name === selectedCompanyName) ?? rows[0] ?? category.companies[0];
  const recentTotals = category.totals.filter((value) => periods.includes(value.period));
  const maxTotal = Math.max(...recentTotals.map((value) => value.value ?? 0), 1);
  const companyMax = Math.max(...category.companies.flatMap((company) => company.values.filter((value) => periods.includes(value.period)).map((value) => value.value ?? 0)), 1);
  const selectedMax = Math.max(...selectedCompany.values.filter((value) => periods.includes(value.period)).map((value) => value.value ?? 0), 1);
  const allLatest = data.categories.map((item) => ({ ...item, latest: item.totals.find((value) => value.period === period) ?? item.totals.at(-1)! }));
  const composition = rows.map((company) => ({ name: company.name, value: valueAt(company, period)?.value ?? 0 })).sort((a, b) => b.value - a.value);
  const selectCompany = (name: string, nextPeriod?: string) => { setSelectedCompanyName(name); if (nextPeriod) setPeriod(nextPeriod); };

  return <main className="planning-shell">
    <div className="planning-layout">
      <aside className="planning-sidebar">
        <div className="sidebar-brand"><div className="sidebar-logo">{T.brand.slice(0, 2)}</div><div><strong>{T.brand}</strong><small>NEW ENERGY DATA</small></div></div>
        <div className="sidebar-rule" />
        <div className="sidebar-block"><label>{T.month}</label><select value={period} onChange={(event) => setPeriod(event.target.value)}>{data.periods.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="sidebar-block"><label>{T.segment}</label><div className="segment-buttons">{data.categories.map((item, index) => <button className={item.key === categoryKey ? "active" : ""} key={item.key} onClick={() => { setCategoryKey(item.key); setSelectedCompanyName(""); }}><i style={{ background: palette[index % palette.length] }} />{item.name}</button>)}</div></div>
        <div className="sidebar-block company-picker"><label>{T.company}</label><select className="company-select" value={selectedCompany.name} onChange={(event) => selectCompany(event.target.value)}>{category.companies.map((company) => <option key={company.name} value={company.name}>{company.name}</option>)}</select><div className="company-list">{category.companies.map((company, index) => <button className={selectedCompany.name === company.name ? "active" : ""} key={company.name} onClick={() => selectCompany(company.name)}><i style={{ background: palette[index % palette.length] }} /><span>{company.name}</span><b>{signed(valueAt(company, period)?.mom)}</b></button>)}</div></div>
        <div className="sidebar-block selected-summary"><label>{T.selected}</label><strong>{selectedCompany.name}</strong><span>{category.name} · {period}</span><b className={valueAt(selectedCompany, period)?.mom != null && (valueAt(selectedCompany, period)?.mom ?? 0) < 0 ? "negative-text" : "positive-text"}>{signed(valueAt(selectedCompany, period)?.mom)}</b></div>
        <div className="sidebar-help"><b>{T.interaction}</b><p>{T.interactionDesc}</p></div>
        <div className="sidebar-foot">{T.update}：2026-08-05<br />{data.meta.source}</div>
      </aside>

      <section className="planning-main">
        <header className="planning-topbar"><div><span className="topbar-kicker">DONGWU NEW ENERGY · PLANNING DASHBOARD</span><h1>{T.title}</h1><p>{category.name} · {period} · {category.unit}</p></div><div className="topbar-mode"><span>{T.value} / {T.mom}</span><div className="mode-switch"><button className={mode === "value" ? "active" : ""} onClick={() => setMode("value")}>{T.value}</button><button className={mode === "mom" ? "active" : ""} onClick={() => setMode("mom")}>{T.mom}</button></div></div></header>

        <section className="planning-kpis">{allLatest.map((item) => <button className={`metric-card ${item.key === categoryKey ? "active" : ""}`} key={item.key} onClick={() => { setCategoryKey(item.key); setSelectedCompanyName(""); }}><span>{item.name}</span><div className="metric-value">{fmt(item.latest.value)}<small>{item.unit}</small></div><p>{T.mom} <b className={item.latest.mom != null && item.latest.mom < 0 ? "negative-text" : "positive-text"}>{signed(item.latest.mom)}</b></p></button>)}</section>

        <div className="planning-grid">
          <section className="dashboard-card trend-card"><div className="card-titlebar"><b>{category.name}{T.trend}</b><span>{T.value}</span></div><div className="bar-chart-wrap"><div className="bar-axis"><span>{fmt(maxTotal, 0)}</span><span>{fmt(maxTotal / 2, 0)}</span><span>0</span></div><div className="bar-chart-area">{recentTotals.map((item) => { const height = mode === "value" ? ((item.value ?? 0) / maxTotal) * 100 : Math.min(Math.abs(item.mom ?? 0) * 260, 100); return <div className="bar-item" key={item.period}><span>{mode === "value" ? fmt(item.value) : signed(item.mom)}</span><i className={item.mom != null && item.mom < 0 ? "negative-bar" : "positive-bar"} style={{ height: `${Math.max(height, 3)}%` }} /><small>{periodLabel(item.period)}</small></div>; })}</div></div></section>

          <section className="dashboard-card line-card"><div className="card-titlebar"><b>{category.name}{T.line}</b><span>{category.unit}</span></div><div className="line-legend">{category.companies.map((company, index) => <button className={selectedCompany.name === company.name ? "active" : ""} key={company.name} onClick={() => selectCompany(company.name)}><i style={{ background: palette[index % palette.length] }} />{company.name}</button>)}</div><div className="line-chart"><svg viewBox="0 0 760 270" role="img" aria-label={`${category.name}${T.line}`}>{[0, 1, 2, 3, 4].map((step) => { const y = 220 - step * 44; return <g key={step}><line x1="58" y1={y} x2="718" y2={y} /><text x="47" y={y + 4} textAnchor="end">{fmt((companyMax * step) / 4, 0)}</text></g>; })}<line className="axis" x1="58" y1="220" x2="718" y2="220" /><line className="axis" x1="58" y1="44" x2="58" y2="220" />{category.companies.map((company, index) => <g key={company.name} className="line-series" onClick={() => selectCompany(company.name)}><polyline points={linePoints(company, companyMax)} fill="none" stroke={palette[index % palette.length]} strokeWidth={selectedCompany.name === company.name ? 3.8 : 2.2} opacity={selectedCompany.name === company.name ? 1 : .86} />{periods.map((item, pointIndex) => { const point = linePoint(valueAt(company, item)?.value ?? 0, companyMax, pointIndex, periods.length); return <circle key={item} cx={point.x} cy={point.y} r={selectedCompany.name === company.name ? 4 : 3} fill={palette[index % palette.length]}><title>{`${company.name} ${periodLabel(item)}: ${valueAt(company, item)?.raw || "\u2014"}`}</title></circle>; })}</g>)}{periods.map((item, index) => { const point = linePoint(0, companyMax, index, periods.length); return <text key={item} x={point.x} y="244" textAnchor="middle">{periodLabel(item)}</text>; })}</svg></div></section>

          <section className="dashboard-card ratio-card"><div className="card-titlebar"><b>{T.observe}</b><span>{period}</span></div><div className="ratio-main"><strong className={selectedTotal.mom != null && selectedTotal.mom < 0 ? "negative-text" : "positive-text"}>{signed(selectedTotal.mom)}</strong><small>{category.name} {T.mom}</small></div><div className="ratio-list">{allLatest.map((item) => <div key={item.key}><span>{item.name}</span><b className={item.latest.mom != null && item.latest.mom < 0 ? "negative-text" : "positive-text"}>{signed(item.latest.mom)}</b></div>)}</div></section>

          <section className="dashboard-card company-card"><div className="card-titlebar"><b>{selectedCompany.name}{T.vertical}</b><span>{period}</span></div><div className="company-chart"><div className="company-axis"><span>{fmt(selectedMax, 0)}</span><span>{fmt(selectedMax / 2, 0)}</span><span>0</span></div><div className="company-bars">{selectedCompany.values.filter((value) => periods.includes(value.period)).map((value) => <div className="company-bar" key={value.period}><span>{fmt(value.value)}</span><i style={{ height: `${Math.max(((value.value ?? 0) / selectedMax) * 100, 3)}%` }} /><small>{periodLabel(value.period)}</small></div>)}</div></div></section>

          <section className="dashboard-card composition-card"><div className="card-titlebar"><b>{T.structure}</b><span>{period}</span></div><div className="composition-body"><div className="donut"><div><strong>{fmt(selectedTotal.value)}</strong><small>{category.unit}</small></div></div><div className="composition-list">{composition.slice(0, 6).map((item, index) => <div key={item.name}><i style={{ background: palette[index] }} /><span>{item.name}</span><b>{fmt(item.value)}</b></div>)}</div></div></section>

          <section className="dashboard-card raw-card"><div className="card-titlebar"><b>{T.raw}</b><span>{category.name} · {period}</span></div><div className="raw-table-wrap"><table className="raw-table"><thead><tr><th>{T.company}</th>{periods.map((item) => <th key={item}>{periodLabel(item)}</th>)}</tr></thead><tbody>{rows.map((company) => <tr className={selectedCompany.name === company.name ? "selected" : ""} key={company.name} onClick={() => selectCompany(company.name)}><th>{company.name}</th>{periods.map((item) => { const value = valueAt(company, item); return <td key={item} title={value?.raw} onClick={(event) => { event.stopPropagation(); selectCompany(company.name, item); }}>{mode === "value" ? value?.raw || "\u2014" : signed(value?.mom)}</td>; })}</tr>)}</tbody></table></div><div className="raw-note">\u70b9\u51fb\u4f01\u4e1a\u884c\u6216\u5355\u5143\u683c\u8054\u52a8\u56fe\u8868</div></section>
        </div>
        <footer className="planning-footer"><span>{data.meta.disclaimer}</span><span>{data.meta.source}</span></footer>
      </section>
    </div>
  </main>;
}
