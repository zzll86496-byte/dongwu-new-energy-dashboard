"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import rawData from "./data/lithium-production.json";
import { exportChartWorkbook, type ChartWorkbookSpec } from "./excel-export";
import { ResearchPageHeader } from "./ResearchPageHeader";
import { sitePath } from "./site-path";
import "./planning.css";

type Value = { period: string; raw: string; value: number | null; mom: number | null };
type Company = { name: string; values: Value[] };
type Category = { key: string; name: string; unit: string; color: string; companies: Company[]; totals: Value[] };
type DataSet = { meta: { title: string; latestPeriod: string; source: string; disclaimer: string }; periods: string[]; categories: Category[] };
type BarFocus = { chart: "trend" | "mom" | "company"; period: string };

const data = rawData as DataSet;
const periods = data.periods.slice(-12);
const rawPeriods = [...periods].reverse();
const palette = ["#12355e", "#a99b5a", "#8c8c8e", "#6f7d8c", "#ed7d31", "#c9c9c9", "#173e69", "#a99b5a"];
const T = {
  brand: "\u4e1c\u5434\u7535\u65b0", title: "\u9502\u7535\u4ea7\u4e1a\u94fe\u6392\u4ea7\u6570\u636e\u5e93", month: "\u5206\u6790\u6708\u4efd", segment: "\u4ea7\u4e1a\u73af\u8282", raw: "\u539f\u59cb\u6570\u636e", company: "\u4f01\u4e1a", search: "\u641c\u7d22\u4f01\u4e1a", clear: "\u6e05\u9664", trend: "\u603b\u91cf\u8d8b\u52bf", line: "\u4f01\u4e1a\u6a2a\u5411\u5bf9\u6bd4", vertical: "\u516c\u53f8\u7eb5\u5411\u6570\u636e", value: "\u4ea7\u91cf", mom: "\u73af\u6bd4", structure: "\u4f01\u4e1a\u7ed3\u6784", observe: "\u73af\u6bd4\u89c2\u5bdf", selected: "\u5f53\u524d\u4f01\u4e1a", update: "\u6700\u540e\u66f4\u65b0", interaction: "\u4ea4\u4e92\u65b9\u5f0f", interactionDesc: "\u70b9\u51fb\u4f01\u4e1a\u884c\u3001\u6298\u7ebf\u6216\u56fe\u4f8b\uff0c\u53ef\u8054\u52a8\u516c\u53f8\u7eb5\u5411\u67f1\u72b6\u56fe\u3002"
};

const periodLabel = (period: string) => period.replace("-", ".");
const compactPeriodLabel = (period: string) => `${period.slice(2, 4)}.${period.slice(5)}`;
const monthLabel = (period: string) => `${Number(period.slice(5))}\u6708`;
const fmt = (value: number | null | undefined, digits = 1) => value == null || !Number.isFinite(value) ? "\u2014" : value.toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const signed = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "\u2014" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
const valueAt = (company: Company, period: string) => company.values.find((value) => value.period === period);
const componentValue = (raw: string | undefined, component: string) => {
  const match = raw?.match(new RegExp(`(\\d+(?:\\.\\d+)?)${component}`));
  return match ? Number(match[1]) : null;
};
const aggregateComponentMom = (companies: Company[], period: string, component: string) => {
  const index = data.periods.indexOf(period);
  if (index <= 0) return null;
  const current = companies.reduce((sum, company) => sum + (componentValue(valueAt(company, period)?.raw, component) ?? 0), 0);
  const previousPeriod = data.periods[index - 1];
  const previous = companies.reduce((sum, company) => sum + (componentValue(valueAt(company, previousPeriod)?.raw, component) ?? 0), 0);
  return previous > 0 ? current / previous - 1 : null;
};
const companyMomAt = (company: Company, period: string) => {
  const index = data.periods.indexOf(period);
  if (index <= 0) return null;
  const current = valueAt(company, period)?.value;
  const previous = valueAt(company, data.periods[index - 1])?.value;
  return current != null && previous != null && previous !== 0 ? current / previous - 1 : null;
};

