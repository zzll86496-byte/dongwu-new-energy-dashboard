"use client";

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ResearchPageHeader } from "../ResearchPageHeader";
import { sitePath } from "../site-path";
import dataJson from "./global-sales-data.json";
import countryIndexJson from "./country-index.json";
import "../research-template.css";
import "./global-sales.css";

export const dynamic = "force-static";

type Point = [number, number];
type Series = { id: string; name: string; group?: string; kind?: string; points: Point[] };
type View = { key: string; title: string; sourceSheet: string; periods: string[]; series: Series[] };
type Module = { key: string; title: string; views: View[]; penetration?: { name: string; sourceSheet: string; periods: string[]; points: Point[] } };
type GlobalSalesData = { updated: string; source: string; forecastSource: string; modules: Module[] };
type CountryIndexEntry = { key: string; name: string; file: string; modelCount: number; companyCount: number; hasPenetration: boolean };
type CountryIndex = { updated: string; countries: CountryIndexEntry[] };
type CountryData = { country: string; periods: string[]; penetration: { name: string; points: Point[] }; views: View[] };

const data = dataJson as GlobalSalesData;
const countryIndex = countryIndexJson as CountryIndex;
const palette = ["#153e66", "#b09a58", "#2f7f88", "#c06d2c", "#728194", "#765d89", "#398067", "#a05252"];

function valuesOf(series: Series, length: number) {
  const values = Array<number>(length).fill(0);
  series.points.forEach(([index, value]) => { if (index < length) values[index] = value; });
  return values;
}

function score(series: Series, length: number) {
  return valuesOf(series, length).slice(-12).reduce((total, value) => total + value, 0);
}

function formatValue(value: number) {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function shortPeriod(value: string) {
  return `${value.slice(2, 4)}/${value.slice(5)}`;
}

function LineChart({ periods, rows, unit = "辆", valueFormatter = formatValue, autoScaleY = false }: { periods: string[]; rows: { name: string; values: number[]; color: string }[]; unit?: string; valueFormatter?: (value: number) => string; autoScaleY?: boolean }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 1120;
  const height = 430;
  const left = 72;
  const right = 24;
  const top = 24;
  const bottom = 52;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const allValues = rows.flatMap(row => row.values);
  const rawMax = allValues.length ? Math.max(...allValues) : 0;
  const rawMin = allValues.length ? Math.min(...allValues) : 0;
  const naturalSpread = Math.max(rawMax - rawMin, rawMax * .18, .01);
  const min = autoScaleY ? Math.max(0, rawMin - naturalSpread * .16) : 0;
  const max = autoScaleY ? rawMax + naturalSpread * .16 : Math.max(rawMax, 1) * 1.08;
  const domain = Math.max(max - min, .001);
  const x = (index: number) => left + index / Math.max(periods.length - 1, 1) * plotWidth;
  const y = (value: number) => top + (max - value) / domain * plotHeight;
  const labelEvery = Math.max(1, Math.ceil(periods.length / 8));
  const moveToPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = (event.clientX - rect.left) / rect.width * width;
    const next = Math.round((svgX - left) / plotWidth * Math.max(periods.length - 1, 1));
    setHoverIndex(Math.max(0, Math.min(periods.length - 1, next)));
  };
  const moveWithKeyboard = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setHoverIndex(current => Math.max(0, Math.min(periods.length - 1, (current ?? periods.length - 1) + (event.key === "ArrowRight" ? 1 : -1))));
  };

  if (!rows.length) return <div className="global-empty">从左侧选择至少一个分析对象</div>;
  return <div className="global-chart-wrap"><div className="global-chart-stage">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="全球电动车销量月度时间序列折线图；可悬浮或使用左右方向键查看每月全部数据" tabIndex={0} onPointerMove={moveToPointer} onPointerLeave={() => setHoverIndex(null)} onFocus={() => setHoverIndex(current => current ?? periods.length - 1)} onBlur={() => setHoverIndex(null)} onKeyDown={moveWithKeyboard}>
      {[0, 1, 2, 3, 4].map(tick => {
        const gridY = top + tick / 4 * plotHeight;
        const value = max - domain * tick / 4;
        return <g key={tick}><line className="global-gridline" x1={left} x2={width - right} y1={gridY} y2={gridY} /><text className="global-axis" x={left - 12} y={gridY + 5} textAnchor="end">{valueFormatter(value)}</text></g>;
      })}
      {rows.map(row => {
        const points = row.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
        return <g key={row.name}><polyline points={points} fill="none" stroke={row.color} strokeWidth="2.6" vectorEffect="non-scaling-stroke" />{row.values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r={index === row.values.length - 1 ? 4 : 2.3} fill={row.color}><title>{`${row.name} · ${periods[index]} · ${valueFormatter(value)}${unit}`}</title></circle>)}</g>;
      })}
      {hoverIndex !== null && <g aria-hidden="true"><line className="global-hover-line" x1={x(hoverIndex)} x2={x(hoverIndex)} y1={top} y2={top + plotHeight} />{rows.map(row => <circle key={row.name} className="global-hover-point" cx={x(hoverIndex)} cy={y(row.values[hoverIndex] || 0)} r="5" fill={row.color} />)}</g>}
      {periods.map((period, index) => index % labelEvery === 0 || index === periods.length - 1 ? <text className="global-x-label" key={period} x={x(index)} y={height - 16} textAnchor="middle">{shortPeriod(period)}</text> : null)}
      <rect className="global-hover-hitbox" x={left} y={top} width={plotWidth} height={plotHeight} />
    </svg>
    {hoverIndex !== null && <div className={`global-chart-tooltip ${hoverIndex > periods.length * .66 ? "align-right" : ""}`} style={{ left: `${x(hoverIndex) / width * 100}%` }}>
      <strong>{periods[hoverIndex]}</strong>
      {rows.map(row => <div key={row.name}><i style={{ background: row.color }} /><span>{row.name}</span><b>{valueFormatter(row.values[hoverIndex] || 0)}{unit}</b></div>)}
    </div>}
  </div></div>;
}

