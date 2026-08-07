"use client";

import { useMemo, useState } from "react";
import rawData from "./data/lithium-production.json";

type Value = { period: string; raw: string; value: number | null; mom: number | null };
type Company = { name: string; values: Value[] };
type Category = { key: string; name: string; unit: string; color: string; companies: Company[]; totals: Value[] };
type DataSet = { meta: { title: string; latestPeriod: string; source: string; disclaimer: string }; periods: string[]; categories: Category[] };

const data = rawData as DataSet;
const periods = data.periods.slice(-12);
const palette = ["#9aa6b7", "#8052e8", "#2d6fe7", "#1c9b57", "#d18d12", "#ff514e", "#0e416f", "#a69a5d"];
const T = {
  brand: "东吴电新",
  title: "锂电产业链排产数据库",
  month: "月份",
  segment: "环节",
  raw: "原始数据",
  company: "企业",
  search: "搜索企业",
  clear: "清除",
  trend: "总量趋势",
  line: "企业横向对比",
  vertical: "公司纵向数据",
  value: "产量",
  mom: "环比",
  structure: "企业结构",
  observe: "环比观察",
};

const periodLabel = (period: string) => `${period.slice(2, 4)}.${period.slice(5)}`;
const fmt = (value: number | null | undefined, digits = 1) => value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const signed = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
const valueAt = (company: Company, period: string) => company.values.find((value) => value.period === period);

function linePoint(value: number, max: number, index: number, count: number) {
  const x = 58 + (index * 660) / Math.max(count - 1, 1);
  const y = 220 - (value / Math.max(max, 1)) * 176;
  return { x, y };
}

function linePoints(company: Company, max: number) {
  return periods.map((period, index) => {
    const point = linePoint(valueAt(company, period)?.value ?? 0, max, index, periods.length);
    return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }).join(" ");
}

