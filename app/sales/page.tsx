"use client";

import { useEffect, useMemo, useState } from "react";
import dataJson from "./sales-data.json";
import coreChartsJson from "./core-chart-data.json";
import "./sales.css";
import "./raw.css";
import "./sheets.css";
import "./core-charts.css";
import "../research-template.css";

type Scope = "wholesale" | "retail";
type SheetKey = "wholesale-industry" | "wholesale-models" | "retail-industry" | "retail-models";
type IndustrySeries = Record<string, number[]>;
type ModelRecord = { company: string; fuel: string; subtype: string; model: string; values: number[] };
type ModelData = { periods: string[]; records: ModelRecord[] };
type TableRow = { row: number; label: string; values: number[] };
type SourceTable = { title: string; periods: string[]; rows: TableRow[] };
type SalesData = { updated: string; note: string; industry: Record<Scope, { periods: string[]; series: IndustrySeries }>; models: Record<Scope, ModelData>; tables: Record<Scope, SourceTable[]> };
type CoreSeries = { name: string; mode: "bar" | "line"; percent: boolean; values: (number | null)[] };
type CoreChart = { id: string; title: string; module: SheetKey; source: string; unit: string; category: string; categories: string[]; series: CoreSeries[] };

const data = dataJson as SalesData;
const coreCharts = coreChartsJson as CoreChart[];
const palette = ["#173f62", "#b29a55", "#2b7b86", "#bd6f35", "#6e7f91", "#7c5f8e"];
const modelLineColor = (index: number) => index < palette.length ? palette[index] : `hsl(${(205 + index * 137.508) % 360} 48% ${38 + index % 3 * 8}%)`;
const formatPeriod = (value: string) => `${value.slice(2, 4)}/${value.slice(5)}`;
const pct = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
const volume = (value: number) => (value / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 });
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const modelRecordKey = (record: ModelRecord) => `${record.fuel}|${record.subtype}|${record.model}`;

function linePoints(values: number[], width: number, height: number, max: number, min = 0) {
  const span = Math.max(max - min, 1);
  return values.map((value, index) => `${40 + index / Math.max(values.length - 1, 1) * (width - 58)},${14 + (max - value) / span * (height - 44)}`).join(" ");
}