function pieArc(startAngle: number, endAngle: number, radius: number, center: number) {
  const point = (angle: number) => ({ x: center + radius * Math.cos(angle - Math.PI / 2), y: center + radius * Math.sin(angle - Math.PI / 2) });
  const start = point(startAngle);
  const end = point(endAngle);
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${endAngle - startAngle > Math.PI ? 1 : 0} 1 ${end.x} ${end.y} Z`;
}

function MonthlyPie({ rows, period }: { rows: { name: string; value: number; color: string }[]; period: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  let angle = 0;
  return <div className="global-pie-layout">
    <div className="global-pie-figure">
      <svg viewBox="0 0 360 360" role="img" aria-label={`${period}销量结构饼图`}>
        {rows.map(row => {
          const slice = total ? row.value / total * Math.PI * 2 : 0;
          const start = angle;
          angle += slice;
          return <path key={row.name} d={pieArc(start, angle, 128, 180)} fill={row.color} stroke="#fff" strokeWidth="2"><title>{`${row.name} · ${formatValue(row.value)}辆 · ${total ? (row.value / total * 100).toFixed(1) : 0}%`}</title></path>;
        })}
        <circle cx="180" cy="180" r="72" fill="#fff" />
        <text className="global-pie-period" x="180" y="164" textAnchor="middle">{period}</text>
        <text className="global-pie-total" x="180" y="194" textAnchor="middle">{formatValue(total)}</text>
        <text className="global-pie-unit" x="180" y="216" textAnchor="middle">辆</text>
      </svg>
    </div>
    <div className="global-pie-legend">{rows.map(row => <div key={row.name}><i style={{ background: row.color }} /><span title={row.name}>{row.name}</span><strong>{formatValue(row.value)}</strong><em>{total ? `${(row.value / total * 100).toFixed(1)}%` : "0.0%"}</em></div>)}</div>
  </div>;
}

function ForecastBarChart({ series, periods, title }: { series: Series[]; periods: string[]; title: string }) {
  const rows = series.map((item, index) => {
    const values = valuesOf(item, periods.length);
    return {
      name: item.name,
      firstHalf: values.slice(0, 6).reduce((sum, value) => sum + value, 0),
      secondHalf: values.slice(6).reduce((sum, value) => sum + value, 0),
      total: values.reduce((sum, value) => sum + value, 0),
      color: palette[index % palette.length],
    };
  });
  const width = 1080;
  const height = 390;
  const left = 78;
  const right = 24;
  const top = 36;
  const bottom = 66;
  const plotHeight = height - top - bottom;
  const max = Math.max(...rows.map(row => row.total), 1) * 1.12;
  const y = (value: number) => top + (max - value) / max * plotHeight;
  const groupWidth = (width - left - right) / rows.length;
  const barWidth = 54;
  const barGap = 14;
  const metrics = [
    { key: "firstHalf", label: "上半年", color: "#153e66" },
    { key: "secondHalf", label: "下半年", color: "#b09a58" },
    { key: "total", label: "全年", color: "#2f7f88" },
  ] as const;
  const inWan = (value: number) => (value / 10_000).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return <div className="global-forecast-chart">
    <div className="global-forecast-legend">{metrics.map(metric => <span key={metric.key}><i style={{ background: metric.color }} />{metric.label}</span>)}</div>
    <div className="global-forecast-figure"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}2026年销量预期柱状图`}>
      {[0, 1, 2, 3, 4].map(tick => {
        const value = max * (1 - tick / 4);
        const gridY = top + tick / 4 * plotHeight;
        return <g key={tick}><line className="global-gridline" x1={left} x2={width - right} y1={gridY} y2={gridY} /><text className="global-forecast-axis" x={left - 12} y={gridY + 5} textAnchor="end">{inWan(value)}</text></g>;
      })}
      {rows.map((row, rowIndex) => {
        const center = left + groupWidth * rowIndex + groupWidth / 2;
        const totalBarsWidth = metrics.length * barWidth + (metrics.length - 1) * barGap;
        return <g key={row.name}>
          {metrics.map((metric, metricIndex) => {
            const value = row[metric.key];
            const barX = center - totalBarsWidth / 2 + metricIndex * (barWidth + barGap);
            const barY = y(value);
            return <g key={metric.key}><rect x={barX} y={barY} width={barWidth} height={top + plotHeight - barY} rx="2" fill={metric.color}><title>{`${row.name} · ${metric.label} · ${inWan(value)}万辆`}</title></rect><text className="global-forecast-value" x={barX + barWidth / 2} y={barY - 9} textAnchor="middle">{inWan(value)}</text></g>;
          })}
          <text className="global-forecast-category" x={center} y={height - 24} textAnchor="middle">{row.name}</text>
        </g>;
      })}
    </svg></div>
    <p>注：纵轴及柱顶数字单位均为万辆；各情景值严格按源工作簿整理，上、下半年为月度数据加总。</p>
  </div>;
}

