"use client";

import { useEffect, useMemo, useState } from "react";
import dataJson from "./sales-data.json";
import "./sales.css";
import "./raw.css";

type Scope = "wholesale" | "retail";
type View = "industry" | "models" | "tables";
type IndustrySeries = Record<string, number[]>;
type ModelRecord = { company: string; fuel: string; subtype: string; model: string; values: number[] };
type ModelData = { periods: string[]; records: ModelRecord[] };
type SourceTable = { title: string; periods: string[]; rows: { row: number; label: string; values: number[] }[] };
type SalesData = { updated: string; note: string; industry: Record<Scope, { periods: string[]; series: IndustrySeries }>; models: Record<Scope, ModelData>; tables: Record<Scope, SourceTable[]> };

const data = dataJson as SalesData;
const palette = ["#173f62", "#b29a55", "#2b7b86", "#bd6f35", "#6e7f91", "#7c5f8e"];
const formatPeriod = (value: string) => `${value.slice(2, 4)}/${value.slice(5)}`;
const pct = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
const volume = (value: number) => (value / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 });
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function linePoints(values: number[], width: number, height: number, max: number, min = 0) {
  const span = Math.max(max - min, 1);
  return values.map((value, index) => `${40 + index / Math.max(values.length - 1, 1) * (width - 58)},${14 + (max - value) / span * (height - 44)}`).join(" ");
}

