"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import installData from "./data/install-summary.json";
import structureSource from "./data/domestic-structure.json";
import domesticMakerSource from "./data/domestic-makers.json";
import globalMarketsSource from "./data/global-markets.json";

type Tab = "domestic" | "chemistry" | "chinaRank" | "global";
type Series = { name: string; values: number[]; color: string };

const months = ["1月", "2月", "3月", "4月", "5月", "6月"];
const tabs: { key: Tab; name: string; scope: string }[] = [
  { key: "domestic", name: "装机电量汇总(GGII)", scope: "车型 · 材料 · 形态" },
  { key: "chemistry", name: "国内装机结构", scope: "企业 · 车型 · 材料" },
  { key: "chinaRank", name: "国内厂商", scope: "装机量 · 市占率" },
  { key: "global", name: "全球及海外", scope: "SNE口径" },
];

type DomesticMaker = { name: string; volume: Record<string, number>; share: Record<string, number> };
type DomesticMakerDataset = { source: string; periods: string[]; totals: Record<string, number>; companies: DomesticMaker[] };
type MarketScope = "global" | "overseas";
type MarketScopeDataset = DomesticMakerDataset & { label: string };
type GlobalMarketsDataset = { source: string; scopes: Record<MarketScope, MarketScopeDataset> };
const domesticMakerData = domesticMakerSource as DomesticMakerDataset;
const globalMarketsData = globalMarketsSource as GlobalMarketsDataset;
const domesticCompanies = domesticMakerData.companies.filter(company => company.name !== "其他").map(company => company.name);
const domesticColors = ["#00215D", "#A9974F", "#7F8B97", "#007BC5", "#F47A2A", "#8FB9D1", "#2B7A66", "#526A82", "#6F7F55", "#9A7F55", "#4E6FA3", "#826A8C"];
const domesticMaker = (name: string) => domesticMakerData.companies.find(company => company.name === name)!;
const domesticColor = (name: string) => name === "其他" ? "#cbd3dd" : domesticColors[Math.max(0, domesticCompanies.indexOf(name)) % domesticColors.length];

const pct = (v: number) => `${v.toFixed(v >= 10 ? 1 : 2)}%`;

type VehicleMetric = "avgKwh" | "units" | "energyKwh";
type InstallYear = {
  year: string;
  period: string;
  vehicles: Record<string, { avgKwh: number | null; units: number | null; energyKwh: number | null }>;
  batteries: Record<string, { energyKwh: number; share: number }>;
};
const installSummary = installData as { note: string; vehicleTypes: string[]; chemistryTypes: string[]; formTypes: string[]; years: InstallYear[] };

type StructureYear = "2022" | "2023" | "2024" | "2025" | "2026";
type StructureView = "companyVehicle" | "companyChemistry" | "vehicleChemistry" | "vehicleTotal";
type StructureMetric = "share" | "volume";
type YearSeries = Record<StructureYear, number>;
type StructureCompany = {
  name: string;
  vehicle: Record<string, YearSeries>;
  chemistry: Record<string, YearSeries>;
  total: YearSeries;
};
type StructureDataset = {
  source: string;
  period: string;
  years: StructureYear[];
  companies: StructureCompany[];
  vehicleMix: Record<string, Record<string, YearSeries>>;
  vehicleUnits: Record<string, YearSeries>;
  notes: string[];
};
const structureData = structureSource as StructureDataset;
const structureColors: Record<string, string> = {
  "乘用车": "#00215D", "客车": "#A9974F", "专用车": "#7F8B97",
  "磷酸铁锂": "#00215D", "三元": "#A9974F", "其他": "#7F8B97", "装机量": "#00215D",
};

const metricMeta: Record<VehicleMetric, { name: string; unit: string }> = {
  avgKwh: { name: "平均电量", unit: "kWh/辆" },
  units: { name: "装机量", unit: "辆" },
  energyKwh: { name: "合计装机电量", unit: "GWh" },
};

const metricValue = (value: number | null, metric: VehicleMetric) => metric === "energyKwh" ? (value ?? 0) / 1e6 : value ?? 0;
const displayValue = (value: number, metric: VehicleMetric) => metric === "units" ? Math.round(value).toLocaleString("zh-CN") : value.toLocaleString("zh-CN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

function HorizontalBars({ rows, unit, formatter }: { rows: { label: string; value: number }[]; unit: string; formatter?: (v: number) => string }) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return <div className="hbars">{rows.map((row, index) => <div className="hbar" key={row.label}>
    <span title={row.label}>{row.label}</span><div><i style={{ width: `${Math.max(row.value > 0 ? 1.2 : 0, row.value / max * 100)}%`, background: index % 3 === 1 ? "#ae9a57" : index % 3 === 2 ? "#929497" : "#153b68" }} /></div><strong>{formatter ? formatter(row.value) : row.value.toFixed(1)}<small>{unit}</small></strong>
  </div>)}</div>;
}

function BatteryColumnBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map(row => row.value), 1);
  const colors = ["#00215D", "#A9974F", "#7F8B97", "#8FB9D1"];
  return <div className="battery-column-chart">
    <div className="battery-column-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ bottom: `${value}%` }} />)}</div>
    <div className="battery-columns">{rows.map((row, index) => {
      const label = row.value > 0 && row.value < .1 ? "<0.1" : row.value.toFixed(1);
      return <div className="battery-column" key={row.label} title={`${row.label}：${row.value.toFixed(3)} GWh`}>
        <b>{label}</b><div><i style={{ height: `${Math.max(row.value > 0 ? 2 : 0, row.value / max * 100)}%`, background: colors[index % colors.length] }} /></div><span>{row.label}</span>
      </div>;
    })}</div>
    <small>单位：GWh</small>
  </div>;
}

const batteryLineColors = ["#00215D", "#A9974F", "#7F8B97", "#007BC5", "#F47A2A", "#8FB9D1"];