function CountryRankingTable({ series, periods, periodIndex, label }: { series: Series[]; periods: string[]; periodIndex: number; label: string }) {
  const rows = series.map(item => {
    const values = valuesOf(item, periods.length);
    const value = values[periodIndex] || 0;
    const previous = periodIndex > 0 ? values[periodIndex - 1] || 0 : 0;
    return { name: item.name, value, mom: previous ? value / previous - 1 : null };
  }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  if (!rows.length) return <div className="global-country-empty">该月暂无销量数据</div>;
  return <div className="global-country-table-wrap"><table className="global-country-table">
    <thead><tr><th>排名</th><th>{label}</th><th>{periods[periodIndex]}销量</th><th>环比</th><th>份额</th></tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row.name}><td>{String(index + 1).padStart(2, "0")}</td><th>{row.name}</th><td>{formatValue(row.value)}</td><td className={row.mom != null && row.mom < 0 ? "down" : "up"}>{row.mom == null ? "—" : `${row.mom >= 0 ? "+" : ""}${(row.mom * 100).toFixed(1)}%`}</td><td>{total ? `${(row.value / total * 100).toFixed(1)}%` : "—"}</td></tr>)}</tbody>
  </table></div>;
}

export default function GlobalSalesPage() {
  const [moduleKey, setModuleKey] = useState(data.modules[0].key);
  const module = data.modules.find(item => item.key === moduleKey) || data.modules[0];
  const [viewKey, setViewKey] = useState(data.modules[0].views[0].key);
  const [countryKey, setCountryKey] = useState(countryIndex.countries[0]?.key || "");
  const selectedCountry = countryIndex.countries.find(item => item.key === countryKey) || countryIndex.countries[0];
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countryError, setCountryError] = useState("");
  const activeViews = module.key === "countries" && countryData ? countryData.views : module.views;
  const view = activeViews.find(item => item.key === viewKey) || activeViews[0];
  const [kind, setKind] = useState("合计");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startIndex, setStartIndex] = useState(Math.max(0, view.periods.length - 60));
  const [endIndex, setEndIndex] = useState(Math.max(0, view.periods.length - 1));
  const [piePeriodIndex, setPiePeriodIndex] = useState(Math.max(0, view.periods.length - 1));
  const [penetrationStart, setPenetrationStart] = useState(Math.max(0, view.periods.length - 60));
  const [penetrationEnd, setPenetrationEnd] = useState(Math.max(0, view.periods.length - 1));

  useEffect(() => {
    if (moduleKey !== "countries" || !selectedCountry) return;
    const controller = new AbortController();
    setCountryLoading(true);
    setCountryError("");
    setCountryData(null);
    fetch(sitePath(`/global-country-data/${selectedCountry.file}`), { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<CountryData>;
      })
      .then(payload => setCountryData(payload))
      .catch(error => { if (!(error instanceof DOMException && error.name === "AbortError")) setCountryError("该国家数据暂时无法载入，请重试。"); })
      .finally(() => { if (!controller.signal.aborted) setCountryLoading(false); });
    return () => controller.abort();
  }, [moduleKey, selectedCountry?.file]);

  const availableSeries = useMemo(() => view.series.filter(series => module.key !== "region" || series.kind === kind), [view, module.key, kind]);
  useEffect(() => {
    const defaults = [...availableSeries].sort((a, b) => score(b, view.periods.length) - score(a, view.periods.length)).slice(0, 6).map(item => item.id);
    setSelectedIds(defaults);
    setStartIndex(Math.max(0, view.periods.length - 60));
    setEndIndex(Math.max(0, view.periods.length - 1));
    setPiePeriodIndex(Math.max(0, view.periods.length - 1));
  }, [module.key, view.key, kind, countryKey, countryData]);

  const chooseModule = (nextKey: string) => {
    const nextModule = data.modules.find(item => item.key === nextKey) || data.modules[0];
    setModuleKey(nextKey);
    setViewKey(nextModule.views[0].key);
    setKind("合计");
  };
  const toggleSeries = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 8 ? [...current, id] : current);
  const filteredSeries = availableSeries;
  const selected = availableSeries.filter(series => selectedIds.includes(series.id));
  const visiblePeriods = view.periods.slice(startIndex, endIndex + 1);
  const chartRows = selected.map((series, index) => ({ name: series.name, values: valuesOf(series, view.periods.length).slice(startIndex, endIndex + 1), color: palette[index % palette.length] }));
  const monthValues = [...availableSeries].filter(series => module.key !== "region" || !series.name.startsWith("全球"))
    .map(series => ({ name: series.name, value: valuesOf(series, view.periods.length)[piePeriodIndex] || 0 }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const visibleSlices = monthValues.slice(0, 7);
  const otherValue = monthValues.slice(7).reduce((total, item) => total + item.value, 0);
  const pieRows = [...visibleSlices, ...(otherValue > 0 ? [{ name: "其他", value: otherValue }] : [])].map((item, index) => ({ ...item, color: palette[index % palette.length] }));
  const countryName = module.key === "countries" ? selectedCountry?.name || "细分国家" : module.title;
  const activePenetration = module.key === "countries" && countryData ? { name: countryData.country, periods: countryData.periods, points: countryData.penetration.points } : module.penetration;
  const penetrationLastIndex = activePenetration?.points.length ? activePenetration.points[activePenetration.points.length - 1][0] : -1;
  useEffect(() => {
    if (penetrationLastIndex < 0) return;
    setPenetrationEnd(penetrationLastIndex);
    setPenetrationStart(Math.max(0, penetrationLastIndex - 59));
  }, [module.key, countryKey, countryData, penetrationLastIndex]);
  const penetrationEndIndex = Math.min(penetrationEnd, penetrationLastIndex);
  const penetrationStartIndex = Math.min(penetrationStart, penetrationEndIndex);
  const penetrationAvailablePeriods = activePenetration && penetrationLastIndex >= 0 ? activePenetration.periods.slice(0, penetrationLastIndex + 1) : [];
  const penetrationPeriods = activePenetration && penetrationEndIndex >= penetrationStartIndex ? activePenetration.periods.slice(penetrationStartIndex, penetrationEndIndex + 1) : [];
  const penetrationRows = activePenetration?.points.length && penetrationPeriods.length ? [{
    name: `${activePenetration.name}新能源车渗透率`,
    values: valuesOf({ id: "penetration", name: activePenetration.name, points: activePenetration.points }, activePenetration.periods.length).slice(penetrationStartIndex, penetrationEndIndex + 1),
    color: palette[2],
  }] : [];
  const penetrationName = activePenetration?.name || countryName;

  return <main className="global-shell">
    <aside className="global-sidebar">
      <a className="global-brand" href={sitePath("/")} aria-label="返回东吴电新数据库首页"><img src={sitePath("/soochow-securities.png")} width="218" height="48" alt="东吴证券 Soochow Securities" /></a>
      <p>工作表导航</p>
      <nav>{data.modules.map((item, index) => <button key={item.key} className={module.key === item.key ? "active" : ""} onClick={() => chooseModule(item.key)}><i>{String(index + 1).padStart(2, "0")}</i><span><b>{item.title}</b><small>{item.key === "forecast" ? "7个区域口径 · 3种情景" : item.key === "countries" ? `${countryIndex.countries.length}个国家 · 分车型 · 分车企` : item.views.map(viewItem => viewItem.title).join(" · ")}</small></span></button>)}</nav>
    </aside>

    <section className="global-workspace">
      <ResearchPageHeader title="全球电动车销量数据库" context={`${module.title} · ${module.key === "countries" ? `${countryName} · ` : ""}${view.title}`} updated={data.updated} />
      <div className="global-mobile-nav">{data.modules.map(item => <button key={item.key} className={module.key === item.key ? "active" : ""} onClick={() => chooseModule(item.key)}>{item.title}</button>)}</div>

      <section className="global-toolbar">
        <div><span>当前模块</span><strong>{module.title}</strong><small>源表：{view.sourceSheet}</small></div>
        {module.key === "countries" && <label className="global-view-select">选择国家<select aria-label="选择细分国家" value={countryKey} onChange={event => { setCountryKey(event.target.value); setCountryData(null); }}>{countryIndex.countries.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>}
        {module.views.length > 1 && module.key !== "forecast" && <div className="global-segmented" aria-label="分析层级">{module.views.map(item => <button key={item.key} className={view.key === item.key ? "active" : ""} onClick={() => setViewKey(item.key)}>{item.title}</button>)}</div>}
        {module.key === "forecast" && <label className="global-view-select">区域口径<select aria-label="预测区域口径" value={view.key} onChange={event => setViewKey(event.target.value)}>{module.views.map(item => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label>}
        {module.key === "region" && <div className="global-segmented" aria-label="动力类型">{["合计", "EV", "PHEV"].map(item => <button key={item} className={kind === item ? "active" : ""} onClick={() => setKind(item)}>{item}</button>)}</div>}
        <div className="global-date-controls"><label>起始<select value={startIndex} onChange={event => { const next = Number(event.target.value); setStartIndex(next); if (next > endIndex) setEndIndex(next); }}>{view.periods.map((period, index) => <option key={period} value={index}>{period}</option>)}</select></label><span>—</span><label>结束<select value={endIndex} onChange={event => { const next = Number(event.target.value); setEndIndex(next); if (next < startIndex) setStartIndex(next); }}>{view.periods.map((period, index) => <option key={period} value={index}>{period}</option>)}</select></label></div>
      </section>

      {countryError && <div className="global-load-error" role="alert">{countryError}</div>}

      <section className="global-analysis">
        <aside className="global-selector">
          <header><span>分析对象</span><strong>{module.key === "forecast" ? "选择预测情景" : `选择${view.title.replace("分", "")}`}</strong>{module.key !== "forecast" && <small>最多同时选择 8 项</small>}</header>
          <div className="global-options">{countryLoading ? <div className="global-country-loading">正在载入{countryName}数据…</div> : filteredSeries.map(series => <label key={series.id}><input type="checkbox" checked={selectedIds.includes(series.id)} disabled={!selectedIds.includes(series.id) && selectedIds.length >= 8} onChange={() => toggleSeries(series.id)} /><span>{series.name}</span></label>)}</div>
          <footer>{selected.length} / 8 已选 · 共 {availableSeries.length} 项</footer>
        </aside>

        <article className="global-panel global-main-chart">
          <header><div><span>{module.key === "forecast" ? "2026 情景预测" : "纵向时间序列"}</span><h2>{module.key === "forecast" ? `${view.title}月度销量预期` : module.key === "countries" ? `${countryName}${view.title}月度销量趋势` : `${module.title}月度销量趋势`}</h2></div><small>{visiblePeriods[0]} 至 {visiblePeriods[visiblePeriods.length - 1]} · {visiblePeriods.length}期</small></header>
          <div className="global-legend">{chartRows.map(row => <span key={row.name}><i style={{ background: row.color }} />{row.name}</span>)}</div>
          <LineChart periods={visiblePeriods} rows={chartRows} />
        </article>
      </section>

      {module.key === "forecast" ? <article className="global-panel global-forecast-panel"><header><div><span>年度情景汇总</span><h2>{view.title} <b className="global-forecast-year">2026</b> 年销量预期</h2></div><small>单位：万辆</small></header><ForecastBarChart series={view.series} periods={view.periods} title={view.title} /></article> : <article className="global-panel global-pie-panel"><header><div><span>当月销量结构</span><h2>{module.key === "countries" ? `${countryName}${view.title}销量构成` : `${module.title}销量构成`}</h2></div><label>选择月份<select aria-label="饼图月份" value={piePeriodIndex} onChange={event => setPiePeriodIndex(Number(event.target.value))}>{view.periods.map((period, index) => <option key={period} value={index}>{period}</option>)}</select></label></header><MonthlyPie rows={pieRows} period={view.periods[piePeriodIndex]} /></article>}

      {(module.key === "countries" || module.key === "europe" || module.key === "usa") && <>
        <article className="global-panel global-penetration-panel">
          <header><div><span>新能源车市场结构</span><h2>{penetrationName}新能源车渗透率</h2></div><div className="global-penetration-actions"><small>{penetrationRows.length ? `新能源车销量 / 汽车总销量 · 更新至 ${activePenetration?.periods[penetrationLastIndex]}` : "当前时间范围暂无该地区渗透率口径"}</small>{penetrationAvailablePeriods.length > 0 && <div className="global-card-date-controls"><label>起始<select aria-label="渗透率起始月份" value={penetrationStartIndex} onChange={event => { const next = Number(event.target.value); setPenetrationStart(next); if (next > penetrationEndIndex) setPenetrationEnd(next); }}>{penetrationAvailablePeriods.map((period, index) => <option key={period} value={index}>{period}</option>)}</select></label><span>—</span><label>结束<select aria-label="渗透率结束月份" value={penetrationEndIndex} onChange={event => { const next = Number(event.target.value); setPenetrationEnd(next); if (next < penetrationStartIndex) setPenetrationStart(next); }}>{penetrationAvailablePeriods.map((period, index) => <option key={period} value={index}>{period}</option>)}</select></label></div>}</div></header>
          {penetrationRows.length ? <><div className="global-legend"><span><i style={{ background: palette[2] }} />{penetrationRows[0].name}</span></div><LineChart periods={penetrationPeriods} rows={penetrationRows} unit="" valueFormatter={formatPercent} autoScaleY /></> : <div className="global-country-empty">当前时间范围暂无该地区渗透率口径</div>}
        </article>
        {module.key === "countries" &&
        <article className="global-panel global-country-table-panel">
          <header><div><span>当月完整明细</span><h2>{countryName} · {view.periods[piePeriodIndex]} · {view.title}销量排名</h2></div><small>共 {availableSeries.length} 项 · 单位：辆</small></header>
          <CountryRankingTable series={availableSeries} periods={view.periods} periodIndex={piePeriodIndex} label={view.key === "model" ? "车型" : "车企"} />
        </article>}
      </>}
      <footer className="global-source">数据来源：MarkLines，东吴证券研究所 · 历史销量：{data.source} · 销量预期：{data.forecastSource}</footer>
    </section>
  </main>;
}
