"use client";

import { useState } from "react";
import rawData from "./data/lithium-production.json";

type Value = { period: string; raw: string; value: number | null; mom: number | null };
type Company = { name: string; values: Value[] };
type Category = { key: string; name: string; unit: string; color: string; companies: Company[]; totals: Value[] };
type DataSet = { meta: { title: string; latestPeriod: string; source: string; disclaimer: string }; periods: string[]; categories: Category[] };

const data = rawData as DataSet;
const periods = data.periods.slice(-12);
const rawPeriods = [...periods].reverse();
const palette = ["#15385f", "#a89d64", "#7e8790", "#c28a46", "#536776", "#c3c7ca", "#806b51", "#9e7b55"];

const periodLabel = (period: string) => period.replace("-", ".");
const shortPeriod = (period: string) => period.slice(2).replace("-", ".");
const fmt = (value: number | null | undefined, digits = 1) => value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const signed = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
const valueAt = (company: Company, period: string) => company.values.find((value) => value.period === period);

function point(value: number, max: number, index: number, count: number) {
  return { x: 42 + (index * 676) / Math.max(count - 1, 1), y: 150 - (value / Math.max(max, 1)) * 112 };
}

function points(company: Company, max: number) {
  return periods.map((period, index) => { const p = point(valueAt(company, period)?.value ?? 0, max, index, periods.length); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");
}

export function LithiumDashboard() {
  const [categoryKey, setCategoryKey] = useState("battery");
  const [period, setPeriod] = useState(data.meta.latestPeriod);
  const [mode, setMode] = useState<"value" | "mom">("value");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [lineFocusPeriod, setLineFocusPeriod] = useState("");
  const category = data.categories.find((item) => item.key === categoryKey) ?? data.categories[0];
  const selectedCompany = category.companies.find((company) => company.name === selectedCompanyName) ?? category.companies[0];
  const recentTotals = category.totals.filter((value) => periods.includes(value.period));
  const maxTotal = Math.max(...recentTotals.map((value) => value.value ?? 0), 1);
  const companyMax = Math.max(...category.companies.flatMap((company) => company.values.filter((value) => periods.includes(value.period)).map((value) => value.value ?? 0)), 1);
  const selectedMax = Math.max(...selectedCompany.values.filter((value) => periods.includes(value.period)).map((value) => value.value ?? 0), 1);
  const allLatest = data.categories.map((item) => ({ ...item, latest: item.totals.find((value) => value.period === period) ?? item.totals.at(-1)! }));
  const composition = category.companies.map((company) => ({ name: company.name, value: valueAt(company, period)?.value ?? 0 })).sort((a, b) => b.value - a.value);
  const compositionTotal = composition.reduce((sum, item) => sum + item.value, 0) || 1;
  const selectCategory = (key: string) => { setCategoryKey(key); setSelectedCompanyName(""); setLineFocusPeriod(""); };
  const selectCompany = (name: string, nextPeriod?: string) => { setSelectedCompanyName(name); if (nextPeriod) setPeriod(nextPeriod); };

  return <main className="dw-shell">
    <aside className="dw-sidebar">
      <div className="dw-brand"><span>东吴</span><div><strong>东吴电新</strong><small>NEW ENERGY DATA</small></div></div>
      <div className="dw-divider" />
      <label className="dw-label" htmlFor="period">分析月份</label>
      <select id="period" className="dw-select" value={period} onChange={(event) => setPeriod(event.target.value)}>{data.periods.map((item) => <option key={item}>{item}</option>)}</select>
      <div className="dw-filter-group">
        <span className="dw-label">产业环节</span>
        <div className="dw-segments">{data.categories.map((item) => <button className={item.key === categoryKey ? "active" : ""} key={item.key} onClick={() => selectCategory(item.key)}><i />{item.name}</button>)}</div>
      </div>
      <div className="dw-filter-group">
        <span className="dw-label">企业</span>
        <select className="dw-company-select" aria-label="选择企业" value={selectedCompany.name} onChange={(event) => selectCompany(event.target.value)}>{category.companies.map((company) => <option key={company.name} value={company.name}>{company.name}</option>)}</select>
      </div>
      <div className="dw-sidebar-note"><b>当前企业</b><strong>{selectedCompany.name}</strong><span>{category.name} · {period}</span></div>
      <div className="dw-sidebar-foot"><span>数据更新</span><b>2026-08-05</b><small>点击图例、折线点或表格可联动查看</small></div>
    </aside>

    <section className="dw-workspace">
      <header className="dw-top">
        <div className="dw-title"><span>DONGWU NEW ENERGY · PLANNING DASHBOARD</span><h1>锂电产业链排产数据库</h1><p>{category.name} · {period} · {category.unit}</p></div>
        <section className="dw-kpis">
          {allLatest.map((item) => <button className={item.key === categoryKey ? "active" : ""} key={item.key} onClick={() => selectCategory(item.key)}><span>{item.name}</span><strong>{fmt(item.latest.value)}<small>{item.unit}</small></strong><p>环比 <b>{signed(item.latest.mom)}</b></p></button>)}
        </section>
      </header>

      <div className="dw-mode"><span>观察口径</span><button className={mode === "value" ? "active" : ""} onClick={() => setMode("value")}>产量</button><button className={mode === "mom" ? "active" : ""} onClick={() => setMode("mom")}>环比</button></div>

      <div className="dw-grid">
        <section className="dw-card dw-trend"><div className="dw-card-head"><b>{category.name}总量趋势</b><span>{category.unit}</span></div><div className="dw-bar-chart"><div className="dw-y-axis"><span>{fmt(maxTotal, 0)}</span><span>{fmt(maxTotal / 2, 0)}</span><span>0</span></div><div className="dw-bars">{recentTotals.map((item, index) => { const rawHeight = mode === "value" ? ((item.value ?? 0) / maxTotal) * 100 : Math.min(Math.abs(item.mom ?? 0) * 300, 100); return <button className={item.period === period ? "active" : ""} key={item.period} onClick={() => setPeriod(item.period)}><span>{mode === "value" ? fmt(item.value) : signed(item.mom)}</span><i className={index % 2 ? "navy" : "gray"} style={{ height: `${Math.max(rawHeight, 3)}%` }} /><small>{shortPeriod(item.period)}</small></button>; })}</div></div></section>

        <section className="dw-card dw-lines"><div className="dw-card-head"><b>{category.name}企业横向对比</b><span>{category.unit}</span></div><div className="dw-legend">{category.companies.map((company, index) => <button className={selectedCompany.name === company.name ? "active" : ""} key={company.name} onClick={() => selectCompany(company.name)}><i style={{ background: palette[index % palette.length] }} />{company.name}</button>)}</div><div className="dw-line-chart"><svg viewBox="0 0 760 182" role="img" aria-label={`${category.name}企业横向对比`}>{[0, 1, 2, 3].map((step) => { const y = 150 - step * 37.33; return <g key={step}><line x1="42" y1={y} x2="718" y2={y} /><text x="34" y={y + 3} textAnchor="end">{fmt((companyMax * step) / 3, 0)}</text></g>; })}{category.companies.map((company, index) => <g key={company.name} onClick={() => selectCompany(company.name)}><polyline points={points(company, companyMax)} fill="none" stroke={palette[index % palette.length]} strokeWidth={selectedCompany.name === company.name ? 2.5 : 1.4} opacity={selectedCompany.name === company.name ? 1 : .78} />{periods.map((item, pointIndex) => { const p = point(valueAt(company, item)?.value ?? 0, companyMax, pointIndex, periods.length); return <circle key={item} cx={p.x} cy={p.y} r={selectedCompany.name === company.name ? 3 : 2} fill={palette[index % palette.length]} onClick={(event) => { event.stopPropagation(); setLineFocusPeriod(item); setPeriod(item); }} />; })}</g>)}{periods.map((item, index) => <text key={item} x={point(0, companyMax, index, periods.length).x} y="172" textAnchor="middle">{shortPeriod(item)}</text>)}</svg></div>{lineFocusPeriod && <div className="dw-tooltip"><div><b>{periodLabel(lineFocusPeriod)}</b><button onClick={() => setLineFocusPeriod("")}>×</button></div>{category.companies.map((company, index) => <p key={company.name}><i style={{ background: palette[index % palette.length] }} />{company.name}<strong>{fmt(valueAt(company, lineFocusPeriod)?.value)}</strong></p>)}</div>}</section>

        <section className="dw-card dw-company"><div className="dw-card-head"><b>{selectedCompany.name}纵向数据</b><span>{period}</span></div><div className="dw-company-chart"><div className="dw-y-axis"><span>{fmt(selectedMax, 0)}</span><span>{fmt(selectedMax / 2, 0)}</span><span>0</span></div><div className="dw-bars">{selectedCompany.values.filter((value) => periods.includes(value.period)).map((value) => <button className={value.period === period ? "active" : ""} key={value.period} onClick={() => setPeriod(value.period)}><span>{fmt(value.value)}</span><i className="gray" style={{ height: `${Math.max(((value.value ?? 0) / selectedMax) * 100, 3)}%` }} /><small>{shortPeriod(value.period)}</small></button>)}</div></div></section>

        <section className="dw-card dw-composition"><div className="dw-card-head"><b>企业结构</b><span>{period}</span></div><div className="dw-composition-body"><div className="dw-donut"><span><b>{composition.length}</b><small>家企业</small></span></div><div className="dw-composition-list">{composition.slice(0, 6).map((item, index) => <button key={item.name} onClick={() => selectCompany(item.name)}><i style={{ background: palette[index] }} /><span>{item.name}</span><b>{((item.value / compositionTotal) * 100).toFixed(1)}%</b></button>)}</div></div></section>

        <section className="dw-card dw-raw"><div className="dw-card-head"><b>原始数据</b><span>{category.name} · {period}</span></div><div className="dw-table-wrap"><table><thead><tr><th>企业</th>{rawPeriods.slice(0, 4).map((item) => <th key={item}>{shortPeriod(item)}</th>)}</tr></thead><tbody>{category.companies.slice(0, 5).map((company) => <tr className={selectedCompany.name === company.name ? "active" : ""} key={company.name} onClick={() => selectCompany(company.name)}><th>{company.name}</th>{rawPeriods.slice(0, 4).map((item) => <td key={item} title={valueAt(company, item)?.raw} onClick={(event) => { event.stopPropagation(); selectCompany(company.name, item); }}>{mode === "value" ? valueAt(company, item)?.raw || "—" : signed(valueAt(company, item)?.mom)}</td>)}</tr>)}</tbody></table></div><div className="dw-table-note">点击企业或单元格可联动图表 · 完整数据随产业环节切换</div></section>
      </div>
      <footer className="dw-footer"><span>{data.meta.disclaimer}</span><span>{data.meta.source}</span></footer>
    </section>
  </main>;
}