function LineChart({ periods, series, percent = false }: { periods: string[]; series: { name: string; values: number[]; color: string }[]; percent?: boolean }) {
  const width = 960;
  const height = 310;
  const all = series.flatMap(item => item.values);
  const max = Math.max(...all, percent ? .1 : 1) * 1.08;
  const min = percent ? Math.min(0, ...all) : 0;
  const labelIndexes = periods.map((_, index) => index).filter(index => index === 0 || index === periods.length - 1 || index % Math.max(1, Math.floor(periods.length / 6)) === 0);
  return <div className="sales-line-chart">
    <div className="sales-legend">{series.map(item => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="销量时间序列">
      {[0, 1, 2, 3, 4].map(tick => { const y = 14 + tick / 4 * (height - 44); const value = max - tick / 4 * (max - min); return <g key={tick}><line x1="40" x2={width - 18} y1={y} y2={y} /><text x="35" y={y + 4}>{percent ? `${(value * 100).toFixed(0)}%` : `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`}</text></g>; })}
      {series.map(item => <polyline key={item.name} points={linePoints(item.values, width, height, max, min)} fill="none" stroke={item.color} strokeWidth="3" vectorEffect="non-scaling-stroke" />)}
      {series.map(item => item.values.map((value, index) => index === item.values.length - 1 ? <circle key={item.name + index} cx={width - 18} cy={14 + (max - value) / Math.max(max - min, 1) * (height - 44)} r="4" fill={item.color} /> : null))}
      {labelIndexes.map(index => <text className="x-label" key={index} x={40 + index / Math.max(periods.length - 1, 1) * (width - 58)} y={height - 7}>{formatPeriod(periods[index])}</text>)}
    </svg>
  </div>;
}

function Kpi({ label, value, unit, note, tone }: { label: string; value: string; unit?: string; note: string; tone?: "positive" | "negative" }) {
  return <article className="sales-kpi"><span>{label}</span><div><strong className={tone}>{value}</strong>{unit && <em>{unit}</em>}</div><p>{note}</p></article>;
}

function IndustryView({ scope }: { scope: Scope }) {
  const source = data.industry[scope];
  const [range, setRange] = useState<24 | 48 | 0>(48);
  const start = range ? Math.max(0, source.periods.length - range) : 0;
  const periods = source.periods.slice(start);
  const series = Object.fromEntries(Object.entries(source.series).map(([key, values]) => [key, values.slice(start)])) as IndustrySeries;
  const latest = source.periods.length - 1;
  const original = source.series;
  const latestNev = original.nev[latest];
  const latestBev = original.bev[latest];
  const latestPhev = original.phev[latest];
  const penetration = original.penetration[latest];
  const structureTotal = Math.max(latestBev + latestPhev, 1);
  const bevShare = latestBev / structureTotal * 100;
  return <>
    <section className="sales-kpi-grid">
      <Kpi label={`${data.updated} 新能源乘用车`} value={volume(latestNev)} unit="万辆" note={scope === "wholesale" ? "乘联会批发口径" : "乘联会零售口径"} />
      <Kpi label="同比变化" value={pct(original.yoy[latest])} note="较上年同期" tone={original.yoy[latest] >= 0 ? "positive" : "negative"} />
      <Kpi label="环比变化" value={pct(original.mom[latest])} note="较上月" tone={original.mom[latest] >= 0 ? "positive" : "negative"} />
      <Kpi label="新能源渗透率" value={`${(penetration * 100).toFixed(1)}%`} note="新能源乘用车 / 乘用车总口径" />
    </section>
    <section className="sales-dashboard-grid industry-grid">
      <article className="sales-panel sales-main-panel"><header><div><span>月度趋势</span><h2>新能源乘用车销量时间序列</h2></div><div className="range-switch"><button className={range === 24 ? "active" : ""} onClick={() => setRange(24)}>近24月</button><button className={range === 48 ? "active" : ""} onClick={() => setRange(48)}>近48月</button><button className={range === 0 ? "active" : ""} onClick={() => setRange(0)}>全部</button></div></header><LineChart periods={periods} series={[{ name: "新能源乘用车", values: series.nev, color: palette[0] }, { name: "纯电动", values: series.bev, color: palette[1] }, { name: "插电混动", values: series.phev, color: palette[2] }]} /></article>
      <article className="sales-panel structure-panel"><header><div><span>动力结构</span><h2>{data.updated} 销量构成</h2></div></header><div className="sales-donut" style={{ background: `conic-gradient(${palette[0]} 0 ${bevShare}%, ${palette[1]} ${bevShare}% 100%)` }}><div><strong>{volume(latestNev)}</strong><span>万辆</span><small>新能源乘用车</small></div></div><div className="structure-list"><div><i style={{ background: palette[0] }} /><span>纯电动</span><strong>{volume(latestBev)} 万辆</strong><em>{bevShare.toFixed(1)}%</em></div><div><i style={{ background: palette[1] }} /><span>插电混动</span><strong>{volume(latestPhev)} 万辆</strong><em>{(100 - bevShare).toFixed(1)}%</em></div>{scope === "wholesale" && <><div><i style={{ background: palette[2] }} /><span>其中：增程式</span><strong>{volume(original.erev[latest])} 万辆</strong><em>批发</em></div><div><i style={{ background: palette[3] }} /><span>其中：纯插混</span><strong>{volume(original.purePhev[latest])} 万辆</strong><em>批发</em></div></>}</div></article>
      <article className="sales-panel penetration-panel"><header><div><span>市场渗透</span><h2>新能源乘用车渗透率</h2></div><small>{periods[0]} — {periods[periods.length - 1]}</small></header><LineChart periods={periods} percent series={[{ name: "渗透率", values: series.penetration, color: palette[3] }]} /></article>
      {scope === "wholesale" && <article className="sales-panel segment-panel"><header><div><span>商用车观察</span><h2>客车与专用车</h2></div><small>乘联会批发</small></header><div className="segment-bars">{[["新能源客车", original.bus[latest], palette[2]], ["新能源专用车", original.special[latest], palette[3]]].map(([name, value, color]) => <div key={String(name)}><span>{name}</span><strong>{Number(value).toLocaleString("zh-CN")} 辆</strong><i><b style={{ width: `${Number(value) / Math.max(original.bus[latest], original.special[latest], 1) * 100}%`, background: String(color) }} /></i></div>)}</div></article>}
    </section>
  </>;
}

function aggregateCompanies(modelData: ModelData) {
  const map = new Map<string, number[]>();
  modelData.records.forEach(record => { const values = map.get(record.company) || Array(modelData.periods.length).fill(0); record.values.forEach((value, index) => { values[index] += value; }); map.set(record.company, values); });
  return [...map.entries()].map(([name, values]) => ({ name, values })).sort((a, b) => sum(b.values.slice(-6)) - sum(a.values.slice(-6)));
}

function CompanyPicker({ companies, selected, onChange }: { companies: string[]; selected: string[]; onChange: (value: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visible = companies.filter(name => name.toLowerCase().includes(query.toLowerCase()));
  const toggle = (name: string) => selected.includes(name) ? onChange(selected.filter(item => item !== name)) : selected.length < 6 && onChange([...selected, name]);
  return <div className="company-picker"><button className="picker-trigger" onClick={() => setOpen(!open)}><span>选择企业</span><strong>{selected.length} / 6</strong></button>{open && <div className="picker-popover"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索企业" autoFocus /><div>{visible.map(name => <label key={name}><input type="checkbox" checked={selected.includes(name)} disabled={!selected.includes(name) && selected.length >= 6} onChange={() => toggle(name)} /><span>{name}</span></label>)}</div></div>}</div>;
}

function ModelsView({ scope }: { scope: Scope }) {
  const modelData = data.models[scope];
  const companies = useMemo(() => aggregateCompanies(modelData), [modelData]);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailCompany, setDetailCompany] = useState("");
  useEffect(() => { const defaults = companies.slice(0, 5).map(item => item.name); setSelected(defaults); setDetailCompany(defaults[0] || ""); }, [companies]);
  const selectedSeries = companies.filter(item => selected.includes(item.name));
  const latestIndex = modelData.periods.length - 1;
  const latestRanking = companies.slice().sort((a, b) => b.values[latestIndex] - a.values[latestIndex]).slice(0, 12);
  const detailRecords = modelData.records.filter(record => record.company === detailCompany);
  const topModels = detailRecords.map(record => ({ ...record, total: sum(record.values.slice(-6)), latest: record.values[latestIndex] })).sort((a, b) => b.total - a.total).slice(0, 10);
  const fuelMap = new Map<string, number>();
  detailRecords.forEach(record => fuelMap.set(record.fuel, (fuelMap.get(record.fuel) || 0) + sum(record.values.slice(-6))));
  const fuelRows = [...fuelMap.entries()].sort((a, b) => b[1] - a[1]);
  const fuelMax = Math.max(...fuelRows.map(row => row[1]), 1);
  return <>
    <section className="model-toolbar"><div><span>企业对比</span><strong>{scope === "wholesale" ? "批发" : "零售"} · 2025—2026</strong><small>最多同时选择 6 家企业</small></div><CompanyPicker companies={companies.map(item => item.name)} selected={selected} onChange={setSelected} /><div className="selected-chips">{selected.map((name, index) => <button key={name} onClick={() => setSelected(selected.filter(item => item !== name))}><i style={{ background: palette[index % palette.length] }} />{name}<b>×</b></button>)}</div></section>
    <section className="sales-dashboard-grid model-grid">
      <article className="sales-panel company-trend-panel"><header><div><span>企业纵向</span><h2>月度销量趋势</h2></div><small>单位：辆</small></header><LineChart periods={modelData.periods} series={selectedSeries.map((item, index) => ({ name: item.name, values: item.values, color: palette[index % palette.length] }))} /></article>
      <article className="sales-panel ranking-panel"><header><div><span>企业横向</span><h2>{data.updated} 企业排名</h2></div><small>前 12 家</small></header><div className="company-ranking">{latestRanking.map((item, index) => <button key={item.name} className={detailCompany === item.name ? "active" : ""} onClick={() => setDetailCompany(item.name)}><em>{String(index + 1).padStart(2, "0")}</em><span>{item.name}</span><i><b style={{ width: `${item.values[latestIndex] / Math.max(latestRanking[0]?.values[latestIndex] || 1, 1) * 100}%` }} /></i><strong>{item.values[latestIndex].toLocaleString("zh-CN")}</strong></button>)}</div></article>
      <article className="sales-panel model-panel"><header><div><span>车型下钻</span><h2>{detailCompany || "请选择企业"} · 车型表现</h2></div><select value={detailCompany} onChange={event => setDetailCompany(event.target.value)}>{companies.map(item => <option key={item.name}>{item.name}</option>)}</select></header><div className="model-table"><div className="model-table-head"><span>车型</span><span>动力</span><span>{data.updated}</span><span>2026累计</span></div>{topModels.map(item => <div key={`${item.model}-${item.fuel}`}><strong>{item.model}</strong><span>{item.subtype}</span><em>{item.latest.toLocaleString("zh-CN")}</em><b>{item.total.toLocaleString("zh-CN")}</b></div>)}</div></article>
      <article className="sales-panel fuel-panel"><header><div><span>动力结构</span><h2>{detailCompany || "企业"} · 2026累计</h2></div></header><div className="fuel-bars">{fuelRows.map(([name, value], index) => <div key={name}><span>{name}</span><strong>{value.toLocaleString("zh-CN")} 辆</strong><i><b style={{ width: `${value / fuelMax * 100}%`, background: palette[index % palette.length] }} /></i></div>)}</div></article>
      <article className="sales-panel matrix-panel"><header><div><span>月度矩阵</span><h2>头部企业最近六个月销量</h2></div><small>横向企业 × 纵向时间</small></header><div className="matrix-wrap"><table><thead><tr><th>企业</th>{modelData.periods.slice(-6).map(period => <th key={period}>{formatPeriod(period)}</th>)}</tr></thead><tbody>{latestRanking.slice(0, 10).map(company => <tr key={company.name}><td>{company.name}</td>{company.values.slice(-6).map((value, index) => <td key={index}>{value.toLocaleString("zh-CN")}</td>)}</tr>)}</tbody></table></div></article>
    </section>
  </>;
}

function RawDataView({ scope }: { scope: Scope }) {
  const [source, setSource] = useState<"industry" | "models">("industry");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [windowSize, setWindowSize] = useState<12 | 24 | 0>(12);
  const [selectedRow, setSelectedRow] = useState(0);
  const [page, setPage] = useState(0);
  const sections = data.tables[scope];
  const section = sections[Math.min(sectionIndex, sections.length - 1)];
  const start = windowSize ? Math.max(0, section.periods.length - windowSize) : 0;
  const visibleRows = section.rows.filter(row => row.label.toLowerCase().includes(query.toLowerCase()));
  const activeRow = visibleRows[Math.min(selectedRow, Math.max(visibleRows.length - 1, 0))];
  const modelData = data.models[scope];
  const modelRows = modelData.records.filter(record => `${record.company} ${record.fuel} ${record.subtype} ${record.model}`.toLowerCase().includes(query.toLowerCase()));
  const pageSize = 60;
  const pageCount = Math.max(1, Math.ceil(modelRows.length / pageSize));
  useEffect(() => { setSectionIndex(0); setSelectedRow(0); setPage(0); }, [scope]);
  useEffect(() => { setSelectedRow(0); setPage(0); }, [query, source, sectionIndex]);
  return <>
    <section className="source-toolbar"><div className="source-switch"><button className={source === "industry" ? "active" : ""} onClick={() => setSource("industry")}>乘联会【{scope === "wholesale" ? "批发" : "零售"}】</button><button className={source === "models" ? "active" : ""} onClick={() => setSource("models")}>分车型【{scope === "wholesale" ? "批发" : "零售"}】</button></div><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索数据项、企业或车型" /><span>{source === "industry" ? `${sections.length} 个数据分表 · ${section.rows.length} 行` : `${modelData.records.length} 条车型记录`}</span></section>
    {source === "industry" ? <section className="raw-layout"><aside className="raw-section-list"><header><span>SHEET TABLES</span><strong>数据分表</strong></header>{sections.map((item, index) => <button key={item.title} className={index === sectionIndex ? "active" : ""} onClick={() => { setSectionIndex(index); setSelectedRow(0); }}><i>{String(index + 1).padStart(2, "0")}</i><span>{item.title}</span><b>{item.rows.length}</b></button>)}</aside><div className="raw-content"><article className="sales-panel raw-chart-panel"><header><div><span>{section.title}</span><h2>{activeRow?.label || "选择数据项"}</h2></div><div className="range-switch"><button className={windowSize === 12 ? "active" : ""} onClick={() => setWindowSize(12)}>近12月</button><button className={windowSize === 24 ? "active" : ""} onClick={() => setWindowSize(24)}>近24月</button><button className={windowSize === 0 ? "active" : ""} onClick={() => setWindowSize(0)}>全部</button></div></header>{activeRow && <LineChart periods={section.periods.slice(start)} series={[{ name: activeRow.label, values: activeRow.values.slice(start), color: palette[0] }]} />}</article><article className="sales-panel raw-table-panel"><header><div><span>完整分表</span><h2>{section.title}</h2></div><small>点击任一行可查看纵向趋势</small></header><div className="raw-table-wrap"><table><thead><tr><th>原表行</th><th>数据项</th>{section.periods.slice(start).map(period => <th key={period}>{formatPeriod(period)}</th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.row} className={activeRow?.row === row.row ? "active" : ""} onClick={() => setSelectedRow(index)}><td>{row.row}</td><td>{row.label}</td>{row.values.slice(start).map((value, valueIndex) => <td key={valueIndex}>{value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}</td>)}</tr>)}</tbody></table></div></article></div></section> : <section className="sales-panel full-model-table"><header><div><span>完整车型明细</span><h2>企业 × 动力类型 × 车型 × 月度销量</h2></div><small>第 {Math.min(page + 1, pageCount)} / {pageCount} 页 · 共 {modelRows.length} 条</small></header><div className="raw-table-wrap"><table><thead><tr><th>企业</th><th>燃料类型</th><th>新能源细分</th><th>标准车型</th>{modelData.periods.map(period => <th key={period}>{formatPeriod(period)}</th>)}</tr></thead><tbody>{modelRows.slice(page * pageSize, page * pageSize + pageSize).map((record, index) => <tr key={`${record.company}-${record.model}-${index}`}><td>{record.company}</td><td>{record.fuel}</td><td>{record.subtype}</td><td>{record.model}</td>{record.values.map((value, valueIndex) => <td key={valueIndex}>{value.toLocaleString("zh-CN")}</td>)}</tr>)}</tbody></table></div><div className="pager"><button disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>上一页</button><span>{page + 1} / {pageCount}</span><button disabled={page >= pageCount - 1} onClick={() => setPage(Math.min(pageCount - 1, page + 1))}>下一页</button></div></section>}
  </>;
}

export default function SalesPage() {
  const [scope, setScope] = useState<Scope>("wholesale");
  const [view, setView] = useState<View>("industry");
  const subtitle = view === "industry" ? "乘联会行业口径与动力结构" : view === "models" ? "企业横向对比与车型纵向趋势" : "四个核心 Sheet 的完整分表与明细查询";
  return <main className="sales-shell"><aside className="sales-sidebar"><a className="sales-brand" href="/"><span>东吴</span><div><strong>东吴证券</strong><small>SOOCHOW SECURITIES</small></div></a><p>销量数据库</p><nav><button className={view === "industry" ? "active" : ""} onClick={() => setView("industry")}><i>01</i><span><b>乘联会</b><small>行业口径 · 总量趋势</small></span></button><button className={view === "models" ? "active" : ""} onClick={() => setView("models")}><i>02</i><span><b>分车型</b><small>企业选择 · 车型下钻</small></span></button><button className={view === "tables" ? "active" : ""} onClick={() => setView("tables")}><i>03</i><span><b>全部分表</b><small>完整数据 · 搜索查询</small></span></button></nav><div className="sales-current"><span>CURRENT DATABASE</span><b>国内电动车销量</b><small>WHOLESALE · RETAIL</small></div><a className="back-home" href="/">← 返回数据库总库</a></aside><section className="sales-workspace"><header className="sales-topbar"><div><p>DONGWU NEW ENERGY · VEHICLE SALES</p><h1>国内电动车销量数据库</h1><span>{subtitle}</span></div><div className="scope-switch"><button className={scope === "wholesale" ? "active" : ""} onClick={() => setScope("wholesale")}>批发</button><button className={scope === "retail" ? "active" : ""} onClick={() => setScope("retail")}>零售</button></div><div className="sales-update"><small>数据更新至</small><strong>{data.updated}</strong><span>来源：乘联会</span></div></header><div className="mobile-view-switch"><button className={view === "industry" ? "active" : ""} onClick={() => setView("industry")}>乘联会</button><button className={view === "models" ? "active" : ""} onClick={() => setView("models")}>分车型</button><button className={view === "tables" ? "active" : ""} onClick={() => setView("tables")}>全部分表</button></div>{view === "industry" ? <IndustryView scope={scope} /> : view === "models" ? <ModelsView scope={scope} /> : <RawDataView scope={scope} />}<footer>{data.note} · 页面数值按原工作簿当前已填月份展示</footer></section></main>;
}