function LineChart({ periods, series, percent = false, vehicles = false, modelStyle = false }: { periods: string[]; series: { name: string; values: number[]; color: string }[]; percent?: boolean; vehicles?: boolean; modelStyle?: boolean }) {
  const width = 960;
  const height = 310;
  const all = series.flatMap(item => item.values);
  const max = Math.max(...all, percent ? .1 : 1) * 1.08;
  const min = percent ? Math.min(0, ...all) : 0;
  const labelIndexes = periods.map((_, index) => index).filter(index => index === 0 || index === periods.length - 1 || index % Math.max(1, Math.floor(periods.length / 6)) === 0);
  return <div className={`sales-line-chart${modelStyle ? " sales-model-line-chart" : ""}`}>
    <div className="sales-legend">{series.map(item => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="销量时间序列">
      {[0, 1, 2, 3, 4].map(tick => { const y = 14 + tick / 4 * (height - 44); const value = max - tick / 4 * (max - min); return <g key={tick}><line x1="40" x2={width - 18} y1={y} y2={y} /><text x="35" y={y + 4}>{percent ? `${(value * 100).toFixed(0)}%` : vehicles ? Math.round(value).toLocaleString("zh-CN") : `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`}</text></g>; })}
      {series.map(item => <polyline key={item.name} points={linePoints(item.values, width, height, max, min)} fill="none" stroke={item.color} strokeWidth={modelStyle ? "2.4" : "3"} vectorEffect="non-scaling-stroke" />)}
      {series.map(item => item.values.map((value, index) => modelStyle || index === item.values.length - 1 ? <circle key={item.name + index} cx={40 + index / Math.max(item.values.length - 1, 1) * (width - 58)} cy={14 + (max - value) / Math.max(max - min, 1) * (height - 44)} r={modelStyle ? "2.8" : "4"} fill={item.color}><title>{`${item.name} · ${periods[index]} · ${value.toLocaleString("zh-CN")}辆`}</title></circle> : null))}
      {labelIndexes.map(index => <text className="x-label" key={index} x={40 + index / Math.max(periods.length - 1, 1) * (width - 58)} y={height - 7}>{formatPeriod(periods[index])}</text>)}
    </svg>
  </div>;
}

function coreValue(value: number, percent: boolean, unit: string) {
  if (percent) return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(0)}%`;
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}${unit}`;
}

function lastCoreValue(values: (number | null)[]) {
  for (let index = values.length - 1; index >= 0; index -= 1) if (values[index] !== null) return values[index];
  return null;
}

function CoreChartFigure({ chart }: { chart: CoreChart }) {
  const cumulative = chart.category === "累计销量";
  const meaningfulStartIndex = Math.max(chart.categories.findIndex((_, index) => chart.series.some(series => !series.percent && series.values[index] !== null && Math.abs(series.values[index] as number) > 1e-12)), 0);
  const [startIndex, setStartIndex] = useState(meaningfulStartIndex);
  const [endIndex, setEndIndex] = useState(Math.max(chart.categories.length - 1, 0));
  const availableCumulativeMonths = useMemo(() => Array.from(new Set(chart.categories.filter((_, index) => chart.series.some(series => !series.percent && series.values[index] !== null)).map(period => period.slice(5)))).sort(), [chart]);
  const defaultCumulativeMonth = chart.categories[chart.categories.length - 1]?.slice(5) || availableCumulativeMonths[availableCumulativeMonths.length - 1] || "01";
  const [cumulativeMonth, setCumulativeMonth] = useState(defaultCumulativeMonth);
  const cumulativeIndexes = useMemo(() => chart.categories.map((period, index) => ({ period, index })).filter(item => item.period.slice(5) === cumulativeMonth && chart.series.some(series => !series.percent && series.values[item.index] !== null)).map(item => item.index), [chart, cumulativeMonth]);
  const [startYearIndex, setStartYearIndex] = useState(0);
  const [endYearIndex, setEndYearIndex] = useState(Math.max(cumulativeIndexes.length - 1, 0));
  useEffect(() => {
    setStartIndex(meaningfulStartIndex);
    setEndIndex(Math.max(chart.categories.length - 1, 0));
    setCumulativeMonth(defaultCumulativeMonth);
    const latestMonthCount = chart.categories.filter((period, index) => period.slice(5) === defaultCumulativeMonth && chart.series.some(series => !series.percent && series.values[index] !== null)).length;
    setStartYearIndex(0);
    setEndYearIndex(Math.max(latestMonthCount - 1, 0));
  }, [chart.id, chart.categories.length, meaningfulStartIndex, defaultCumulativeMonth]);
  const selectedIndexes = cumulative ? cumulativeIndexes.slice(startYearIndex, endYearIndex + 1) : chart.categories.map((_, index) => index).slice(startIndex, endIndex + 1);
  const categories = selectedIndexes.map(index => cumulative ? chart.categories[index].slice(0, 4) : chart.categories[index]);
  const shownSeries = chart.series.map(series => ({ ...series, values: selectedIndexes.map(index => series.values[index]) }));
  const width = 760;
  const height = 292;
  const left = 48;
  const right = 48;
  const top = 18;
  const bottom = 38;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const volumeSeries = shownSeries.filter(series => !series.percent);
  const percentSeries = shownSeries.filter(series => series.percent);
  const barSeries = shownSeries.filter(series => series.mode === "bar" && !series.percent);
  const volumeValues = volumeSeries.flatMap(series => series.values.filter((value): value is number => value !== null));
  const percentValues = percentSeries.flatMap(series => series.values.filter((value): value is number => value !== null));
  const volumeMax = Math.max(...volumeValues, 1) * 1.12;
  const percentMin = Math.min(0, ...percentValues);
  const percentMax = Math.max(.2, ...percentValues);
  const percentSpan = Math.max(percentMax - percentMin, .1);
  const step = plotWidth / Math.max(categories.length, 1);
  const barWidth = Math.min(22, step * .68 / Math.max(barSeries.length, 1));
  const labelEvery = Math.max(1, Math.ceil(categories.length / 8));
  const x = (index: number) => left + step * (index + .5);
  const volumeY = (value: number) => top + (volumeMax - value) / volumeMax * plotHeight;
  const percentY = (value: number) => top + (percentMax - value) / percentSpan * plotHeight;
  return <article className="core-chart-card">
    <header><div><span>{chart.category}</span><h3>{chart.title}</h3></div><div className="core-chart-controls"><b>{chart.source}</b>{cumulative ? <><label>累计至<select aria-label={`${chart.title}累计区间`} value={cumulativeMonth} onChange={event => { const nextMonth = event.target.value; const nextCount = chart.categories.filter((period, index) => period.slice(5) === nextMonth && chart.series.some(series => !series.percent && series.values[index] !== null)).length; setCumulativeMonth(nextMonth); setStartYearIndex(0); setEndYearIndex(Math.max(nextCount - 1, 0)); }}>{availableCumulativeMonths.map(month => <option key={`cumulative-${month}`} value={month}>1—{Number(month)}月</option>)}</select></label><label>起始年度<select aria-label={`${chart.title}起始年度`} value={startYearIndex} onChange={event => { const next = Number(event.target.value); setStartYearIndex(next); if (next > endYearIndex) setEndYearIndex(next); }}>{cumulativeIndexes.map((index, optionIndex) => <option key={`year-start-${chart.categories[index]}`} value={optionIndex}>{chart.categories[index].slice(0, 4)}</option>)}</select></label><label>结束年度<select aria-label={`${chart.title}结束年度`} value={endYearIndex} onChange={event => { const next = Number(event.target.value); setEndYearIndex(next); if (next < startYearIndex) setStartYearIndex(next); }}>{cumulativeIndexes.map((index, optionIndex) => <option key={`year-end-${chart.categories[index]}`} value={optionIndex}>{chart.categories[index].slice(0, 4)}</option>)}</select></label></> : <><label>起始<select aria-label={`${chart.title}起始时间`} value={startIndex} onChange={event => { const next = Number(event.target.value); setStartIndex(next); if (next > endIndex) setEndIndex(next); }}>{chart.categories.map((period, index) => <option key={`start-${period}`} value={index}>{period}</option>)}</select></label><label>结束<select aria-label={`${chart.title}结束时间`} value={endIndex} onChange={event => { const next = Number(event.target.value); setEndIndex(next); if (next < startIndex) setStartIndex(next); }}>{chart.categories.map((period, index) => <option key={`end-${period}`} value={index}>{period}</option>)}</select></label></>}</div></header>
    <div className="core-chart-legend">{shownSeries.map((series, index) => <span key={`${series.name}-${index}`}><i className={series.mode} style={{ background: palette[index % palette.length] }} />{series.name}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${chart.title}图表`}>
      {[0, 1, 2, 3, 4].map(tick => {
        const y = top + tick / 4 * plotHeight;
        const value = volumeMax * (1 - tick / 4);
        return <g key={tick}><line className="core-gridline" x1={left} x2={width - right} y1={y} y2={y} /><text className="core-axis-label" x={left - 7} y={y + 4} textAnchor="end">{value.toFixed(value >= 20 ? 0 : 1)}</text>{percentSeries.length > 0 && <text className="core-axis-label" x={width - right + 7} y={y + 4}>{`${(percentMax - tick / 4 * percentSpan) * 100 | 0}%`}</text>}</g>;
      })}
      {barSeries.flatMap((series, seriesIndex) => series.values.map((value, index) => value === null ? null : <rect key={`${series.name}-${index}`} x={x(index) - barWidth * barSeries.length / 2 + seriesIndex * barWidth} y={volumeY(value)} width={Math.max(barWidth - 2, 1)} height={Math.max(top + plotHeight - volumeY(value), 0)} rx="1.5" fill={palette[seriesIndex % palette.length]}><title>{`${categories[index]} · ${series.name}: ${coreValue(value, false, chart.unit)}`}</title></rect>))}
      {shownSeries.filter(series => series.mode === "line").map((series, seriesIndex) => {
        const colorIndex = shownSeries.indexOf(series);
        const points = series.values.map((value, index) => value === null ? null : `${x(index)},${series.percent ? percentY(value) : volumeY(value)}`).filter(Boolean).join(" ");
        return <g key={`${series.name}-${seriesIndex}`}><polyline points={points} fill="none" stroke={palette[colorIndex % palette.length]} strokeWidth="3" vectorEffect="non-scaling-stroke" />{series.values.map((value, index) => value === null ? null : <circle key={index} cx={x(index)} cy={series.percent ? percentY(value) : volumeY(value)} r="2.5" fill={palette[colorIndex % palette.length]}><title>{`${categories[index]} · ${series.name}: ${coreValue(value, series.percent, chart.unit)}`}</title></circle>)}</g>;
      })}
      {categories.map((category, index) => index % labelEvery === 0 || index === categories.length - 1 ? <text key={`${category}-${index}`} className="core-x-label" x={x(index)} y={height - 11} textAnchor="middle">{category}</text> : null)}
    </svg>
    <footer><em>{categories[0]} 至 {categories[categories.length - 1]} · {cumulative ? `1—${Number(cumulativeMonth)}月累计 · ${categories.length}年` : `${categories.length}期`}</em>{shownSeries.map(series => { const value = lastCoreValue(series.values); return value === null ? null : <span key={series.name}><i>{series.name}</i><strong>{coreValue(value, series.percent, chart.unit)}</strong></span>; })}</footer>
  </article>;
}

function CoreChartGallery({ boardKey }: { boardKey: SheetKey }) {
  const charts = coreCharts.filter(chart => chart.module === boardKey && chart.id !== "chart18");
  const categories = Array.from(new Set(charts.map(chart => chart.category)));
  const [category, setCategory] = useState("");
  useEffect(() => setCategory(""), [boardKey]);
  if (!charts.length) return null;
  const visible = category ? charts.filter(chart => chart.category === category) : charts;
  return <section className="core-chart-section">
    {categories.length > 1 && <div className="core-category-tabs">{categories.map(item => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(category === item ? "" : item)}>{item}</button>)}</div>}
    <div className="core-chart-grid">{visible.map(chart => <CoreChartFigure key={chart.id} chart={chart} />)}</div>
  </section>;
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

function ModelPicker({ options, selected, onChange }: { options: { key: string; label: string; detail: string }[]; selected: string[]; onChange: (value: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const maxSelected = 8;
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      if (selected.length > 1) onChange(selected.filter(item => item !== key));
    } else if (selected.length < maxSelected) onChange([...selected, key]);
  };
  const selectedOption = options.find(option => option.key === selected[0]);
  const triggerLabel = selected.length === 1 ? selectedOption?.label || "选择车型" : `已选 ${selected.length} 款车型`;
  return <div className="company-picker model-picker"><button className="picker-trigger model-picker-trigger" aria-expanded={open} onClick={() => setOpen(!open)}><span>{triggerLabel}</span></button>{open && <div className="model-select-menu" role="listbox" aria-label="选择车型" aria-multiselectable="true">{options.map(option => { const active = selected.includes(option.key); return <button type="button" role="option" aria-selected={active} title={option.detail} key={option.key} className={active ? "selected" : ""} disabled={!active && selected.length >= maxSelected} onClick={() => toggle(option.key)}>{option.label}</button>; })}</div>}</div>;
}

function CompanyModelHistory({ modelData, scope }: { modelData: ModelData; scope: Scope }) {
  const companies = useMemo(() => Array.from(new Set(modelData.records.map(record => record.company))).sort((a, b) => a.localeCompare(b, "zh-CN")), [modelData]);
  const defaultCompany = companies.includes("北京奔驰") ? "北京奔驰" : companies[0] || "";
  const [company, setCompany] = useState(defaultCompany);
  const companyRecords = useMemo(() => modelData.records.filter(record => record.company === company), [company, modelData]);
  const [selectedModels, setSelectedModels] = useState<string[]>(() => modelData.records.filter(record => record.company === defaultCompany).sort((a, b) => sum(b.values.slice(-6)) - sum(a.values.slice(-6))).slice(0, 8).map(modelRecordKey));
  const firstDataIndex = Math.max(modelData.periods.findIndex((_, index) => companyRecords.some(record => Math.abs(record.values[index] || 0) > 1e-12)), 0);
  const [startIndex, setStartIndex] = useState(firstDataIndex);
  const [endIndex, setEndIndex] = useState(modelData.periods.length - 1);
  useEffect(() => {
    setStartIndex(firstDataIndex);
    setEndIndex(modelData.periods.length - 1);
    setSelectedModels(companyRecords.slice().sort((a, b) => sum(b.values.slice(-6)) - sum(a.values.slice(-6))).slice(0, 8).map(modelRecordKey));
  }, [company, companyRecords, firstDataIndex, modelData.periods.length]);
  const periods = modelData.periods.slice(startIndex, endIndex + 1);
  const rows = companyRecords.slice().sort((a, b) => a.fuel.localeCompare(b.fuel, "zh-CN") || a.subtype.localeCompare(b.subtype, "zh-CN") || sum(b.values.slice(startIndex, endIndex + 1)) - sum(a.values.slice(startIndex, endIndex + 1)));
  const categoryCount = new Set(rows.map(record => `${record.fuel}-${record.subtype}`)).size;
  const modelCounts = rows.reduce((counts, record) => counts.set(record.model, (counts.get(record.model) || 0) + 1), new Map<string, number>());
  const modelOptions = rows.map(record => ({ key: modelRecordKey(record), label: record.model, detail: record.fuel === record.subtype ? record.fuel : `${record.fuel} · ${record.subtype}` }));
  const series = rows.filter(record => selectedModels.includes(modelRecordKey(record))).map((record, index) => ({ name: modelCounts.get(record.model)! > 1 ? `${record.model} · ${record.subtype}` : record.model, values: record.values.slice(startIndex, endIndex + 1), color: modelLineColor(index) }));
  return <article className="sales-panel company-model-history">
    <header><div><span>单车企车型历史</span><h2>{company} · {scope === "wholesale" ? "批发" : "零售"}车型销量趋势</h2></div><div className="company-model-controls"><label>车企<select aria-label={`选择${scope === "wholesale" ? "批发" : "零售"}车企`} value={company} onChange={event => setCompany(event.target.value)}>{companies.map(name => <option key={name} value={name}>{name}</option>)}</select></label><ModelPicker options={modelOptions} selected={selectedModels} onChange={setSelectedModels} /><label>起始<select aria-label={`${company}车型趋势起始时间`} value={startIndex} onChange={event => { const next = Number(event.target.value); setStartIndex(next); if (next > endIndex) setEndIndex(next); }}>{modelData.periods.map((period, index) => <option key={`${scope}-model-start-${period}`} value={index}>{period}</option>)}</select></label><label>结束<select aria-label={`${company}车型趋势结束时间`} value={endIndex} onChange={event => { const next = Number(event.target.value); setEndIndex(next); if (next < startIndex) setStartIndex(next); }}>{modelData.periods.map((period, index) => <option key={`${scope}-model-end-${period}`} value={index}>{period}</option>)}</select></label></div></header>
    <div className="company-model-summary"><span>已选 <b>{series.length}</b> / {rows.length} 款车型</span><span><b>{categoryCount}</b> 个动力类别</span><span>{periods[0]} 至 {periods[periods.length - 1]}</span></div>
    <div className="company-model-line-chart"><LineChart periods={periods} series={series} vehicles modelStyle /></div>
  </article>;
}

function ModelCoreSpotlight({ scope }: { scope: Scope }) {
  const modelData = data.models[scope];
  const companies = useMemo(() => aggregateCompanies(modelData), [modelData]);
  const latestIndex = modelData.periods.length - 1;
  const [rankingIndex, setRankingIndex] = useState(latestIndex);
  const [trendStart, setTrendStart] = useState(0);
  const [trendEnd, setTrendEnd] = useState(latestIndex);
  const latestRanking = companies.slice().sort((a, b) => b.values[rankingIndex] - a.values[rankingIndex]);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    setRankingIndex(latestIndex);
    setTrendStart(0);
    setTrendEnd(latestIndex);
    setSelected(companies.slice().sort((a, b) => b.values[latestIndex] - a.values[latestIndex]).slice(0, 6).map(item => item.name));
  }, [scope, latestIndex]);
  const selectedSeries = companies.filter(item => selected.includes(item.name));
  const trendPeriods = modelData.periods.slice(trendStart, trendEnd + 1);
  return <section className="core-model-section">
    <div className="core-model-toolbar"><CompanyPicker companies={companies.map(item => item.name)} selected={selected} onChange={setSelected} /></div>
    <div className="core-model-grid">
      <article className="sales-panel"><header><div><span>时间点横向对比</span><h2>{modelData.periods[rankingIndex]} 车企销量排名</h2></div><label className="core-single-period">时间<select value={rankingIndex} onChange={event => setRankingIndex(Number(event.target.value))}>{modelData.periods.map((period, index) => <option key={period} value={index}>{period}</option>)}</select></label></header><SnapshotBars percent={false} rows={latestRanking.slice(0, 15).map(item => ({ name: item.name, value: item.values[rankingIndex] }))} /></article>
      <article className="sales-panel"><header><div><span>多车企历史趋势</span><h2>{scope === "wholesale" ? "批发" : "零售"}销量同图</h2></div><div className="core-model-range"><label>起始<select value={trendStart} onChange={event => { const next = Number(event.target.value); setTrendStart(next); if (next > trendEnd) setTrendEnd(next); }}>{modelData.periods.map((period, index) => <option key={`model-start-${period}`} value={index}>{period}</option>)}</select></label><label>结束<select value={trendEnd} onChange={event => { const next = Number(event.target.value); setTrendEnd(next); if (next < trendStart) setTrendStart(next); }}>{modelData.periods.map((period, index) => <option key={`model-end-${period}`} value={index}>{period}</option>)}</select></label></div></header><LineChart periods={trendPeriods} series={selectedSeries.map((item, index) => ({ name: item.name, values: item.values.slice(trendStart, trendEnd + 1), color: palette[index % palette.length] }))} modelStyle /></article>
    </div>
    <CompanyModelHistory modelData={modelData} scope={scope} />
  </section>;
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

type AnalysisRow = { id: string; name: string; values: number[] };
type MetricKind = "销量/规模" | "同比" | "环比" | "占比/渗透率";

function rowMetric(label: string): MetricKind {
  if (label.includes("占比") || label.includes("渗透率")) return "占比/渗透率";
  if (label.includes("同比")) return "同比";
  if (label.includes("环比")) return "环比";
  return "销量/规模";
}

function analysisName(label: string, sectionTitle: string) {
  let name = label.replace(/\s*\/\s*(当月同比|单月环比|累计同比|同比|环比|占比|渗透率|纯电动占比)$/u, "").replace(/-(占比)$/u, "");
  if (["车企批发表现", "纯电动分品牌", "插混分品牌"].includes(sectionTitle)) name = name.split(" / ")[0];
  return name;
}

function formatAnalysisValue(value: number, percent: boolean) {
  return percent
    ? `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`
    : value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

function SnapshotBars({ rows, percent }: { rows: { name: string; value: number }[]; percent: boolean }) {
  const ranked = rows.filter(row => row.value !== 0).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 15).sort((a, b) => b.value - a.value);
  const max = Math.max(...ranked.map(row => Math.abs(row.value)), 1);
  if (!ranked.length) return <div className="analysis-empty">该月份暂无可比较数据</div>;
  return <div className="snapshot-bars">{ranked.map((row, index) => <div key={`${row.name}-${index}`}><span title={row.name}>{row.name}</span><i><b className={row.value < 0 ? "negative" : ""} style={{ width: `${Math.abs(row.value) / max * 100}%` }} /></i><strong>{formatAnalysisValue(row.value, percent)}</strong></div>)}</div>;
}

function DualAnalysis({ title, periods, rows, metricLabel, percent = false, resetKey }: { title: string; periods: string[]; rows: AnalysisRow[]; metricLabel: string; percent?: boolean; resetKey: string }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [periodIndex, setPeriodIndex] = useState(Math.max(periods.length - 1, 0));
  const [windowSize, setWindowSize] = useState<12 | 24 | 0>(24);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const latest = Math.max(periods.length - 1, 0);
    const defaults = rows.slice().sort((a, b) => Math.abs(b.values[latest] || 0) - Math.abs(a.values[latest] || 0)).slice(0, 6).map(row => row.id);
    setSelectedIds(defaults);
    setPeriodIndex(latest);
    setQuery("");
  }, [resetKey]);
  const toggle = (id: string) => selectedIds.includes(id) ? setSelectedIds(selectedIds.filter(item => item !== id)) : selectedIds.length < 8 && setSelectedIds([...selectedIds, id]);
  const filtered = rows.filter(row => row.name.toLowerCase().includes(query.toLowerCase()));
  const selectedRows = rows.filter(row => selectedIds.includes(row.id));
  const start = windowSize ? Math.max(0, periods.length - windowSize) : 0;
  return <section className="dual-analysis">
    <aside className="analysis-controls"><header><span>分析对象</span><strong>{title}</strong><small>趋势图最多同时选择 8 项</small></header><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索企业、品牌或数据项" /><div className="analysis-options">{filtered.map(row => <label key={row.id}><input type="checkbox" checked={selectedIds.includes(row.id)} disabled={!selectedIds.includes(row.id) && selectedIds.length >= 8} onChange={() => toggle(row.id)} /><span>{row.name}</span></label>)}</div></aside>
    <article className="sales-panel snapshot-panel"><header><div><span>时间点横向对比</span><h2>{periods[periodIndex]} · 已选 {selectedRows.length} 项</h2></div><select value={periodIndex} onChange={event => setPeriodIndex(Number(event.target.value))}>{periods.map((period, index) => <option key={period} value={index}>{period}</option>)}</select></header><SnapshotBars percent={percent} rows={selectedRows.map(row => ({ name: row.name, value: row.values[periodIndex] || 0 }))} /><p className="analysis-note">左侧选择的对象同时作用于横向对比图和趋势图；当前指标：{metricLabel}。</p></article>
    <article className="sales-panel multi-trend-panel"><header><div><span>多对象时间趋势</span><h2>{selectedRows.length} 项同图 · {metricLabel}</h2></div><div className="range-switch"><button className={windowSize === 12 ? "active" : ""} onClick={() => setWindowSize(12)}>近12月</button><button className={windowSize === 24 ? "active" : ""} onClick={() => setWindowSize(24)}>近24月</button><button className={windowSize === 0 ? "active" : ""} onClick={() => setWindowSize(0)}>全部</button></div></header><LineChart periods={periods.slice(start)} percent={percent} series={selectedRows.map((row, index) => ({ name: row.name, values: row.values.slice(start), color: palette[index % palette.length] }))} /></article>
  </section>;
}

function SectionAnalysis({ section }: { section: SourceTable }) {
  const metrics = ["销量/规模", "同比", "环比", "占比/渗透率"].filter(metric => section.rows.some(row => rowMetric(row.label) === metric)) as MetricKind[];
  const [metric, setMetric] = useState<MetricKind>(metrics[0] || "销量/规模");
  useEffect(() => { setMetric(metrics[0] || "销量/规模"); }, [section.title]);
  const rows = section.rows.filter(row => rowMetric(row.label) === metric).map(row => ({ id: String(row.row), name: analysisName(row.label, section.title), values: row.values }));
  return <><div className="metric-toolbar"><div><span>当前分表</span><strong>{section.title}</strong><small>{rows.length} 个可比较对象</small></div><label>分析指标<select value={metric} onChange={event => setMetric(event.target.value as MetricKind)}>{metrics.map(item => <option key={item}>{item}</option>)}</select></label><p>每个分表均提供同一月份的横向对比，以及多个对象的历史趋势同图。</p></div><DualAnalysis title={section.title} periods={section.periods} rows={rows} metricLabel={metric} percent={metric !== "销量/规模"} resetKey={`${section.title}-${metric}`} /></>;
}

function aggregateModelRows(modelData: ModelData, dimension: "company" | "model" | "fuel" | "subtype") {
  const map = new Map<string, number[]>();
  modelData.records.forEach(record => {
    const key = record[dimension] || "未分类";
    const values = map.get(key) || Array(modelData.periods.length).fill(0);
    record.values.forEach((value, index) => { values[index] += value; });
    map.set(key, values);
  });
  return [...map.entries()].map(([name, values]) => ({ id: name, name, values }));
}

function ModelSourceAnalysis({ modelData, scope }: { modelData: ModelData; scope: Scope }) {
  const [dimension, setDimension] = useState<"company" | "model" | "fuel" | "subtype">("company");
  useEffect(() => { setDimension("company"); }, [scope]);
  const labels = { company: "企业", model: "车型", fuel: "燃料类型", subtype: "新能源细分" };
  const rows = aggregateModelRows(modelData, dimension);
  return <><div className="metric-toolbar"><div><span>当前分表</span><strong>分车型【{scope === "wholesale" ? "批发" : "零售"}】</strong><small>{modelData.records.length} 条车型明细</small></div><label>分析层级<select value={dimension} onChange={event => setDimension(event.target.value as typeof dimension)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><p>可按企业、车型、动力类型或新能源细分汇总，并生成横向和纵向两类图表。</p></div><DualAnalysis title={labels[dimension]} periods={modelData.periods} rows={rows} metricLabel="销量" resetKey={`${scope}-${dimension}`} /></>;
}

function RawDataView({ scope, source }: { scope: Scope; source: "industry" | "models" }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [tableWindow, setTableWindow] = useState<12 | 24 | 0>(12);
  const [page, setPage] = useState(0);
  const sections = data.tables[scope];
  const section = sections[Math.min(sectionIndex, sections.length - 1)];
  const start = tableWindow ? Math.max(0, section.periods.length - tableWindow) : 0;
  const visibleRows = section.rows.filter(row => row.label.toLowerCase().includes(query.toLowerCase()));
  const modelData = data.models[scope];
  const modelRows = modelData.records.filter(record => `${record.company} ${record.fuel} ${record.subtype} ${record.model}`.toLowerCase().includes(query.toLowerCase()));
  const pageSize = 60;
  const pageCount = Math.max(1, Math.ceil(modelRows.length / pageSize));
  useEffect(() => { setSectionIndex(0); setPage(0); }, [scope]);
  useEffect(() => { setPage(0); }, [query, source, sectionIndex]);
  return <>
    <section className="source-toolbar"><div className="source-title"><span>CURRENT SHEET</span><strong>{source === "industry" ? "乘联会" : "分车型"}【{scope === "wholesale" ? "批发" : "零售"}】</strong></div><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索数据项、企业或车型" /><span>{source === "industry" ? `${sections.length} 个数据分表 · ${section.rows.length} 行` : `${modelData.records.length} 条车型记录`}</span></section>
    {source === "industry" ? <section className="raw-layout"><aside className="raw-section-list"><header><span>SHEET TABLES</span><strong>数据分表</strong></header>{sections.map((item, index) => <button key={item.title} className={index === sectionIndex ? "active" : ""} onClick={() => setSectionIndex(index)}><i>{String(index + 1).padStart(2, "0")}</i><span>{item.title}</span><b>{item.rows.length}</b></button>)}</aside><div className="raw-content"><SectionAnalysis key={`${scope}-${section.title}`} section={section} /><article className="sales-panel raw-table-panel"><header><div><span>完整分表</span><h2>{section.title}</h2></div><div className="range-switch"><button className={tableWindow === 12 ? "active" : ""} onClick={() => setTableWindow(12)}>近12月</button><button className={tableWindow === 24 ? "active" : ""} onClick={() => setTableWindow(24)}>近24月</button><button className={tableWindow === 0 ? "active" : ""} onClick={() => setTableWindow(0)}>全部</button></div></header><div className="raw-table-wrap"><table><thead><tr><th>原表行</th><th>数据项</th>{section.periods.slice(start).map(period => <th key={period}>{formatPeriod(period)}</th>)}</tr></thead><tbody>{visibleRows.map(row => <tr key={row.row}><td>{row.row}</td><td>{row.label}</td>{row.values.slice(start).map((value, valueIndex) => <td key={valueIndex}>{value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}</td>)}</tr>)}</tbody></table></div></article></div></section> : <><ModelSourceAnalysis modelData={modelData} scope={scope} /><section className="sales-panel full-model-table"><header><div><span>完整车型明细</span><h2>企业 × 动力类型 × 车型 × 月度销量</h2></div><small>第 {Math.min(page + 1, pageCount)} / {pageCount} 页 · 共 {modelRows.length} 条</small></header><div className="raw-table-wrap"><table><thead><tr><th>企业</th><th>燃料类型</th><th>新能源细分</th><th>标准车型</th>{modelData.periods.map(period => <th key={period}>{formatPeriod(period)}</th>)}</tr></thead><tbody>{modelRows.slice(page * pageSize, page * pageSize + pageSize).map((record, index) => <tr key={`${record.company}-${record.model}-${index}`}><td>{record.company}</td><td>{record.fuel}</td><td>{record.subtype}</td><td>{record.model}</td>{record.values.map((value, valueIndex) => <td key={valueIndex}>{value.toLocaleString("zh-CN")}</td>)}</tr>)}</tbody></table></div><div className="pager"><button disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>上一页</button><span>{page + 1} / {pageCount}</span><button disabled={page >= pageCount - 1} onClick={() => setPage(Math.min(pageCount - 1, page + 1))}>下一页</button></div></section></>}
  </>;
}

export default function SalesPage() {
  const boards: { key: SheetKey; scope: Scope; source: "industry" | "models"; name: string; detail: string }[] = [
    { key: "wholesale-industry", scope: "wholesale", source: "industry", name: "乘联会【批发】", detail: "11张长图核心图表" },
    { key: "wholesale-models", scope: "wholesale", source: "models", name: "分车型【批发】", detail: "车型趋势 · 企业对比" },
    { key: "retail-industry", scope: "retail", source: "industry", name: "乘联会【零售】", detail: "6张月度与累计核心图表" },
    { key: "retail-models", scope: "retail", source: "models", name: "分车型【零售】", detail: "企业横向 · 历史趋势" },
  ];
  const [sheetKey, setSheetKey] = useState<SheetKey>("wholesale-industry");
  const board = boards.find(item => item.key === sheetKey) || boards[0];
  return <main className="sales-shell"><aside className="sales-sidebar"><a className="sales-brand" href="/" aria-label="返回东吴电新数据库首页"><img src="/soochow-securities.png" width="218" height="48" alt="东吴证券 Soochow Securities" /></a><p>工作表导航</p><nav>{boards.map((item, index) => <button key={item.key} className={sheetKey === item.key ? "active" : ""} onClick={() => setSheetKey(item.key)}><i>{String(index + 1).padStart(2, "0")}</i><span><b>{item.name}</b><small>{item.detail}</small></span></button>)}</nav><div className="sales-current"><span>CURRENT DATABASE</span><b>国内电动车销量</b><small>4 CORE SHEETS</small></div><a className="back-home" href="/">← 返回数据库总库</a></aside><section className="sales-workspace"><header className="sales-topbar"><div><p>DONGWU NEW ENERGY · VEHICLE SALES</p><h1>{board.name}</h1><span>仅展示销量长图核心内容</span></div><div className="sales-update"><small>长图更新至</small><strong>2026-07</strong><span>来源：乘联会 / 中汽协</span></div></header><div className="mobile-view-switch sheet-switch">{boards.map(item => <button key={item.key} className={sheetKey === item.key ? "active" : ""} onClick={() => setSheetKey(item.key)}>{item.name}</button>)}</div><CoreChartGallery boardKey={sheetKey} />{board.source === "models" && <ModelCoreSpotlight key={`core-${sheetKey}`} scope={board.scope} />}<footer>数据来源：乘联会、中汽协、第一商用车，东吴证券研究所 · 长图口径更新至 2026-07</footer></section></main>;
}