function linePoint(value: number, max: number, index: number, count: number) {
  const x = 58 + (index * 660) / Math.max(count - 1, 1);
  const y = 220 - (value / Math.max(max, 1)) * 176;
  return { x, y };
}

function linePoints(company: Company, max: number, chartPeriods: string[]) {
  return chartPeriods.map((period, index) => { const point = linePoint(valueAt(company, period)?.value ?? 0, max, index, chartPeriods.length); return `${point.x.toFixed(1)},${point.y.toFixed(1)}`; }).join(" ");
}

function chartPeriodsBetween(start: string, end: string) {
  const startIndex = data.periods.indexOf(start);
  const endIndex = data.periods.indexOf(end);
  return data.periods.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
}

function chartDensity(count: number) {
  if (count > 16) return "density-dense";
  if (count > 12) return "density-compact";
  if (count > 8) return "density-standard";
  return "density-relaxed";
}

const chartHeadroom = (count: number) => count > 16 ? 1.16 : count > 12 ? 1.14 : 1.10;
const chartValueLabel = (value: number | null | undefined, _count: number) => fmt(value, 1);

function ChartRange({ label, start, end, onStart, onEnd }: { label: string; start: string; end: string; onStart: (value: string) => void; onEnd: (value: string) => void }) {
  return <div className="chart-range-inline"><select aria-label={`${label}起始月份`} value={start} onChange={(event) => onStart(event.target.value)}>{data.periods.map((item) => <option key={item} value={item}>{compactPeriodLabel(item)}</option>)}</select><i>—</i><select aria-label={`${label}结束月份`} value={end} onChange={(event) => onEnd(event.target.value)}>{data.periods.map((item) => <option key={item} value={item}>{compactPeriodLabel(item)}</option>)}</select></div>;
}

function ChartDataCard({ period, unit, rows, onClose }: { period: string; unit: string; rows: { label: string; value: string; color: string }[]; onClose: () => void }) {
  return <aside className="chart-data-card" role="dialog" aria-label={`${periodLabel(period)}详细数据`}><div className="chart-data-head"><strong>{periodLabel(period)}</strong><span>{unit}</span><button type="button" aria-label="关闭数据卡片" onClick={onClose}>×</button></div><div className="chart-data-rows">{rows.map((row) => <div key={row.label}><i style={{ background: row.color }} /><span>{row.label}</span><b>{row.value}</b></div>)}</div></aside>;
}

function ChartExportButton({ busy, onExport }: { busy: boolean; onExport: () => void }) {
  return <button type="button" className="chart-export-button" data-export-control aria-label="导出图表和原始数据到Excel" disabled={busy} onClick={onExport}>{busy ? "生成中" : "导出Excel"}</button>;
}

function ComponentMomGroup({ item, max, onSelect }: { item: { period: string; values: { name: string; value: number | null }[] }; max: number; onSelect: () => void }) {
  const label = `${periodLabel(item.period)} ${item.values.map((value) => `${value.name} ${signed(value.value)}`).join("，")}`;
  return <div className="component-mom-group" role="button" tabIndex={0} aria-label={label} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}><div className="component-mom-columns">{item.values.map((value, index) => <div className="component-mom-column" key={value.name}><i className={index === 0 ? "ternary" : "lfp"} style={{ height: `${Math.max((Math.abs(value.value ?? 0) / max) * 100, 3)}%` }} /></div>)}</div><small>{periodLabel(item.period)}</small></div>;
}