function BatteryTypeLineChart({ types }: { types: string[] }) {
  const allYears = installSummary.years;
  const [selectedTypes, setSelectedTypes] = useState<string[]>(types);
  const [startYear, setStartYear] = useState(allYears[0].year);
  const [endYear, setEndYear] = useState(allYears[allYears.length - 1].year);
  useEffect(() => setSelectedTypes(types), [types]);
  const startIndex = allYears.findIndex(row => row.year === startYear);
  const endIndex = allYears.findIndex(row => row.year === endYear);
  const years = allYears.slice(startIndex, endIndex + 1);
  const series = useMemo(() => selectedTypes.map(type => ({
    type,
    color: batteryLineColors[types.indexOf(type) % batteryLineColors.length],
    values: years.map(row => (row.batteries[type]?.energyKwh ?? 0) / 1e6),
  })), [selectedTypes, types, years]);
  const maximum = Math.max(10, Math.ceil(Math.max(...series.flatMap(item => item.values), 1) / 50) * 50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xPercent = (index: number) => years.length === 1 ? 50 : 2 + index / (years.length - 1) * 96;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      series.forEach(item => {
        context.beginPath();
        item.values.forEach((value, index) => {
          const x = width * (xPercent(index) / 100);
          const y = height - value / maximum * height;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.strokeStyle = item.color;
        context.lineWidth = 2.5;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke();
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [series, years.length, maximum]);
  const toggleType = (type: string) => setSelectedTypes(current => current.includes(type)
    ? current.length === 1 ? current : current.filter(item => item !== type)
    : [...current, type]);
  const changeStartYear = (next: string) => {
    setStartYear(next);
    if (allYears.findIndex(row => row.year === next) > endIndex) setEndYear(next);
  };
  const changeEndYear = (next: string) => {
    setEndYear(next);
    if (allYears.findIndex(row => row.year === next) < startIndex) setStartYear(next);
  };
  return <div className="battery-series-chart">
    <div className="battery-series-filters">
      <div className="battery-type-filter" role="group" aria-label="选择展示类型">{types.map((type, index) => <button type="button" key={type} className={selectedTypes.includes(type) ? "active" : ""} onClick={() => toggleType(type)}><i style={{ background: batteryLineColors[index % batteryLineColors.length] }} />{type}</button>)}</div>
      <div className="battery-year-filter"><label>起始<select value={startYear} onChange={event => changeStartYear(event.target.value)}>{allYears.map(row => <option key={row.year} value={row.year}>{row.year}</option>)}</select></label><span>—</span><label>结束<select value={endYear} onChange={event => changeEndYear(event.target.value)}>{allYears.map(row => <option key={row.year} value={row.year}>{row.year}</option>)}</select></label></div>
    </div>
    <div className="battery-series-body">
      <div className="battery-series-axis">{[maximum, maximum * .75, maximum * .5, maximum * .25, 0].map(value => <span key={value}>{value.toFixed(0)}</span>)}</div>
      <div className="battery-series-plot"><div className="battery-series-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ top: `${value}%` }} />)}</div><canvas ref={canvasRef} />{series.flatMap(item => item.values.map((value, index) => <i className="battery-series-point" key={`${item.type}-${years[index].year}`} title={`${years[index].year} · ${item.type}：${value.toFixed(2)} GWh`} style={{ left: `${xPercent(index)}%`, top: `${100 - value / maximum * 100}%`, background: item.color }} />))}<div className="battery-series-years">{years.map((row, index) => <span key={row.year} style={{ left: `${xPercent(index)}%` }}>{row.year}{row.year === "2026" && <small>1-5月</small>}</span>)}</div></div>
    </div><small>单位：GWh · 鼠标悬浮查看精确值</small>
  </div>;
}

function YearBars({ rows, unit, formatter, choices, selected, onSelect }: { rows: { year: string; value: number; period: string }[]; unit: string; formatter?: (v: number) => string; choices?: string[]; selected?: string; onSelect?: (value: string) => void }) {
  const max = Math.max(...rows.map(r => r.value), 1);
  const colors = ["#00215D", "#A9974F", "#7F8B97"];
  return <div className="year-chart">{choices && onSelect && <div className="chart-type-picker" role="group" aria-label="选择分析类型">{choices.map(choice => <button type="button" key={choice} className={selected === choice ? "active" : ""} onClick={() => onSelect(choice)}>{choice}</button>)}</div>}<div className="year-grid">{rows.map((row, index) => <div className="year-column" key={row.year} title={`${row.year} ${row.period}`}>
    <div><i style={{ height: `${Math.max(row.value > 0 ? 2 : 0, row.value / max * 100)}%`, background: colors[index % colors.length] }}><b>{formatter ? formatter(row.value) : row.value.toFixed(1)}</b></i></div><span>{row.year}{row.year === "2026" && <em>1-5月</em>}</span>
  </div>)}</div><small className="chart-unit">单位：{unit}</small></div>;
}

function Panel({ title, source, children, className = "" }: { title: string; source?: string; children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-title"><div><span>{source}</span><h2>{title}</h2></div><i /></div>{children}</section>;
}

function Kpi({ label, value, unit, yoy, mom }: { label: string; value: string; unit: string; yoy?: string; mom?: string }) {
  return <article className="kpi"><span>{label}</span><div><strong>{value}</strong><b>{unit}</b></div><p>{yoy && <>同比 <em>{yoy}</em></>}{mom && <>环比 <em>{mom}</em></>}</p></article>;
}

function GroupBars({ series, labels = months }: { series: Series[]; labels?: string[] }) {
  const max = Math.max(...series.flatMap(s => s.values));
  return <div className="group-chart"><div className="chart-legend">{series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div><div className="columns">{labels.map((label, i) => <div className="column" key={label}><div className="column-bars">{series.map(s => s.values[i] == null ? null : <div className="bar-item" key={s.name} style={{ height: `${Math.max(3, s.values[i] / max * 100)}%`, background: s.color }}><b>{s.values[i].toFixed(1)}</b></div>)}</div><span>{label}</span></div>)}</div></div>;
}

function RankTable({ rows, period }: { rows: readonly (readonly [string, number, number, number?])[]; period: string }) {
  const max = Math.max(...rows.map(r => r[1]));
  return <div className="rank-table"><div className="rank-head"><span>排名 / 企业</span><span>{period}装机</span><span>市占率</span><span>进度</span></div>{rows.map((r, i) => <div className="rank-row" key={r[0]}><span><b>{String(i + 1).padStart(2, "0")}</b>{r[0]}</span><strong>{r[1].toFixed(2)} <small>GWh</small></strong><em>{pct(r[2])}</em><i><u style={{ width: `${r[1] / max * 100}%` }} /></i></div>)}</div>;
}

function Domestic() {
  const [year, setYear] = useState("2026");
  const [metric, setMetric] = useState<VehicleMetric>("avgKwh");
  const [vehicle, setVehicle] = useState("合计");
  const [batteryGroup, setBatteryGroup] = useState<"chemistry" | "form">("chemistry");
  const [battery, setBattery] = useState("磷酸铁锂");
  const selected = installSummary.years.find(r => r.year === year)!;
  const total = selected.vehicles["合计"];
  const batteryTypes = batteryGroup === "chemistry" ? installSummary.chemistryTypes : installSummary.formTypes;
  const vehicleRows = installSummary.vehicleTypes.map(label => ({ label, value: metricValue(selected.vehicles[label]?.[metric] ?? 0, metric) }));
  const vehicleYears = installSummary.years.map(row => ({ year: row.year, period: row.period, value: metricValue(row.vehicles[vehicle]?.[metric] ?? 0, metric) }));
  const batteryYears = installSummary.years.map(row => ({ year: row.year, period: row.period, value: (row.batteries[battery]?.energyKwh ?? 0) / 1e6 }));
  const lfp = selected.batteries["磷酸铁锂"];
  return <div className="install-dashboard">
    <div className="summary-kpis">
      <article className="summary-lead"><span>{year}年{selected.period}</span><strong>{(total.energyKwh! / 1e6).toFixed(1)}<small>GWh</small></strong><p>合计装机电量</p></article>
      <article><span>装机量</span><strong>{(total.units! / 10000).toFixed(1)}<small>万辆</small></strong><p>终端装机车辆</p></article>
      <article><span>平均电量</span><strong>{total.avgKwh!.toFixed(1)}<small>kWh/辆</small></strong><p>装机电量 ÷ 装机量</p></article>
      <article><span>磷酸铁锂</span><strong>{(lfp.energyKwh / 1e6).toFixed(1)}<small>GWh</small></strong><p>占比 <em>{(lfp.share * 100).toFixed(1)}%</em></p></article>
    </div>
    <div className="dashboard-toolbar"><div><b>车型装机数据</b><span>2020—2026年度累计口径</span></div><label>观察年份<select value={year} onChange={e => setYear(e.target.value)}>{installSummary.years.map(r => <option key={r.year} value={r.year}>{r.year}{r.year === "2026" ? "（1-5月）" : "（全年）"}</option>)}</select></label></div>
    <div className="dashboard-grid main-grid">
      <Panel title="不同车型横向对比" source={`${year}年 · ${metricMeta[metric].name}`} className="dashboard-panel"><div className="segmented">{(Object.keys(metricMeta) as VehicleMetric[]).map(key => <button key={key} className={metric === key ? "active" : ""} onClick={() => setMetric(key)}>{metricMeta[key].name}</button>)}</div><HorizontalBars rows={vehicleRows} unit={metricMeta[metric].unit} formatter={v => displayValue(v, metric)} /></Panel>
      <Panel title="单一车型纵向年份数据" source={`${vehicle} · ${metricMeta[metric].name}`} className="dashboard-panel"><YearBars rows={vehicleYears} unit={metricMeta[metric].unit} formatter={v => displayValue(v, metric)} choices={installSummary.vehicleTypes} selected={vehicle} onSelect={setVehicle} /></Panel>
    </div>
    <div className="dashboard-grid battery-grid">
      <Panel title="不同类型电池装机量时间序列" source="2020—2026 · 装机电量" className="dashboard-panel battery-series-panel"><div className="battery-chart-controls"><div className="segmented"><button className={batteryGroup === "chemistry" ? "active" : ""} onClick={() => { setBatteryGroup("chemistry"); setBattery("磷酸铁锂"); }}>材料体系</button><button className={batteryGroup === "form" ? "active" : ""} onClick={() => { setBatteryGroup("form"); setBattery("方形"); }}>封装形态</button></div></div><BatteryTypeLineChart types={batteryTypes} /></Panel>
      <Panel title="单一电池类型纵向年份数据" source={`${battery} · 装机电量`} className="dashboard-panel"><YearBars rows={batteryYears} unit="GWh" choices={batteryTypes} selected={battery} onSelect={setBattery} /></Panel>
    </div>
  </div>;
}

function StructureLegend({ categories }: { categories: string[] }) {
  return <div className="structure-legend">{categories.map(category => <span key={category}><i style={{ background: structureColors[category] }} />{category}</span>)}</div>;
}

function StructureRows({ rows, categories, metric, selected, onSelect, unit, showSegmentLabels = false, hideTotal = false, shareOfGrandTotal = false }: {
  rows: { name: string; values: Record<string, number> }[];
  categories: string[];
  metric: StructureMetric;
  selected: string;
  onSelect: (name: string) => void;
  unit: string;
  showSegmentLabels?: boolean;
  hideTotal?: boolean;
  shareOfGrandTotal?: boolean;
}) {
  const [hoveredRow, setHoveredRow] = useState<{ name: string; index: number } | null>(null);
  const maxTotal = Math.max(...rows.map(row => Object.values(row.values).reduce((a, b) => a + b, 0)), 1);
  const grandTotal = rows.reduce((sum, row) => sum + Object.values(row.values).reduce((a, b) => a + b, 0), 0);
  const hoveredData = hoveredRow ? rows.find(row => row.name === hoveredRow.name) : null;
  return <div className="structure-rows">{rows.map((row, index) => {
    const total = Object.values(row.values).reduce((a, b) => a + b, 0);
    const grandShare = grandTotal ? total / grandTotal * 100 : 0;
    const trackWidth = shareOfGrandTotal ? grandShare : metric === "share" ? 100 : total / maxTotal * 100;
    return <button className={`${selected === row.name ? "selected" : ""} ${hideTotal ? "wide-bars" : ""}`} key={row.name} onClick={() => onSelect(row.name)} onMouseEnter={() => setHoveredRow({ name: row.name, index })} onMouseLeave={() => setHoveredRow(null)} onFocus={() => setHoveredRow({ name: row.name, index })} onBlur={() => setHoveredRow(null)}>
      <span className="row-rank">{String(index + 1).padStart(2, "0")}</span>
      <b title={row.name}>{row.name}</b>
      <div className="structure-track"><div className="structure-fill" style={{ width: `${trackWidth}%` }}>{categories.map(category => {
        const value = row.values[category] || 0;
        const share = shareOfGrandTotal ? 100 : total ? value / total * 100 : 0;
        const displayShare = shareOfGrandTotal ? grandShare : share;
        const label = metric === "share" ? `${displayShare.toFixed(1)}%` : `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}`;
        return <i key={category} aria-label={`${row.name} · ${category}：${displayShare.toFixed(1)}%`} style={{ width: `${share}%`, background: shareOfGrandTotal ? structureColors[row.name] : structureColors[category] }}>{showSegmentLabels && (metric === "volume" || displayShare >= 3) && <span>{label}</span>}</i>;
      })}</div></div>
      {!hideTotal && <strong>{metric === "share" ? "100%" : total.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}<small>{metric === "share" ? "结构" : unit}</small></strong>}
    </button>;
  })}{hoveredData && (() => {
    const total = Object.values(hoveredData.values).reduce((sum, value) => sum + value, 0);
    const tooltipTop = Math.max(0, Math.min(hoveredRow!.index * 26 + 22, rows.length * 26 - 88));
    return <div className="structure-row-tooltip" style={{ top: `${tooltipTop}px` }} role="tooltip"><strong>{hoveredData.name}</strong>{categories.map(category => {
      const value = hoveredData.values[category] || 0;
      const share = total ? value / total * 100 : 0;
      return <span key={category}><i style={{ background: structureColors[category] }} /><b>{category}</b><em>{share.toFixed(1)}%</em></span>;
    })}</div>;
  })()}</div>;
}

function CompanyQuantityBars({ rows, categories, unit, colorByRow = false }: {
  rows: { name: string; values: Record<string, number> }[];
  categories: string[];
  unit: string;
  colorByRow?: boolean;
}) {
  const maxValue = Math.max(...rows.flatMap(row => categories.map(category => row.values[category] || 0)), 1);
  return <div className="company-quantity"><div className="quantity-chart"><div className="quantity-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ bottom: `${value}%` }} />)}</div>{rows.map(row => <div className="quantity-group" key={row.name}>{categories.map((category, categoryIndex) => {
    const value = row.values[category] || 0;
    const label = value <= 0 ? "" : value < .1 ? "<0.1" : value.toFixed(1);
    const labelClass = value > 0 && value < maxValue * .08 ? `small-value label-tier-${categoryIndex % 3}` : "";
    return <i className={labelClass} key={category} title={`${row.name} · ${category}：${value.toFixed(3)} ${unit}`} style={{ height: `${value / maxValue * 100}%`, background: structureColors[colorByRow ? row.name : category] }}><span>{label}</span></i>;
  })}<b title={row.name}>{row.name.replace("新能源", "新").replace("时代", "")}</b></div>)}</div></div>;
}

function VehicleTotalPieChart({ categories, values, year, unit }: {
  categories: string[];
  values: Record<string, YearSeries>;
  year: StructureYear;
  unit: string;
}) {
  const total = categories.reduce((sum, category) => sum + (values[category]?.[year] || 0), 0);
  let cursor = 0;
  const entries = categories.map(category => {
    const value = values[category]?.[year] || 0;
    const share = total ? value / total * 100 : 0;
    const start = cursor;
    cursor += share;
    return { category, value, share, start, end: cursor };
  });
  const gradient = total
    ? `conic-gradient(${entries.map(entry => `${structureColors[entry.category]} ${entry.start}% ${entry.end}%`).join(",")})`
    : "#e5eaf0";
  return <div className="vehicle-total-pie">
    <div className="vehicle-pie-content">
      <div className="vehicle-pie-ring" style={{ background: gradient }} role="img" aria-label={`${year}年各车型装机量结构`}><div><strong>{total.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}</strong><span>{unit}</span><small>合计装机量</small></div></div>
      <div className="vehicle-pie-legend compact">{entries.map(entry => <div key={entry.category} title={`${entry.category}：${entry.value.toFixed(1)} ${unit}，占比 ${entry.share.toFixed(1)}%`}><span><i style={{ background: structureColors[entry.category] }} />{entry.category}</span></div>)}</div>
    </div>
  </div>;
}

function VehicleTotalComboChart({ rows, unit }: { rows: { name: string; values: Record<string, number> }[]; unit: string }) {
  const quantities = rows.map(row => Object.values(row.values).reduce((sum, value) => sum + value, 0));
  const total = quantities.reduce((sum, value) => sum + value, 0);
  const shares = quantities.map(value => total ? value / total * 100 : 0);
  const maximum = Math.max(...quantities, 1) * 1.12;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.beginPath();
      shares.forEach((share, index) => {
        const x = (index + .5) / shares.length * width;
        const y = height - share / 100 * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = "#d2942f";
      context.lineWidth = 3;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.stroke();
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [shares]);
  return <div className="vehicle-combo"><div className="combo-legend"><span><i className="bar-key" />装机量（左轴）</span><span><i className="line-key" />结构占比（右轴）</span></div><div className="combo-axis combo-axis-left">{[maximum, maximum * .75, maximum * .5, maximum * .25, 0].map((value, index) => <span key={index}>{value.toFixed(0)}</span>)}</div><div className="combo-plot"><div className="combo-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ top: `${value}%` }} />)}</div><canvas ref={canvasRef} className="combo-line-canvas" />{rows.map((row, index) => <div className="combo-group" key={row.name} style={{ left: `${(index + .5) / rows.length * 100}%` }}><div className={`combo-bar ${quantities[index] / maximum > .35 ? "tall" : "short"}`} style={{ height: `${quantities[index] / maximum * 100}%`, background: structureColors[row.name] }}><b>{quantities[index].toFixed(1)}</b></div><span>{row.name}</span></div>)}{shares.map((share, index) => <span className={`combo-point ${share > 85 ? "high" : ""}`} key={rows[index].name} style={{ left: `${(index + .5) / rows.length * 100}%`, top: `${100 - share}%` }}><i /><b>{share.toFixed(1)}%</b></span>)}</div><div className="combo-axis combo-axis-right">{[100, 75, 50, 25, 0].map(value => <span key={value}>{value}%</span>)}</div><p>装机量单位：{unit}</p></div>;
}

function StructureLineTrend({ years, categories, values, unit }: {
  years: StructureYear[];
  categories: string[];
  values: Record<string, YearSeries>;
  unit: string;
}) {
  const maximum = Math.max(...categories.flatMap(category => years.map(year => values[category]?.[year] || 0)), 1) * 1.12;
  const ticks = [maximum, maximum * .75, maximum * .5, maximum * .25, 0];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.lineWidth = 3;
      context.lineJoin = "round";
      context.lineCap = "round";
      categories.forEach(category => {
        context.beginPath();
        years.forEach((year, index) => {
          const x = index / (years.length - 1) * width;
          const y = height - (values[category]?.[year] || 0) / maximum * height;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.strokeStyle = structureColors[category];
        context.stroke();
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [years, categories, values, maximum]);
  return <div className="line-trend"><div className="line-axis">{ticks.map((value, index) => <span key={index}>{value.toFixed(0)}</span>)}</div><div className="line-chart"><div className="line-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ top: `${value}%` }} />)}</div><canvas ref={canvasRef} className="line-canvas" aria-label="分类装机量年度折线图" />{categories.map(category => {
    const points = years.map(year => (values[category]?.[year] || 0) / maximum * 100);
    return <div className="line-series" key={category}>{points.map((point, index) => <span className={`line-point ${index === 0 ? "first" : index === points.length - 1 ? "last" : ""}`} key={years[index]} style={{ left: `${index / (years.length - 1) * 100}%`, top: `${100 - point}%`, color: structureColors[category] }}><i /><b>{(values[category]?.[years[index]] || 0).toFixed(1)}</b></span>)}</div>;
  })}</div><div className="line-years">{years.map(year => <span key={year}>{year}{year === "2026" && <small>1-5月</small>}</span>)}</div><p>分类装机量 · 单位：{unit}</p></div>;
}

function StructureAreaTrend({ years, categories, values }: { years: StructureYear[]; categories: string[]; values: Record<string, YearSeries> }) {
  const totals = years.map(year => categories.reduce((sum, category) => sum + (values[category]?.[year] || 0), 0));
  const shares = categories.map(category => years.map((year, index) => totals[index] ? (values[category]?.[year] || 0) / totals[index] * 100 : 0));
  const smoothPoints = (series: number[]) => {
    const points: { x: number; y: number }[] = [];
    series.slice(0, -1).forEach((value, index) => {
      for (let step = 0; step < 16; step += 1) {
        const t = step / 16;
        const eased = t * t * (3 - 2 * t);
        points.push({ x: (index + t) / (series.length - 1) * 100, y: value + (series[index + 1] - value) * eased });
      }
    });
    points.push({ x: 100, y: series.at(-1) || 0 });
    return points;
  };
  let cumulative = years.map(() => 0);
  const bands = categories.map((category, categoryIndex) => {
    const lower = [...cumulative];
    const upper = cumulative.map((value, index) => value + shares[categoryIndex][index]);
    cumulative = upper;
    const top = smoothPoints(upper).map(point => `${point.x.toFixed(2)}% ${(100 - point.y).toFixed(2)}%`);
    const bottom = smoothPoints(lower).reverse().map(point => `${point.x.toFixed(2)}% ${(100 - point.y).toFixed(2)}%`);
    return { category, clipPath: `polygon(${[...top, ...bottom].join(",")})` };
  });
  return <div className="area-trend"><div className="area-axis">{[100, 75, 50, 25, 0].map(value => <span key={value}>{value}%</span>)}</div><div className="area-chart"><div className="area-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ top: `${value}%` }} />)}</div>{bands.map(band => <i className="area-band" key={band.category} title={band.category} style={{ background: structureColors[band.category], clipPath: band.clipPath }} />)}<div className="area-end-labels">{categories.map((category, index) => <span key={category} style={{ color: structureColors[category] }}>{category}<b>{shares[index].at(-1)?.toFixed(1)}%</b></span>)}</div></div><div className="area-years">{years.map(year => <span key={year}>{year}{year === "2026" && <small>1-5月</small>}</span>)}</div><p>结构占比 · 100% 堆叠面积</p></div>;
}

function StructureVolumeAreaTrend({ years, values, unit }: { years: StructureYear[]; values: Record<string, YearSeries>; unit: string }) {
  const series = years.map(year => Object.values(values).reduce((sum, item) => sum + (item[year] || 0), 0));
  const ceiling = Math.max(...series, 1) * 1.12;
  const normalized = series.map(value => value / ceiling * 100);
  const points: { x: number; y: number }[] = [];
  normalized.slice(0, -1).forEach((value, index) => {
    for (let step = 0; step < 16; step += 1) {
      const t = step / 16;
      const eased = t * t * (3 - 2 * t);
      points.push({ x: (index + t) / (normalized.length - 1) * 100, y: value + (normalized[index + 1] - value) * eased });
    }
  });
  points.push({ x: 100, y: normalized.at(-1) || 0 });
  const curve = points.map(point => `${point.x.toFixed(2)}% ${(100 - point.y).toFixed(2)}%`);
  const fill = `polygon(${[...curve, "100% 100%", "0% 100%"].join(",")})`;
  const tickValues = [ceiling, ceiling * .75, ceiling * .5, ceiling * .25, 0];
  return <div className="area-trend volume-area-trend"><div className="area-axis">{tickValues.map((value, index) => <span key={index}>{value.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}</span>)}</div><div className="area-chart"><div className="area-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ top: `${value}%` }} />)}</div><i className="volume-area-fill" style={{ clipPath: fill }} />{series.map((value, index) => <span className="volume-area-point" key={years[index]} style={{ left: `${index / (series.length - 1) * 100}%`, top: `${100 - normalized[index]}%` }}><b>{value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}</b><i /></span>)}</div><div className="area-years">{years.map(year => <span key={year}>{year}{year === "2026" && <small>1-5月</small>}</span>)}</div><p>装机规模趋势 · 单位：{unit}</p></div>;
}

function StructureTrend({ years, categories, values, metric, unit }: {
  years: StructureYear[];
  categories: string[];
  values: Record<string, YearSeries>;
  metric: StructureMetric;
  unit: string;
}) {
  const totals = years.map(year => categories.reduce((sum, category) => sum + (values[category]?.[year] || 0), 0));
  const maxTotal = Math.max(...totals, 1);
  return <div className="structure-trend"><div className="trend-grid">{years.map((year, yearIndex) => {
    const total = totals[yearIndex];
    const height = metric === "share" ? 100 : total / maxTotal * 100;
    return <div className="trend-column" key={year}>
      <strong>{metric === "share" ? "100%" : total.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}</strong>
      <div><span style={{ height: `${height}%` }}>{categories.map(category => <i key={category} title={`${year} ${category}`} style={{ height: `${total ? (values[category]?.[year] || 0) / total * 100 : 0}%`, background: structureColors[category] }} />)}</span></div>
      <b>{year}{year === "2026" && <small>1-5月</small>}</b>
    </div>;
  })}</div><span className="trend-unit">{metric === "share" ? "结构占比" : `单位：${unit}`}</span></div>;
}

function Chemistry() {
  const [view, setView] = useState<StructureView>("companyVehicle");
  const [selectedCompany, setSelectedCompany] = useState("宁德时代");
  const [selectedVehicle, setSelectedVehicle] = useState("乘用车");
  const [year, setYear] = useState<StructureYear>("2026");
  const selectedCompanyData = structureData.companies.find(company => company.name === selectedCompany) || structureData.companies[0];
  const isCompany = view === "companyVehicle" || view === "companyChemistry";
  const isTotal = view === "vehicleTotal";
  const metric: StructureMetric = "share";
  const categories = view === "companyVehicle" ? ["乘用车", "客车", "专用车"] : view === "vehicleTotal" ? ["装机量"] : ["磷酸铁锂", "三元", "其他"];
  const unit = isTotal ? "万辆" : "GWh";
  const unsortedRows = isCompany
    ? structureData.companies.map(company => ({ name: company.name, values: Object.fromEntries(categories.map(category => [category, (view === "companyVehicle" ? company.vehicle[category]?.[year] : company.chemistry[category]?.[year]) / 1e6 || 0])) }))
    : Object.keys(structureData.vehicleUnits).map(vehicle => ({ name: vehicle, values: isTotal ? { "装机量": structureData.vehicleUnits[vehicle][year] / 10000 } : Object.fromEntries(categories.map(category => [category, structureData.vehicleMix[vehicle][category]?.[year] / 1e6 || 0])) }));
  const sortCategory = view === "companyVehicle" ? "专用车" : view === "vehicleTotal" ? "装机量" : "磷酸铁锂";
  const sortValue = (row: { values: Record<string, number> }) => {
    const total = Object.values(row.values).reduce((sum, value) => sum + value, 0);
    return isTotal ? total : total ? (row.values[sortCategory] || 0) / total : 0;
  };
  const sortedRows = [...unsortedRows].sort((a, b) => sortValue(b) - sortValue(a));
  const rows = isCompany ? sortedRows.slice(0, 10) : sortedRows;
  const sortLabel = view === "companyVehicle" ? "专用车占比" : view === "vehicleTotal" ? "装机量占比" : "磷酸铁锂占比";
  const quantityTitle = isCompany ? "各电池厂分类装机量" : isTotal ? "各车型装机量" : "各车型分类装机量";
  const selectedName = isCompany ? selectedCompany : selectedVehicle;
  const selectedValues: Record<string, YearSeries> = isCompany
    ? Object.fromEntries(categories.map(category => [category, Object.fromEntries(structureData.years.map(y => [y, ((view === "companyVehicle" ? selectedCompanyData.vehicle[category]?.[y] : selectedCompanyData.chemistry[category]?.[y]) || 0) / 1e6]))])) as Record<string, YearSeries>
    : isTotal
      ? { "装机量": Object.fromEntries(structureData.years.map(y => [y, structureData.vehicleUnits[selectedVehicle][y] / 10000])) as YearSeries }
      : Object.fromEntries(categories.map(category => [category, Object.fromEntries(structureData.years.map(y => [y, (structureData.vehicleMix[selectedVehicle][category]?.[y] || 0) / 1e6]))])) as Record<string, YearSeries>;
  const trendCategories = isTotal ? Object.keys(structureData.vehicleUnits) : categories;
  const trendValues: Record<string, YearSeries> = isTotal
    ? Object.fromEntries(trendCategories.map(vehicle => [vehicle, Object.fromEntries(structureData.years.map(y => [y, structureData.vehicleUnits[vehicle][y] / 10000]))])) as Record<string, YearSeries>
    : selectedValues;
  const viewMeta: Record<StructureView, { name: string; sheet: string }> = {
    companyVehicle: { name: "电池厂 × 车型", sheet: "电池厂装机车型（GGII）" },
    companyChemistry: { name: "电池厂 × 材料", sheet: "电池厂装机电池种类（GGII）" },
    vehicleChemistry: { name: "车型 × 材料", sheet: "分车型装机电池种类（GGII）" },
    vehicleTotal: { name: "分车型总量", sheet: "分车型总装机量（GGII）" },
  };
  return <div className="structure-dashboard">
    <div className="structure-toolbar">
      <div className="view-tabs">{(Object.keys(viewMeta) as StructureView[]).map(key => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{viewMeta[key].name}</button>)}</div>
      <label className="structure-scope"><span>数据年份</span><select value={year} onChange={event => setYear(event.target.value as StructureYear)}>{structureData.years.map(item => <option key={item} value={item}>{item}{item === "2026" ? "（1—5月）" : "（全年）"}</option>)}</select></label>
    </div>
    {isTotal ? <div className="vehicle-total-grid">
      <Panel title="各车型装机量结构" source={`${year === "2026" ? "2026年1—5月" : `${year}年全年`} · 单位：${unit}`} className="structure-panel company-quantity-panel company-quantity-side vehicle-total-quantity-panel"><VehicleTotalPieChart categories={trendCategories} values={trendValues} year={year} unit={unit} /></Panel>
      <Panel title="各车型 · 纵向时间变化" source="2022—2026" className="structure-panel company-trend-panel vehicle-total-line-panel"><StructureLegend categories={trendCategories} /><StructureLineTrend years={structureData.years} categories={trendCategories} values={trendValues} unit={unit} /></Panel>
    </div> : <>
      <div className="structure-grid company-grid">
        <Panel title="横向结构对比" source={viewMeta[view].sheet} className="structure-panel compare-panel company-compare-panel"><div className="chart-toolbar-sim"><span><small>排序</small>{sortLabel}<b>↓</b></span><span><small>时间</small>{year === "2026" ? "2026年 1—5月" : `${year}年全年`}</span></div><StructureLegend categories={categories} /><StructureRows rows={rows} categories={categories} metric={metric} selected={selectedName} onSelect={isCompany ? setSelectedCompany : setSelectedVehicle} unit={unit} hideTotal /></Panel>
        <Panel title={quantityTitle} source={`${year === "2026" ? "2026年1—5月" : `${year}年全年`} · 单位：${unit}`} className="structure-panel company-quantity-panel company-quantity-side"><StructureLegend categories={categories} /><CompanyQuantityBars rows={rows} categories={categories} unit={unit} /></Panel>
      </div>
      <Panel title={`${selectedName} · 纵向时间变化`} source="2022—2026" className="structure-panel company-trend-panel company-line-panel"><StructureLegend categories={trendCategories} /><StructureLineTrend years={structureData.years} categories={trendCategories} values={trendValues} unit={unit} /></Panel>
    </>}
  </div>;
}

function DomesticLegend({ companies, period, showShare = false }: { companies: string[]; period: string; showShare?: boolean }) {
  return <div className="maker-legend">{companies.map(company => <span key={company}><i style={{ background: domesticColor(company) }} />{company}{showShare && <b>{domesticMaker(company).share[period].toFixed(1)}%</b>}</span>)}</div>;
}

function DomesticVolumeBars({ periods, companies }: { periods: string[]; companies: string[] }) {
  const values = periods.flatMap(period => companies.map(company => domesticMaker(company).volume[period] || 0));
  const maximum = Math.max(5, Math.ceil(Math.max(...values, 1) / 5) * 5);
  return <div className="maker-volume-chart"><DomesticLegend companies={companies} period={periods.at(-1)!} /><div className="maker-chart-body">
    <div className="maker-axis">{[maximum, maximum * .75, maximum * .5, maximum * .25, 0].map(value => <span key={value}>{value.toFixed(0)}</span>)}</div>
    <div className="maker-bar-plot"><div className="maker-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ top: `${value}%` }} />)}</div>
      {periods.map(period => <div className="maker-bar-group" key={period}>{companies.map(company => {
        const value = domesticMaker(company).volume[period] || 0;
        return <i key={company} title={`${period} · ${company}：${value.toFixed(2)} GWh`} style={{ height: `${Math.max(value > 0 ? 1 : 0, value / maximum * 100)}%`, background: domesticColor(company) }} />;
      })}<span>{period.slice(2).replace("-", "/")}</span></div>)}
    </div>
  </div><small>单位：GWh · 鼠标悬浮查看精确值</small></div>;
}

function DomesticShareLines({ periods, companies }: { periods: string[]; companies: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);
  const maximum = 60;
  const hoveredIndex = hoveredPeriod ? periods.indexOf(hoveredPeriod) : -1;
  const hoveredRows = hoveredPeriod ? companies.map(company => ({ company, share: domesticMaker(company).share[hoveredPeriod], volume: domesticMaker(company).volume[hoveredPeriod] })).sort((a, b) => b.share - a.share) : [];
  useEffect(() => {
    if (hoveredPeriod && !periods.includes(hoveredPeriod)) setHoveredPeriod(null);
  }, [hoveredPeriod, periods]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      companies.forEach(company => {
        context.beginPath();
        periods.forEach((period, index) => {
          const x = periods.length === 1 ? width / 2 : index / (periods.length - 1) * width;
          const y = height - domesticMaker(company).share[period] / maximum * height;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.strokeStyle = domesticColor(company);
        context.lineWidth = companies.indexOf(company) < 2 ? 2.6 : 1.8;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke();
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [periods, companies]);
  return <div className="maker-share-chart"><DomesticLegend companies={companies} period={periods.at(-1)!} showShare /><div className="maker-chart-body">
    <div className="maker-axis">{[60, 45, 30, 15, 0].map(value => <span key={value}>{value}%</span>)}</div>
    <div className="maker-line-plot" tabIndex={0} aria-label="国内厂商月度市占率，移动鼠标查看当月全部企业明细" onPointerMove={event => { const bounds = event.currentTarget.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(bounds.width, 1))); const index = periods.length === 1 ? 0 : Math.round(ratio * (periods.length - 1)); setHoveredPeriod(periods[index]); }} onPointerLeave={() => setHoveredPeriod(null)} onFocus={() => setHoveredPeriod(current => current ?? periods.at(-1)!)} onBlur={() => setHoveredPeriod(null)} onKeyDown={event => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); const current = hoveredPeriod ? periods.indexOf(hoveredPeriod) : periods.length - 1; const next = Math.max(0, Math.min(periods.length - 1, current + (event.key === "ArrowRight" ? 1 : -1))); setHoveredPeriod(periods[next]); }}><div className="maker-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ top: `${value}%` }} />)}</div><canvas ref={canvasRef} />
      {companies.flatMap(company => periods.map((period, index) => <i aria-hidden="true" className="maker-line-point" key={`${company}-${period}`} style={{ left: `${periods.length === 1 ? 50 : index / (periods.length - 1) * 100}%`, top: `${100 - domesticMaker(company).share[period] / maximum * 100}%`, color: domesticColor(company) }} />))}
      {hoveredPeriod && hoveredIndex >= 0 && <div className={`maker-hover-tooltip ${hoveredIndex >= periods.length * .62 ? "align-right" : ""}`} style={{ left: `${periods.length === 1 ? 50 : hoveredIndex / (periods.length - 1) * 100}%` }}><header><b>{hoveredPeriod.slice(0, 4)}年{hoveredPeriod.slice(5)}月</b><small>已选企业明细</small></header>{hoveredRows.map(row => <span key={row.company}><i style={{ background: domesticColor(row.company) }} /><b>{row.company}</b><strong>{row.share.toFixed(2)}%</strong><em>{row.volume.toFixed(2)} GWh</em></span>)}</div>}
      <div className="maker-periods">{periods.map(period => <span key={period}>{period.slice(2).replace("-", "/")}</span>)}</div>
    </div>
  </div><small>市占率 · 鼠标悬浮查看当月全部明细</small></div>;
}

function DomesticSharePie({ period, onPeriodChange }: { period: string; onPeriodChange: (period: string) => void }) {
  const ranked = domesticMakerData.companies.filter(company => company.name !== "其他").map(company => ({ name: company.name, volume: company.volume[period], share: company.share[period] })).sort((a, b) => b.share - a.share);
  const leaders = ranked.slice(0, 8);
  const leaderShare = leaders.reduce((sum, row) => sum + row.share, 0);
  const leaderVolume = leaders.reduce((sum, row) => sum + row.volume, 0);
  const slices = [...leaders, { name: "其他", share: Math.max(0, 100 - leaderShare), volume: Math.max(0, domesticMakerData.totals[period] - leaderVolume) }];
  let cursor = 0;
  const gradient = slices.map(slice => {
    const start = cursor;
    cursor += slice.share;
    return `${domesticColor(slice.name)} ${start}% ${cursor}%`;
  }).join(",");
  return <div className="maker-pie"><label>结构月份<select value={period} onChange={event => onPeriodChange(event.target.value)}>{domesticMakerData.periods.map(value => <option value={value} key={value}>{value}</option>)}</select></label><div className="maker-pie-body"><div className="maker-donut" style={{ background: `conic-gradient(${gradient})` }}><i><b>{period.slice(0, 4)}</b><span>{period.slice(5)}月</span><small>{domesticMakerData.totals[period].toFixed(1)} GWh</small></i></div><div className="maker-pie-legend">{slices.map(slice => <span key={slice.name}><i style={{ background: domesticColor(slice.name) }} /><b>{slice.name}</b><strong>{slice.share.toFixed(1)}%</strong><small>{slice.volume.toFixed(1)} GWh</small></span>)}</div></div></div>;
}

function DomesticPeriodControl({ label, start, end, onChange, periods = domesticMakerData.periods }: { label: string; start: string; end: string; onChange: (start: string, end: string) => void; periods?: string[] }) {
  const startIndex = periods.indexOf(start);
  const endIndex = periods.indexOf(end);
  const setStart = (value: string) => onChange(value, periods.indexOf(value) > endIndex ? value : end);
  const setEnd = (value: string) => onChange(periods.indexOf(value) < startIndex ? value : start, value);
  return <div className="maker-chart-range" role="group" aria-label={`${label}时间区间`}><b>时间区间</b><label>开始<select aria-label={`${label}开始月份`} value={start} onChange={event => setStart(event.target.value)}>{periods.map(period => <option key={period}>{period}</option>)}</select></label><span>—</span><label>结束<select aria-label={`${label}结束月份`} value={end} onChange={event => setEnd(event.target.value)}>{periods.map(period => <option key={period}>{period}</option>)}</select></label><div><button type="button" onClick={() => onChange(periods[Math.max(0, periods.length - 6)], periods.at(-1)!)}>近6月</button><button type="button" onClick={() => onChange("2025-01", "2025-12")}>2025全年</button><button type="button" onClick={() => onChange(periods[0], periods.at(-1)!)}>全部</button></div></div>;
}

function ChinaRank() {
  const allPeriods = domesticMakerData.periods;
  const [shareStartPeriod, setShareStartPeriod] = useState(allPeriods[0]);
  const [shareEndPeriod, setShareEndPeriod] = useState(allPeriods.at(-1)!);
  const [volumeStartPeriod, setVolumeStartPeriod] = useState(allPeriods[0]);
  const [volumeEndPeriod, setVolumeEndPeriod] = useState(allPeriods.at(-1)!);
  const [piePeriod, setPiePeriod] = useState(allPeriods.at(-1)!);
  const [selectedCompanies, setSelectedCompanies] = useState(domesticCompanies.slice(0, 8));
  const [companySearch, setCompanySearch] = useState("");
  const sharePeriods = allPeriods.slice(allPeriods.indexOf(shareStartPeriod), allPeriods.indexOf(shareEndPeriod) + 1);
  const volumePeriods = allPeriods.slice(allPeriods.indexOf(volumeStartPeriod), allPeriods.indexOf(volumeEndPeriod) + 1);
  const latestPeriod = allPeriods.at(-1)!;
  const catl = domesticMaker("宁德时代");
  const filteredCompanies = domesticCompanies.filter(company => company.includes(companySearch.trim()));
  const setPreset = (count: number) => setSelectedCompanies(domesticCompanies.slice(0, count));
  const toggleCompany = (company: string) => setSelectedCompanies(current => current.includes(company) ? (current.length > 1 ? current.filter(item => item !== company) : current) : current.length < 10 ? [...current, company] : current);
  return <div className="maker-module"><div className="kpi-grid"><Kpi label={`${latestPeriod} 国内总装机`} value={domesticMakerData.totals[latestPeriod].toFixed(1)} unit="GWh" /><Kpi label="宁德时代国内装机" value={catl.volume[latestPeriod].toFixed(2)} unit="GWh" /><Kpi label="宁德时代国内市占率" value={catl.share[latestPeriod].toFixed(2)} unit="%" /></div>
    <div className="maker-control-card"><div className="maker-company-control"><header><b>企业标签</b><span>已选 {selectedCompanies.length}/10 家</span><button onClick={() => setPreset(6)}>头部6家</button><button onClick={() => setPreset(10)}>头部10家</button><input value={companySearch} onChange={event => setCompanySearch(event.target.value)} placeholder="搜索企业" /></header><div>{filteredCompanies.map(company => <button key={company} className={selectedCompanies.includes(company) ? "active" : ""} onClick={() => toggleCompany(company)}><i style={{ background: domesticColor(company) }} />{company}</button>)}</div></div>
    </div>
    <div className="maker-dashboard-grid"><Panel title="国内厂商月度市占率" source={`${shareStartPeriod}—${shareEndPeriod} · 最多同时10家`} className="maker-trend-panel maker-share-panel"><DomesticPeriodControl label="市占率" start={shareStartPeriod} end={shareEndPeriod} onChange={(start, end) => { setShareStartPeriod(start); setShareEndPeriod(end); }} /><DomesticShareLines periods={sharePeriods} companies={selectedCompanies} /></Panel><Panel title="单月市场结构" source="头部8家 + 其他" className="maker-trend-panel maker-pie-panel"><DomesticSharePie period={piePeriod} onPeriodChange={setPiePeriod} /></Panel><Panel title="国内厂商月度装机量" source={`${volumeStartPeriod}—${volumeEndPeriod} · GGII`} className="maker-trend-panel maker-volume-panel"><DomesticPeriodControl label="装机量" start={volumeStartPeriod} end={volumeEndPeriod} onChange={(start, end) => { setVolumeStartPeriod(start); setVolumeEndPeriod(end); }} /><DomesticVolumeBars periods={volumePeriods} companies={selectedCompanies} /></Panel></div>
  </div>;
}

const marketColor = (market: MarketScopeDataset, name: string) => {
  if (name === "其他") return "#cbd3dd";
  const names = market.companies.filter(company => company.name !== "其他").map(company => company.name);
  return domesticColors[Math.max(0, names.indexOf(name)) % domesticColors.length];
};
const marketCompany = (market: MarketScopeDataset, name: string) => market.companies.find(company => company.name === name)!;

function MarketLegend({ market, companies, period, showShare = false }: { market: MarketScopeDataset; companies: string[]; period: string; showShare?: boolean }) {
  return <div className="maker-legend">{companies.map(company => <span key={company}><i style={{ background: marketColor(market, company) }} />{company}{showShare && <b>{marketCompany(market, company).share[period].toFixed(1)}%</b>}</span>)}</div>;
}

function MarketVolumeBars({ market, periods, companies }: { market: MarketScopeDataset; periods: string[]; companies: string[] }) {
  const values = periods.flatMap(period => companies.map(company => marketCompany(market, company).volume[period] || 0));
  const maximum = Math.max(5, Math.ceil(Math.max(...values, 1) / 5) * 5);
  return <div className="maker-volume-chart"><MarketLegend market={market} companies={companies} period={periods.at(-1)!} /><div className="maker-chart-body">
    <div className="maker-axis">{[maximum, maximum * .75, maximum * .5, maximum * .25, 0].map(value => <span key={value}>{value.toFixed(0)}</span>)}</div>
    <div className="maker-bar-plot"><div className="maker-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ top: `${value}%` }} />)}</div>
      {periods.map(period => <div className="maker-bar-group" key={period}>{companies.map(company => {
        const value = marketCompany(market, company).volume[period] || 0;
        return <i key={company} title={`${period} · ${company}：${value.toFixed(2)} GWh`} style={{ height: `${Math.max(value > 0 ? 1 : 0, value / maximum * 100)}%`, background: marketColor(market, company) }} />;
      })}<span>{period.slice(2).replace("-", "/")}</span></div>)}
    </div>
  </div><small>单位：GWh · 鼠标悬浮查看精确值</small></div>;
}

function MarketShareLines({ market, periods, companies }: { market: MarketScopeDataset; periods: string[]; companies: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);
  const maximum = Math.max(10, Math.ceil(Math.max(...periods.flatMap(period => companies.map(company => marketCompany(market, company).share[period] || 0)), 1) / 10) * 10);
  const hoveredIndex = hoveredPeriod ? periods.indexOf(hoveredPeriod) : -1;
  const hoveredRows = hoveredPeriod ? companies.map(company => ({ company, share: marketCompany(market, company).share[hoveredPeriod], volume: marketCompany(market, company).volume[hoveredPeriod] })).sort((a, b) => b.share - a.share) : [];
  useEffect(() => {
    if (hoveredPeriod && !periods.includes(hoveredPeriod)) setHoveredPeriod(null);
  }, [hoveredPeriod, periods]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      companies.forEach(company => {
        context.beginPath();
        periods.forEach((period, index) => {
          const x = periods.length === 1 ? width / 2 : index / (periods.length - 1) * width;
          const y = height - marketCompany(market, company).share[period] / maximum * height;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.strokeStyle = marketColor(market, company);
        context.lineWidth = companies.indexOf(company) < 2 ? 2.6 : 1.8;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke();
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [market, periods, companies, maximum]);
  const axisValues = [maximum, maximum * .75, maximum * .5, maximum * .25, 0];
  return <div className="maker-share-chart"><MarketLegend market={market} companies={companies} period={periods.at(-1)!} showShare /><div className="maker-chart-body">
    <div className="maker-axis">{axisValues.map(value => <span key={value}>{value.toFixed(0)}%</span>)}</div>
    <div className="maker-line-plot" tabIndex={0} aria-label={`${market.label}厂商月度市占率，移动鼠标查看当月全部企业明细`} onPointerMove={event => { const bounds = event.currentTarget.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(bounds.width, 1))); const index = periods.length === 1 ? 0 : Math.round(ratio * (periods.length - 1)); setHoveredPeriod(periods[index]); }} onPointerLeave={() => setHoveredPeriod(null)} onFocus={() => setHoveredPeriod(current => current ?? periods.at(-1)!)} onBlur={() => setHoveredPeriod(null)} onKeyDown={event => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); const current = hoveredPeriod ? periods.indexOf(hoveredPeriod) : periods.length - 1; const next = Math.max(0, Math.min(periods.length - 1, current + (event.key === "ArrowRight" ? 1 : -1))); setHoveredPeriod(periods[next]); }}><div className="maker-gridlines">{[0, 25, 50, 75, 100].map(value => <i key={value} style={{ top: `${value}%` }} />)}</div><canvas ref={canvasRef} />
      {companies.flatMap(company => periods.map((period, index) => <i aria-hidden="true" className="maker-line-point" key={`${company}-${period}`} style={{ left: `${periods.length === 1 ? 50 : index / (periods.length - 1) * 100}%`, top: `${100 - marketCompany(market, company).share[period] / maximum * 100}%`, color: marketColor(market, company) }} />))}
      {hoveredPeriod && hoveredIndex >= 0 && <div className={`maker-hover-tooltip ${hoveredIndex >= periods.length * .62 ? "align-right" : ""}`} style={{ left: `${periods.length === 1 ? 50 : hoveredIndex / (periods.length - 1) * 100}%` }}><header><b>{hoveredPeriod.slice(0, 4)}年{hoveredPeriod.slice(5)}月</b><small>已选企业明细</small></header>{hoveredRows.map(row => <span key={row.company}><i style={{ background: marketColor(market, row.company) }} /><b>{row.company}</b><strong>{row.share.toFixed(2)}%</strong><em>{row.volume.toFixed(2)} GWh</em></span>)}</div>}
      <div className="maker-periods">{periods.map(period => <span key={period}>{period.slice(2).replace("-", "/")}</span>)}</div>
    </div>
  </div><small>市占率 · 鼠标悬浮查看当月全部明细</small></div>;
}

function MarketSharePie({ market, period, onPeriodChange }: { market: MarketScopeDataset; period: string; onPeriodChange: (period: string) => void }) {
  const ranked = market.companies.filter(company => company.name !== "其他").map(company => ({ name: company.name, volume: company.volume[period], share: company.share[period] })).sort((a, b) => b.share - a.share);
  const leaders = ranked.slice(0, 8);
  const leaderShare = leaders.reduce((sum, row) => sum + row.share, 0);
  const leaderVolume = leaders.reduce((sum, row) => sum + row.volume, 0);
  const slices = [...leaders, { name: "其他", share: Math.max(0, 100 - leaderShare), volume: Math.max(0, market.totals[period] - leaderVolume) }];
  let cursor = 0;
  const gradient = slices.map(slice => { const start = cursor; cursor += slice.share; return `${marketColor(market, slice.name)} ${start}% ${cursor}%`; }).join(",");
  return <div className="maker-pie"><label>结构月份<select value={period} onChange={event => onPeriodChange(event.target.value)}>{market.periods.map(value => <option value={value} key={value}>{value}</option>)}</select></label><div className="maker-pie-body"><div className="maker-donut" style={{ background: `conic-gradient(${gradient})` }}><i><b>{period.slice(0, 4)}</b><span>{period.slice(5)}月</span><small>{market.totals[period].toFixed(1)} GWh</small></i></div><div className="maker-pie-legend">{slices.map(slice => <span key={slice.name}><i style={{ background: marketColor(market, slice.name) }} /><b>{slice.name}</b><strong>{slice.share.toFixed(1)}%</strong><small>{slice.volume.toFixed(1)} GWh</small></span>)}</div></div></div>;
}

function GlobalMarketView({ scope }: { scope: MarketScope }) {
  const market = globalMarketsData.scopes[scope];
  const allPeriods = market.periods;
  const namedCompanies = market.companies.filter(company => company.name !== "其他").map(company => company.name);
  const [shareStartPeriod, setShareStartPeriod] = useState(allPeriods[0]);
  const [shareEndPeriod, setShareEndPeriod] = useState(allPeriods.at(-1)!);
  const [volumeStartPeriod, setVolumeStartPeriod] = useState(allPeriods[0]);
  const [volumeEndPeriod, setVolumeEndPeriod] = useState(allPeriods.at(-1)!);
  const [piePeriod, setPiePeriod] = useState(allPeriods.at(-1)!);
  const [selectedCompanies, setSelectedCompanies] = useState(namedCompanies.slice(0, Math.min(8, namedCompanies.length)));
  const [companySearch, setCompanySearch] = useState("");
  const sharePeriods = allPeriods.slice(allPeriods.indexOf(shareStartPeriod), allPeriods.indexOf(shareEndPeriod) + 1);
  const volumePeriods = allPeriods.slice(allPeriods.indexOf(volumeStartPeriod), allPeriods.indexOf(volumeEndPeriod) + 1);
  const latestPeriod = allPeriods.at(-1)!;
  const leader = market.companies.find(company => company.name !== "其他")!;
  const filteredCompanies = namedCompanies.filter(company => company.toLowerCase().includes(companySearch.trim().toLowerCase()));
  const setPreset = (count: number) => setSelectedCompanies(namedCompanies.slice(0, Math.min(count, namedCompanies.length)));
  const toggleCompany = (company: string) => setSelectedCompanies(current => current.includes(company) ? (current.length > 1 ? current.filter(item => item !== company) : current) : current.length < 10 ? [...current, company] : current);
  return <><div className="kpi-grid"><Kpi label={`${latestPeriod} ${market.label}总装机`} value={market.totals[latestPeriod].toFixed(1)} unit="GWh" /><Kpi label={`${leader.name}${market.label}装机`} value={leader.volume[latestPeriod].toFixed(1)} unit="GWh" /><Kpi label={`${leader.name}${market.label}市占率`} value={leader.share[latestPeriod].toFixed(2)} unit="%" /></div>
    <div className="maker-control-card"><div className="maker-company-control"><header><b>企业标签</b><span>已选 {selectedCompanies.length}/10 家</span><button onClick={() => setPreset(6)}>头部6家</button>{namedCompanies.length > 6 && <button onClick={() => setPreset(10)}>头部10家</button>}<input value={companySearch} onChange={event => setCompanySearch(event.target.value)} placeholder="搜索企业" /></header><div>{filteredCompanies.map(company => <button key={company} className={selectedCompanies.includes(company) ? "active" : ""} onClick={() => toggleCompany(company)}><i style={{ background: marketColor(market, company) }} />{company}</button>)}</div></div></div>
    <div className="maker-dashboard-grid"><Panel title={`${market.label}厂商月度市占率`} source={`${shareStartPeriod}—${shareEndPeriod} · SNE`} className="maker-trend-panel maker-share-panel"><DomesticPeriodControl label={`${market.label}市占率`} periods={allPeriods} start={shareStartPeriod} end={shareEndPeriod} onChange={(start, end) => { setShareStartPeriod(start); setShareEndPeriod(end); }} /><MarketShareLines market={market} periods={sharePeriods} companies={selectedCompanies} /></Panel><Panel title={`${market.label}单月市场结构`} source={`头部${Math.min(8, namedCompanies.length)}家 + 其他`} className="maker-trend-panel maker-pie-panel"><MarketSharePie market={market} period={piePeriod} onPeriodChange={setPiePeriod} /></Panel><Panel title={`${market.label}厂商月度装机量`} source={`${volumeStartPeriod}—${volumeEndPeriod} · SNE`} className="maker-trend-panel maker-volume-panel"><DomesticPeriodControl label={`${market.label}装机量`} periods={allPeriods} start={volumeStartPeriod} end={volumeEndPeriod} onChange={(start, end) => { setVolumeStartPeriod(start); setVolumeEndPeriod(end); }} /><MarketVolumeBars market={market} periods={volumePeriods} companies={selectedCompanies} /></Panel></div>
  </>;
}

function Global() {
  const [scope, setScope] = useState<MarketScope>("global");
  return <div className="global-module"><div className="market-scope-tabs" role="tablist" aria-label="选择全球或海外口径"><button type="button" role="tab" aria-selected={scope === "global"} className={scope === "global" ? "active" : ""} onClick={() => setScope("global")}><b>全球市场</b><span>包含中国市场</span></button><button type="button" role="tab" aria-selected={scope === "overseas"} className={scope === "overseas" ? "active" : ""} onClick={() => setScope("overseas")}><b>海外市场</b><span>剔除中国市场</span></button></div><GlobalMarketView key={scope} scope={scope} /></div>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("domestic");
  const current = useMemo(() => tabs.find(t => t.key === tab)!, [tab]);
  return <div className="installation-scope"><div className="app-frame">
    <aside className="side-panel">
      <div className="side-brand"><span>东吴</span><div><b>东吴电新</b><small>NEW ENERGY DATA</small></div></div>
      <div className="side-label">DATABASE MODULE</div>
      <div className="side-nav">{tabs.map((item, index) => <button type="button" className={tab === item.key ? "active" : ""} key={item.key} onClick={() => setTab(item.key)}><i>{String(index + 1).padStart(2, "0")}</i><span><b>{item.name}</b><small>{item.scope}</small></span></button>)}</div>
      <div className="side-current"><span>CURRENT DATABASE</span><b>动力电池装机</b><small>NO. 5000</small></div>
    </aside>
    <div className="workspace">
      <main className={`${tab}-main`}><div className="page-head"><div><h1>{current.name}</h1></div></div>{tab === "domestic" && <Domestic />}{tab === "chemistry" && <Chemistry />}{tab === "chinaRank" && <ChinaRank />}{tab === "global" && <Global />}</main>
      <footer><span>DONGWU NEW ENERGY · BATTERY DATABASE</span><span>2026年为1—5月累计，其余年份为全年累计</span></footer>
    </div>
  </div></div>;
}