export function LithiumDashboard() {
  const [categoryKey, setCategoryKey] = useState("battery");
  const [period, setPeriod] = useState(data.meta.latestPeriod);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"value" | "mom">("value");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const category = data.categories.find((item) => item.key === categoryKey) ?? data.categories[0];
  const selectedTotal = category.totals.find((value) => value.period === period) ?? category.totals.at(-1)!;
  const rows = useMemo(() => category.companies.filter((company) => !search || company.name.includes(search.trim())), [category, search]);
  const selectedCompany = category.companies.find((company) => company.name === selectedCompanyName) ?? rows[0] ?? category.companies[0];
  const recentTotals = category.totals.filter((value) => periods.includes(value.period));
  const maxTotal = Math.max(...recentTotals.map((value) => value.value ?? 0), 1);
  const companyMax = Math.max(...category.companies.flatMap((company) => company.values.filter((value) => periods.includes(value.period)).map((value) => value.value ?? 0)), 1);
  const selectedMax = Math.max(...selectedCompany.values.filter((value) => periods.includes(value.period)).map((value) => value.value ?? 0), 1);
  const allLatest = data.categories.map((item) => ({ ...item, latest: item.totals.find((value) => value.period === period) ?? item.totals.at(-1)! }));
  const composition = rows.map((company) => ({ name: company.name, value: valueAt(company, period)?.value ?? 0 })).sort((a, b) => b.value - a.value);
  const selectCompany = (name: string, nextPeriod?: string) => { setSelectedCompanyName(name); if (nextPeriod) setPeriod(nextPeriod); };

  return (
    <main className="pbix-shell">
      <header className="pbix-header">
        <div>
          <div className="pbix-brand">{T.brand}</div>
          <h1>{T.title}</h1>
          <small>企业排产数据 · 月度跟踪 · 可视化工作台</small>
        </div>
        <div className="pbix-filters">
          <label>{T.month}<select value={period} onChange={(event) => setPeriod(event.target.value)}>{data.periods.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>{T.segment}<select value={categoryKey} onChange={(event) => { setCategoryKey(event.target.value); setSelectedCompanyName(""); }}>{data.categories.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
        </div>
      </header>

      <section className="pbix-kpis">
        {allLatest.map((item) => <button className={`pbix-kpi ${item.key === categoryKey ? "selected" : ""}`} key={item.key} onClick={() => { setCategoryKey(item.key); setSelectedCompanyName(""); }}>
          <span>{item.name}</span><strong>{fmt(item.latest.value)}</strong><small>{item.unit} · {T.mom} <b className={item.latest.mom != null && item.latest.mom < 0 ? "down" : "up"}>{signed(item.latest.mom)}</b></small>
        </button>)}
      </section>

      <div className="pbix-body">
        <section className="pbix-left">
          <div className="pbix-panel raw-panel">
            <div className="pbix-panel-head">
              <div><b>{T.raw}</b><small>{category.name} · {T.company} 排产明细 · {period}</small></div>
              <div className="pbix-tools"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={T.search} /><button onClick={() => setSearch("")}>{T.clear}</button></div>
            </div>
            <div className="pbix-table-wrap">
              <table className="pbix-table"><thead><tr><th>{T.company}</th>{periods.map((item) => <th key={item}>{periodLabel(item)}</th>)}</tr></thead>
                <tbody>{rows.map((company) => <tr className={selectedCompany?.name === company.name ? "selected-row" : ""} key={company.name} onClick={() => selectCompany(company.name)}>
                  <th>{company.name}</th>{periods.map((item) => { const value = valueAt(company, item); return <td key={item} title={value?.raw} onClick={(event) => { event.stopPropagation(); selectCompany(company.name, item); }}>{mode === "value" ? (value?.raw || "—") : signed(value?.mom)}</td>; })}
                </tr>)}</tbody>
              </table>
            </div>
            <div className="pbix-note">点击企业行查看纵向柱状图；点击单元格同时切换月份。原始文本保留铁锂、三元、湿法、干法等拆分。</div>
          </div>
        </section>

        <section className="pbix-right">
          <div className="pbix-panel trend-panel">
            <div className="pbix-panel-head"><div><b>{category.name}{T.trend}</b><small>总量与月度环比</small></div><div className="pbix-toggle"><button className={mode === "value" ? "active" : ""} onClick={() => setMode("value")}>{T.value}</button><button className={mode === "mom" ? "active" : ""} onClick={() => setMode("mom")}>{T.mom}</button></div></div>
            <div className="pbix-chart"><div className="pbix-yaxis"><span>{fmt(maxTotal, 0)}</span><span>{fmt(maxTotal / 2, 0)}</span><span>0</span></div><div className="pbix-bars">{recentTotals.map((value) => { const height = mode === "value" ? ((value.value ?? 0) / maxTotal) * 100 : Math.min(Math.abs(value.mom ?? 0) * 260, 100); return <div className="pbix-bar-item" key={value.period}><span className={value.mom != null && value.mom < 0 ? "down" : "up"}>{mode === "value" ? fmt(value.value) : signed(value.mom)}</span><i className={value.mom != null && value.mom < 0 ? "negative" : ""} style={{ height: `${Math.max(height, 3)}%` }} /><small>{periodLabel(value.period)}</small></div>; })}</div></div>
          </div>

          <div className="pbix-panel line-panel">
            <div className="pbix-panel-head"><div><b>{category.name}{T.line}</b><small>每条彩色折线代表一家企业 · 点击线条或图例联动</small></div><span className="chart-unit">单位：{category.unit}</span></div>
            <div className="pbix-line-chart">
              <div className="pbix-line-legend">{category.companies.map((company, index) => <button className={selectedCompany?.name === company.name ? "active" : ""} key={company.name} onClick={() => selectCompany(company.name)}><i style={{ background: palette[index % palette.length] }} />{company.name}</button>)}</div>
              <svg viewBox="0 0 760 270" role="img" aria-label={`${category.name}${T.line}`}>
                {[0, 1, 2, 3, 4].map((step) => { const y = 220 - step * 44; return <g key={step}><line x1="58" y1={y} x2="718" y2={y} /><text x="47" y={y + 4} textAnchor="end">{fmt((companyMax * step) / 4, 0)}</text></g>; })}
                <line className="chart-axis" x1="58" y1="220" x2="718" y2="220" /><line className="chart-axis" x1="58" y1="44" x2="58" y2="220" />
                {category.companies.map((company, index) => <g key={company.name} className="company-line" onClick={() => selectCompany(company.name)}>
                  <polyline points={linePoints(company, companyMax)} fill="none" stroke={palette[index % palette.length]} strokeWidth={selectedCompany?.name === company.name ? 3.4 : 2.2} opacity={selectedCompany?.name === company.name ? 1 : .86} />
                  {periods.map((item, pointIndex) => { const point = linePoint(valueAt(company, item)?.value ?? 0, companyMax, pointIndex, periods.length); return <circle key={item} cx={point.x} cy={point.y} r={selectedCompany?.name === company.name ? 4 : 3} fill={palette[index % palette.length]}><title>{`${company.name} ${periodLabel(item)}：${valueAt(company, item)?.raw || "—"}`}</title></circle>; })}
                </g>)}
                {periods.map((item, index) => { const point = linePoint(0, companyMax, index, periods.length); return <text key={item} x={point.x} y="244" textAnchor="middle">{periodLabel(item)}</text>; })}
              </svg>
            </div>
          </div>

          <div className="pbix-panel company-panel">
            <div className="pbix-panel-head"><div><b>{selectedCompany?.name ?? "—"}{T.vertical}</b><small>{period} · {category.name} · {category.unit}</small></div><strong className={valueAt(selectedCompany, period)?.mom != null && (valueAt(selectedCompany, period)?.mom ?? 0) < 0 ? "down" : "up"}>{signed(valueAt(selectedCompany, period)?.mom)}</strong></div>
            <div className="company-bars">{selectedCompany?.values.filter((value) => periods.includes(value.period)).map((value) => <div className="company-bar" key={value.period}><span>{fmt(value.value)}</span><i style={{ height: `${Math.max(((value.value ?? 0) / selectedMax) * 100, 3)}%` }} /><small>{periodLabel(value.period)}</small></div>)}</div>
          </div>

          <div className="pbix-dual">
            <div className="pbix-panel composition-panel"><div className="pbix-panel-head"><div><b>{T.structure}</b><small>{period} · {category.unit}</small></div></div><div className="donut-wrap"><div className="pbix-donut"><div><strong>{fmt(selectedTotal.value)}</strong><small>{category.unit}</small></div></div><div className="donut-rows">{composition.slice(0, 6).map((item, index) => <div key={item.name}><i style={{ background: palette[index] }} /><span>{item.name}</span><b>{fmt(item.value)}</b></div>)}</div></div></div>
            <div className="pbix-panel ratio-panel"><div className="pbix-panel-head"><div><b>{T.observe}</b><small>最新月份 {period}</small></div></div><div className="ratio-value"><strong className={selectedTotal.mom != null && selectedTotal.mom < 0 ? "down" : "up"}>{signed(selectedTotal.mom)}</strong><span>较上月</span></div><div className="ratio-list">{allLatest.map((item) => <div key={item.key}><span>{item.name}</span><b className={item.latest.mom != null && item.latest.mom < 0 ? "down" : "up"}>{signed(item.latest.mom)}</b></div>)}</div></div>
          </div>
        </section>
      </div>

      <footer className="pbix-footer"><span>数据来源：{data.meta.source}</span><span>文件更新：2026-08-05</span><span>{data.meta.disclaimer}</span></footer>
    </main>
  );
}