export function LithiumDashboard() {
  const trendCardRef = useRef<HTMLElement>(null);
  const lineCardRef = useRef<HTMLElement>(null);
  const companyCardRef = useRef<HTMLElement>(null);
  const compositionCardRef = useRef<HTMLElement>(null);
  const [categoryKey, setCategoryKey] = useState("battery");
  const [period, setPeriod] = useState(data.meta.latestPeriod);
  const [mode, setMode] = useState<"value" | "mom">("value");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [lineFocusPeriod, setLineFocusPeriod] = useState("");
  const [barFocus, setBarFocus] = useState<BarFocus | null>(null);
  const [exporting, setExporting] = useState("");
  const [trendStart, setTrendStart] = useState(periods[0]);
  const [trendEnd, setTrendEnd] = useState(periods.at(-1)!);
  const [lineStart, setLineStart] = useState(periods[0]);
  const [lineEnd, setLineEnd] = useState(periods.at(-1)!);
  const [companyStart, setCompanyStart] = useState(periods[0]);
  const [companyEnd, setCompanyEnd] = useState(periods.at(-1)!);
  const trendPeriods = chartPeriodsBetween(trendStart, trendEnd);
  const linePeriods = chartPeriodsBetween(lineStart, lineEnd);
  const companyPeriods = chartPeriodsBetween(companyStart, companyEnd);
  const category = data.categories.find((item) => item.key === categoryKey) ?? data.categories[0];
  const selectedTotal = category.totals.find((value) => value.period === period) ?? category.totals.at(-1)!;
  const rows = useMemo(() => category.companies, [category]);
  const selectedCompany = category.companies.find((company) => company.name === selectedCompanyName) ?? rows[0] ?? category.companies[0];
  const recentTotals = category.totals.filter((value) => trendPeriods.includes(value.period));
  const maxTotal = Math.max(...recentTotals.map((value) => value.value ?? 0), 1) * chartHeadroom(recentTotals.length);
  const companyMax = Math.max(...category.companies.flatMap((company) => company.values.filter((value) => linePeriods.includes(value.period)).map((value) => value.value ?? 0)), 1);
  const selectedPeriodValues = selectedCompany.values.filter((value) => companyPeriods.includes(value.period));
  const selectedMax = Math.max(...selectedPeriodValues.map((value) => value.value ?? 0), 1) * chartHeadroom(selectedPeriodValues.length);
  const allLatest = data.categories.map((item) => ({ ...item, latest: item.totals.find((value) => value.period === period) ?? item.totals.at(-1)! }));
  const headlineMetrics = allLatest;
  const composition = rows.map((company) => ({ name: company.name, value: valueAt(company, period)?.value ?? 0 })).sort((a, b) => b.value - a.value);
  const visibleComposition = composition.filter((item) => item.value > 0).slice(0, 6);
  const compositionTotal = visibleComposition.reduce((sum, item) => sum + item.value, 0) || 1;
  let compositionCursor = 0;
  const compositionGradient = visibleComposition.length ? `conic-gradient(${visibleComposition.map((item, index) => { const start = compositionCursor; compositionCursor += item.value / compositionTotal * 100; return `${palette[index % palette.length]} ${start.toFixed(3)}% ${compositionCursor.toFixed(3)}%`; }).join(",")})` : "conic-gradient(#e3e6e8 0 100%)";
  const compositionStyle = { "--donut-gradient": compositionGradient } as CSSProperties;
  const cathodeMomSeries = trendPeriods.map((item) => ({ period: item, values: [{ name: "\u4e09\u5143", value: aggregateComponentMom(category.companies, item, "\u4e09\u5143") }, { name: "\u94c1\u9502", value: aggregateComponentMom(category.companies, item, "\u94c1\u9502") }] }));
  const cathodeMomMax = Math.max(...cathodeMomSeries.flatMap((item) => item.values.map((value) => Math.abs(value.value ?? 0))), .01);
  const focusedMomValue = barFocus?.chart === "mom" ? cathodeMomSeries.find((item) => item.period === barFocus.period) : undefined;
  const seriesPalette = category.companies.length <= 2 ? ["#173e69", "#a99b5a"] : palette;
  const selectCompany = (name: string, nextPeriod?: string) => { setSelectedCompanyName(name); if (nextPeriod) setPeriod(nextPeriod); };

  const runExport = async (key: string, element: HTMLElement | null, spec: Omit<ChartWorkbookSpec, "element">) => {
    if (!element || exporting) return;
    setExporting(key);
    try { await exportChartWorkbook({ ...spec, element }); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Excel导出失败，请重试"); }
    finally { setExporting(""); }
  };

  const exportTrend = () => categoryKey === "cathode" && mode === "mom"
    ? runExport("trend", trendCardRef.current, {
      title: "正极材料环比趋势", unit: "环比",
      chart: { type: "bar", categories: cathodeMomSeries.map((item) => compactPeriodLabel(item.period)), series: [{ name: "三元", color: "#12355e", values: cathodeMomSeries.map((item) => item.values[0]?.value) }, { name: "铁锂", color: "#a99b5a", values: cathodeMomSeries.map((item) => item.values[1]?.value) }], percent: true },
      headers: ["月份", "三元环比", "铁锂环比"], rows: cathodeMomSeries.map((item) => [item.period, item.values[0]?.value, item.values[1]?.value]), percentColumns: [1, 2], fileName: `正极材料环比趋势_${trendStart}_${trendEnd}`
    })
    : runExport("trend", trendCardRef.current, {
      title: `${category.name}总量趋势`, unit: mode === "value" ? category.unit : "环比",
      chart: { type: "bar", categories: recentTotals.map((item) => compactPeriodLabel(item.period)), series: [{ name: mode === "value" ? "数值" : "环比", color: "#12355e", values: recentTotals.map((item) => mode === "value" ? item.value : item.mom) }], percent: mode === "mom" },
      headers: ["月份", mode === "value" ? "数值" : "环比", "原始数据", "环比原值"], rows: recentTotals.map((item) => [item.period, mode === "value" ? item.value : item.mom, item.raw, item.mom]), percentColumns: mode === "value" ? [3] : [1, 3], fileName: `${category.name}总量趋势_${trendStart}_${trendEnd}`
    });

  const exportLine = () => runExport("line", lineCardRef.current, {
    title: `${category.name}企业横向对比`, unit: category.unit,
    chart: { type: "line", categories: linePeriods.map(compactPeriodLabel), series: category.companies.map((company, index) => ({ name: company.name, color: seriesPalette[index % seriesPalette.length], values: linePeriods.map((item) => valueAt(company, item)?.value) })) },
    headers: ["月份", "企业", "数值", "原始数据"], rows: linePeriods.flatMap((item) => category.companies.map((company) => { const value = valueAt(company, item); return [item, company.name, value?.value, value?.raw]; })), fileName: `${category.name}企业横向对比_${lineStart}_${lineEnd}`
  });

  const exportCompany = () => runExport("company", companyCardRef.current, {
    title: `${selectedCompany.name}公司纵向数据`, unit: category.unit,
    chart: { type: "bar", categories: selectedPeriodValues.map((item) => compactPeriodLabel(item.period)), series: [{ name: selectedCompany.name, color: "#8c8c8e", values: selectedPeriodValues.map((item) => item.value) }] },
    headers: ["月份", "企业", "数值", "原始数据", "环比"], rows: selectedPeriodValues.map((item) => [item.period, selectedCompany.name, item.value, item.raw, companyMomAt(selectedCompany, item.period)]), percentColumns: [4], fileName: `${selectedCompany.name}纵向数据_${companyStart}_${companyEnd}`
  });

  const exportComposition = () => runExport("composition", compositionCardRef.current, {
    title: `${category.name}企业结构`, unit: category.unit,
    chart: { type: "donut", categories: visibleComposition.map((item) => item.name), series: [{ name: "企业结构", color: "#12355e", values: visibleComposition.map((item) => item.value) }] },
    headers: ["企业", "数值", "原始数据", "占比"], rows: visibleComposition.map((item) => { const source = valueAt(rows.find((company) => company.name === item.name)!, period); return [item.name, item.value, source?.raw, item.value / compositionTotal]; }), percentColumns: [3], fileName: `${category.name}企业结构_${period}`
  });

  return <main className="planning-shell">
    <div className="planning-layout">
      <aside className="planning-sidebar">
        <a className="sidebar-brand" href={sitePath("/")} aria-label="返回东吴电新数据库首页"><img src={sitePath("/soochow-securities.png")} width="218" height="48" alt="东吴证券 Soochow Securities" /></a>
        <div className="sidebar-rule" />
        <div className="sidebar-block"><label>{T.month}</label><select value={period} onChange={(event) => setPeriod(event.target.value)}>{data.periods.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="sidebar-block"><label>{T.segment}</label><div className="segment-buttons">{data.categories.map((item, index) => <button className={item.key === categoryKey ? "active" : ""} key={item.key} onClick={() => { setCategoryKey(item.key); setSelectedCompanyName(""); }}><i style={{ background: palette[index % palette.length] }} />{item.name}</button>)}</div></div>
        <div className="sidebar-block company-picker"><label>{T.company}</label><select className="company-select" value={selectedCompany.name} onChange={(event) => selectCompany(event.target.value)}>{category.companies.map((company) => <option key={company.name} value={company.name}>{company.name}</option>)}</select><div className="company-list">{category.companies.map((company, index) => <button className={selectedCompany.name === company.name ? "active" : ""} key={company.name} onClick={() => selectCompany(company.name)}><i style={{ background: seriesPalette[index % seriesPalette.length] }} /><span>{company.name}</span></button>)}</div></div>
        <div className="sidebar-block selected-summary"><label>{T.selected}</label><strong>{selectedCompany.name}</strong><span>{category.name} · {period}</span></div>
        <div className="sidebar-help"><b>{T.interaction}</b><p>{T.interactionDesc}</p></div>
        <div className="sidebar-foot">{T.update}：2026-08-05<br />{data.meta.source}</div>
      </aside>

      <section className="planning-main">
        <ResearchPageHeader
          title={T.title}
          context={`${category.name} · ${period} · ${category.unit}`}
          updated={data.meta.latestPeriod}
          controls={<div className="mode-switch" role="group" aria-label={`${T.value}或${T.mom}`}><button className={mode === "value" ? "active" : ""} onClick={() => setMode("value")}>{T.value}</button><button className={mode === "mom" ? "active" : ""} onClick={() => setMode("mom")}>{T.mom}</button></div>}
        />

        <section className="planning-kpis">{headlineMetrics.map((item) => <button className={`metric-card ${item.key === categoryKey ? "active" : ""}`} key={item.key} onClick={() => { setCategoryKey(item.key); setSelectedCompanyName(""); }}><span>{item.name}</span><div className="metric-value">{fmt(item.latest.value)}<small>{item.unit}</small></div><p>{T.mom} <b className={item.latest.mom != null && item.latest.mom < 0 ? "negative-text" : "positive-text"}>{signed(item.latest.mom)}</b></p></button>)}</section>

        <div className="planning-grid">
          <section ref={trendCardRef} className="dashboard-card trend-card"><div className="card-titlebar"><b>{categoryKey === "cathode" && mode === "mom" ? "\u6b63\u6781\u6750\u6599\u73af\u6bd4\u8d8b\u52bf" : `${category.name}${T.trend}`}</b><ChartRange label="总量趋势" start={trendStart} end={trendEnd} onStart={(next) => { setTrendStart(next); if (data.periods.indexOf(next) > data.periods.indexOf(trendEnd)) setTrendEnd(next); }} onEnd={(next) => { setTrendEnd(next); if (data.periods.indexOf(next) < data.periods.indexOf(trendStart)) setTrendStart(next); }} /></div><ChartExportButton busy={exporting === "trend"} onExport={exportTrend} />{categoryKey === "cathode" && mode === "mom" ? <div className="component-mom-chart"><div className="component-mom-legend"><span><i className="ternary" />{"\u4e09\u5143"}</span><span><i className="lfp" />{"\u94c1\u9502"}</span></div><div className="component-mom-plot">{cathodeMomSeries.map((item) => <ComponentMomGroup key={item.period} item={item} max={cathodeMomMax} onSelect={() => setBarFocus({ chart: "mom", period: item.period })} />)}</div>{focusedMomValue && <ChartDataCard period={focusedMomValue.period} unit="环比" rows={focusedMomValue.values.map((value, index) => ({ label: value.name, value: signed(value.value), color: index === 0 ? "#12355e" : "#a99b5a" }))} onClose={() => setBarFocus(null)} />}</div> : <div className="bar-chart-wrap"><div className="bar-axis"><span>{mode === "value" ? fmt(maxTotal, 0) : T.mom}</span><span>{mode === "value" ? fmt(maxTotal / 2, 0) : ""}</span><span>0</span></div><div className={`bar-chart-area ${chartDensity(recentTotals.length)}`}>{recentTotals.map((item) => { const height = mode === "value" ? ((item.value ?? 0) / maxTotal) * 100 : Math.min(Math.abs(item.mom ?? 0) * 260, 100); return <div className="bar-item" key={item.period}><span>{mode === "value" ? chartValueLabel(item.value, recentTotals.length) : signed(item.mom)}</span><i className={item.mom != null && item.mom < 0 ? "negative-bar" : "positive-bar"} style={{ height: `${Math.max(height, 3)}%` }} /><small title={periodLabel(item.period)}>{compactPeriodLabel(item.period)}</small></div>; })}</div></div>}</section>

          <section ref={lineCardRef} className="dashboard-card line-card"><div className="card-titlebar"><b>{category.name}{T.line}</b><ChartRange label="企业横向对比" start={lineStart} end={lineEnd} onStart={(next) => { setLineStart(next); if (data.periods.indexOf(next) > data.periods.indexOf(lineEnd)) setLineEnd(next); }} onEnd={(next) => { setLineEnd(next); if (data.periods.indexOf(next) < data.periods.indexOf(lineStart)) setLineStart(next); }} /></div><ChartExportButton busy={exporting === "line"} onExport={exportLine} /><div className="line-legend">{category.companies.map((company, index) => <button className={selectedCompany.name === company.name ? "active" : ""} key={company.name} onClick={() => selectCompany(company.name)}><i style={{ background: seriesPalette[index % seriesPalette.length] }} />{company.name}</button>)}</div><div className="line-chart"><svg viewBox="0 0 760 270" role="img" aria-label={`${category.name}${T.line}`}>{[0, 1, 2, 3, 4].map((step) => { const y = 220 - step * 44; return <g key={step}><line x1="58" y1={y} x2="718" y2={y} /><text x="47" y={y + 4} textAnchor="end">{fmt((companyMax * step) / 4, 0)}</text></g>; })}<line className="axis" x1="58" y1="220" x2="718" y2="220" /><line className="axis" x1="58" y1="44" x2="58" y2="220" />{category.companies.map((company, index) => <g key={company.name} className="line-series" onClick={() => selectCompany(company.name)}><polyline points={linePoints(company, companyMax, linePeriods)} fill="none" stroke={seriesPalette[index % seriesPalette.length]} strokeWidth={selectedCompany.name === company.name ? 3.8 : 2.2} opacity={selectedCompany.name === company.name ? 1 : .86} />{linePeriods.map((item, pointIndex) => { const point = linePoint(valueAt(company, item)?.value ?? 0, companyMax, pointIndex, linePeriods.length); return <circle key={item} cx={point.x} cy={point.y} r={selectedCompany.name === company.name ? 4 : 3} fill={seriesPalette[index % seriesPalette.length]} onClick={(event) => { event.stopPropagation(); setLineFocusPeriod(item); }}><title>{`${company.name} ${periodLabel(item)}: ${valueAt(company, item)?.raw || "\u2014"}`}</title></circle>; })}</g>)}{linePeriods.map((item, index) => { const point = linePoint(0, companyMax, index, linePeriods.length); return <text key={item} x={point.x} y="244" textAnchor="middle">{periodLabel(item)}</text>; })}</svg></div>{lineFocusPeriod && <div className="line-tooltip" role="status"><div className="line-tooltip-head"><strong>{periodLabel(lineFocusPeriod)}</strong><span>{category.unit}</span><button aria-label="关闭同期数据" onClick={() => setLineFocusPeriod("")}>×</button></div><div className="line-tooltip-list">{category.companies.map((company, index) => <div key={company.name}><i style={{ background: seriesPalette[index % seriesPalette.length] }} /><span>{company.name}</span><b>{fmt(valueAt(company, lineFocusPeriod)?.value)}</b></div>)}</div></div>}</section>

          <section ref={companyCardRef} className="dashboard-card company-card"><div className="card-titlebar"><b>{selectedCompany.name}{T.vertical}</b><ChartRange label="公司纵向数据" start={companyStart} end={companyEnd} onStart={(next) => { setCompanyStart(next); if (data.periods.indexOf(next) > data.periods.indexOf(companyEnd)) setCompanyEnd(next); }} onEnd={(next) => { setCompanyEnd(next); if (data.periods.indexOf(next) < data.periods.indexOf(companyStart)) setCompanyStart(next); }} /></div><ChartExportButton busy={exporting === "company"} onExport={exportCompany} /><div className="company-chart"><div className="company-axis"><span>{fmt(selectedMax, 0)}</span><span>{fmt(selectedMax / 2, 0)}</span><span>0</span></div><div className="company-plot"><div className={`company-bars ${chartDensity(selectedPeriodValues.length)}`}>{selectedPeriodValues.map((value) => <div className="company-bar" key={value.period}><span title={value.raw || fmt(value.value)}>{chartValueLabel(value.value, selectedPeriodValues.length)}</span><i style={{ height: `${Math.max(((value.value ?? 0) / selectedMax) * 100, 3)}%` }} /></div>)}</div><div className={`company-x-axis ${chartDensity(selectedPeriodValues.length)}`}>{selectedPeriodValues.map((value) => <small key={value.period}>{monthLabel(value.period)}</small>)}</div></div></div></section>

          <section ref={compositionCardRef} className="dashboard-card composition-card"><div className="card-titlebar"><b>{T.structure}</b><span>{period}</span></div><ChartExportButton busy={exporting === "composition"} onExport={exportComposition} /><div className="composition-body"><div className="donut" style={compositionStyle}><div><strong>{fmt(selectedTotal.value)}</strong><small>{category.unit}</small></div></div><div className="composition-list">{visibleComposition.map((item, index) => <div key={item.name}><i style={{ background: palette[index] }} /><span>{item.name}</span><b>{fmt(item.value)}</b></div>)}</div></div></section>

          <section className="dashboard-card raw-card"><div className="card-titlebar"><b>{T.raw}</b><span>{category.name} · {period}</span></div><div className="raw-table-wrap"><table className="raw-table"><thead><tr><th>{T.company}</th>{rawPeriods.map((item) => <th key={item}>{periodLabel(item)}</th>)}</tr></thead><tbody>{rows.map((company) => <tr className={selectedCompany.name === company.name ? "selected" : ""} key={company.name} onClick={() => selectCompany(company.name)}><th>{company.name}</th>{rawPeriods.map((item) => { const value = valueAt(company, item); return <td key={item} title={value?.raw} onClick={(event) => { event.stopPropagation(); selectCompany(company.name, item); }}>{mode === "value" ? value?.raw || "\u2014" : signed(companyMomAt(company, item))}</td>; })}</tr>)}</tbody></table></div><div className="raw-note">\u70b9\u51fb\u4f01\u4e1a\u884c\u6216\u5355\u5143\u683c\u8054\u52a8\u56fe\u8868</div></section>
        </div>
        <footer className="planning-footer"><span>{data.meta.disclaimer}</span><span>{data.meta.source}</span></footer>
      </section>
    </div>
  </main>;
}
