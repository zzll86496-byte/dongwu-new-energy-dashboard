"use client";

import { useEffect, useMemo, useState } from "react";
import { dashboardData } from "./dashboard-data";
import { exportChartWorkbook } from "./excel-export";
import { ResearchPageHeader } from "./ResearchPageHeader";
import "./research-template.css";

type Point = [string, number | null];
type Entity = { name: string; values: Point[] };
type DashboardData = {
  source: string;
  price: { categories: { name: string; series: [string, number | null, number | null, number | null][] }[] };
  sectorProduction: { year: string; values: Point[] }[];
  production: { months: string[]; companies: Entity[]; total: Point[] };
  capacity: { months: string[]; companies: Entity[]; total: Point[] };
  utilization: { months: string[]; companies: Entity[]; average: Point[] };
  shipments: { months: string[]; companies: Entity[]; total: Point[] };
};

const data = dashboardData as unknown as DashboardData;
type Module = "总览" | "价格" | "产能" | "产量" | "开工率" | "出货量";
type ChartLine = { name: string; points: Point[]; color: string };

const COLORS = ["#173f62", "#a18b4e", "#c17632", "#4e7b65"];
const lastNumber = (points: Point[]) => [...points].reverse().find((point) => point[1] !== null)?.[1] ?? 0;
const sum = (points: Point[], prefix?: string) => points.reduce((total, point) => total + ((prefix && !point[0].startsWith(prefix)) || point[1] === null ? 0 : point[1]), 0);
const fmt = (value: number, digits = 1) => value.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const toMom = (points: Point[]): Point[] => points.map((point, index) => {
  const previous = index > 0 ? points[index - 1][1] : null;
  return [point[0], point[1] === null || previous === null || previous === 0 ? null : (point[1] / previous - 1) * 100];
});

function TrendChart({ title, lines, unit, height = 270 }: { title: string; lines: ChartLine[]; unit: string; height?: number }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const allLabels = lines[0]?.points.map((point) => point[0]) ?? [];
  const [rangeStart, setRangeStart] = useState(allLabels[0] ?? "");
  const [rangeEnd, setRangeEnd] = useState(allLabels.at(-1) ?? "");
  useEffect(() => {
    if (!allLabels.includes(rangeStart)) setRangeStart(allLabels[0] ?? "");
    if (!allLabels.includes(rangeEnd)) setRangeEnd(allLabels.at(-1) ?? "");
  }, [allLabels.join("|"), rangeStart, rangeEnd]);
  const startIndex = Math.max(0, allLabels.indexOf(rangeStart));
  const endIndex = Math.max(0, allLabels.indexOf(rangeEnd));
  const labels = allLabels.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
  const aligned = lines.map((line) => {
    const map = new Map(line.points);
    return labels.map((label) => map.get(label) ?? null);
  });
  const values = aligned.flat().filter((value): value is number => value !== null && Number.isFinite(value));
  const rawMin = Math.min(...values, 0);
  const rawMax = Math.max(...values, 1);
  const padding = Math.max((rawMax - rawMin) * 0.08, rawMax * 0.02, 0.01);
  const min = unit === "%" ? rawMin - padding : Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  const width = 900;
  const top = 18;
  const bottom = 34;
  const left = 48;
  const right = 18;
  const x = (index: number) => left + (index / Math.max(labels.length - 1, 1)) * (width - left - right);
  const y = (value: number) => top + ((max - value) / Math.max(max - min, 0.01)) * (height - top - bottom);
  const pathFor = (lineIndex: number) => {
    const valuesForLine = aligned[lineIndex];
    const stride = Math.max(1, Math.floor(valuesForLine.length / 240));
    return valuesForLine.map((value, index) => ({ value, index })).filter((item) => item.value !== null && (item.index % stride === 0 || item.index === valuesForLine.length - 1)).map((item, order) => `${order === 0 ? "M" : "L"}${x(item.index).toFixed(1)},${y(item.value as number).toFixed(1)}`).join(" ");
  };
  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const relative = ((event.clientX - box.left) / box.width) * width;
    const index = Math.round(((relative - left) / (width - left - right)) * Math.max(labels.length - 1, 0));
    setHoverIndex(Math.max(0, Math.min(labels.length - 1, index)));
  };
  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    const isPercent = unit === "%";
    const normalize = (value: number | null) => value === null ? null : isPercent ? value / 100 : value;
    try {
      await exportChartWorkbook({
        title, unit,
        chart: { type: "line", categories: labels, series: lines.map((line) => ({ name: line.name, color: line.color, values: line.points.map((point) => normalize(point[1])) })), percent: isPercent },
        headers: ["月份", ...lines.map((line) => line.name)],
        rows: labels.map((label, index) => [label, ...aligned.map((values) => normalize(values[index]))]),
        percentColumns: isPercent ? lines.map((_, index) => index + 1) : [],
        fileName: title,
      });
    } catch (error) { window.alert(error instanceof Error ? error.message : "Excel导出失败，请重试"); }
    finally { setExporting(false); }
  };

  return (
    <div className="chart-wrap">
      <button type="button" className="database-chart-export" disabled={exporting} onClick={exportExcel}>{exporting ? "生成中" : "导出Excel"}</button>
      <div className="database-chart-range"><select aria-label={`${title}起始月份`} value={rangeStart} onChange={(event)=>setRangeStart(event.target.value)}>{allLabels.map((label)=><option key={label} value={label}>{label}</option>)}</select><i>—</i><select aria-label={`${title}结束月份`} value={rangeEnd} onChange={(event)=>setRangeEnd(event.target.value)}>{allLabels.map((label)=><option key={label} value={label}>{label}</option>)}</select></div>
      <div className="chart-legend">{lines.map((line) => <span key={line.name}><i style={{ background: line.color }} />{line.name}</span>)}</div>
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} onMouseMove={onMove} onMouseLeave={() => setHoverIndex(null)} role="img" aria-label="交互趋势图">
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = max - (tick / 4) * (max - min);
          const py = y(value);
          return <g key={tick}><line x1={left} x2={width - right} y1={py} y2={py} /><text x={left - 8} y={py + 3} textAnchor="end">{fmt(value, unit === "%" ? 0 : 1)}</text></g>;
        })}
        {min < 0 && max > 0 && <line className="zero-baseline" x1={left} x2={width - right} y1={y(0)} y2={y(0)} />}
        {lines.map((line, index) => <path key={line.name} d={pathFor(index)} fill="none" stroke={line.color} strokeWidth="2.6" />)}
        {labels.map((label, index) => index === 0 || index === labels.length - 1 || index % Math.max(1, Math.floor(labels.length / 5)) === 0 ? <text key={label} x={x(index)} y={height - 7} textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}>{label}</text> : null)}
        {hoverIndex !== null && labels[hoverIndex] && <g className="chart-hover"><line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={top} y2={height - bottom} />{aligned.map((values, lineIndex) => values[hoverIndex] !== null ? <circle key={lines[lineIndex].name} cx={x(hoverIndex)} cy={y(values[hoverIndex] as number)} r="4" fill={lines[lineIndex].color} /> : null)}</g>}
      </svg>
      {hoverIndex !== null && labels[hoverIndex] && <div className="chart-tooltip"><b>{labels[hoverIndex]}</b>{lines.map((line, index) => <span key={line.name}><i style={{ background: line.color }} />{line.name}<strong>{aligned[index][hoverIndex] === null ? "—" : `${fmt(aligned[index][hoverIndex] as number, unit === "%" ? 1 : 2)} ${unit}`}</strong></span>)}</div>}
    </div>
  );
}

function PanelTitle({ index, title, sub }: { index: string; title: string; sub?: string }) {
  return <div className="panel-title"><div><span>{index}</span><strong>{title}</strong></div>{sub && <small>{sub}</small>}</div>;
}

function OverviewMetricChart({ title, points, color }: { title: string; points: Point[]; color: string }) {
  const [mode, setMode] = useState<"total" | "mom">("total");
  const momPoints = useMemo(() => toMom(points), [points]);
  const latestMom = lastNumber(momPoints);

  return <div className="overview-chart-card">
    <div className="overview-chart-head">
      <div><h3>{title}</h3><p>最新环比 <strong className={latestMom >= 0 ? "positive" : "negative"}>{latestMom >= 0 ? "+" : ""}{fmt(latestMom, 1)}%</strong></p></div>
      <div className="chart-mode" aria-label={`${title}数据口径`}>
        <button className={mode === "total" ? "active" : ""} aria-pressed={mode === "total"} onClick={() => setMode("total")}>总量</button>
        <button className={mode === "mom" ? "active" : ""} aria-pressed={mode === "mom"} onClick={() => setMode("mom")}>环比</button>
      </div>
    </div>
    <TrendChart title={`${title}_${mode === "total" ? "总量" : "环比"}`} unit={mode === "total" ? "GWh" : "%"} height={300} lines={[{ name: mode === "total" ? "全球总量" : "全球环比", color, points: mode === "total" ? points : momPoints }]} />
  </div>;
}

function Kpi({ label, value, unit, note, active, onClick }: { label: string; value: string; unit: string; note: string; active?: boolean; onClick: () => void }) {
  return <button className={`kpi${active ? " active" : ""}`} onClick={onClick}><small>{label}</small><div><strong>{value}</strong><span>{unit}</span></div><p>{note}</p></button>;
}

function Ranking({ title, entities, selected, onSelect, unit, percent = false }: { title: string; entities: Entity[]; selected: string; onSelect: (name: string) => void; unit: string; percent?: boolean }) {
  const [exporting, setExporting] = useState(false);
  const ranked = [...entities].map((entity) => ({ ...entity, latest: lastNumber(entity.values) })).sort((a, b) => b.latest - a.latest);
  const max = ranked[0]?.latest || 1;
  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    const normalize = (value:number) => percent ? value / 100 : value;
    try { await exportChartWorkbook({ title, unit, chart:{ type:"bar", categories:ranked.map((entity)=>entity.name), series:[{ name:title, color:COLORS[0], values:ranked.map((entity)=>normalize(entity.latest)) }], percent }, headers:["企业","最新值"], rows:ranked.map((entity)=>[entity.name,normalize(entity.latest)]), percentColumns:percent?[1]:[], fileName:title }); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Excel导出失败，请重试"); }
    finally { setExporting(false); }
  };
  return <div className="ranking-export-wrap"><button type="button" className="ranking-chart-export" disabled={exporting} onClick={exportExcel}>{exporting?"生成中":"导出Excel"}</button><div className="ranking">{ranked.map((entity, index) => <button key={entity.name} className={selected === entity.name ? "selected" : ""} onClick={() => onSelect(entity.name)}><em>{String(index + 1).padStart(2, "0")}</em><span>{entity.name}</span><i><b style={{ width: `${Math.max(2, entity.latest / max * 100)}%` }} /></i><strong>{fmt(entity.latest, percent ? 1 : 2)}{percent ? "%" : ""}</strong></button>)}</div></div>;
}

function EntityTable({ entities, selected, onSelect, unit, percent = false, kind }: { entities: Entity[]; selected: string; onSelect: (name: string) => void; unit: string; percent?: boolean; kind: "standard" | "shipment" }) {
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>企业</th>{kind === "shipment" ? <><th>2024全年</th><th>2025全年</th><th>2026累计</th></> : <><th>2024年末</th><th>2025年末</th><th>最新值</th></>}<th>单位</th></tr></thead><tbody>{entities.map((entity) => {
    const v2024 = kind === "shipment" ? sum(entity.values, "2024") : entity.values.find((point) => point[0] === "2024-12")?.[1] ?? 0;
    const v2025 = kind === "shipment" ? sum(entity.values, "2025") : entity.values.find((point) => point[0] === "2025-12")?.[1] ?? 0;
    const latest = kind === "shipment" ? sum(entity.values, "2026") : lastNumber(entity.values);
    const display = (value: number) => fmt(value, percent ? 1 : 2);
    return <tr key={entity.name} className={selected === entity.name ? "selected" : ""} onClick={() => onSelect(entity.name)}><td>{entity.name}</td><td>{display(v2024 || 0)}</td><td>{display(v2025 || 0)}</td><td>{display(latest)}</td><td>{percent ? "%" : unit}</td></tr>;
  })}</tbody></table></div>;
}

export default function Page() {
  const [active, setActive] = useState<Module>("总览");
  const [priceName, setPriceName] = useState(data.price.categories[0].name);
  const [productionName, setProductionName] = useState(data.production.companies[0].name);
  const [capacityName, setCapacityName] = useState(data.capacity.companies[0].name);
  const [utilizationName, setUtilizationName] = useState(data.utilization.companies[0].name);
  const [shipmentName, setShipmentName] = useState(data.shipments.companies[0].name);
  const modules: { name: Module; meta: string }[] = [
    { name: "总览", meta: "全局概览" }, { name: "价格", meta: "11个品类" }, { name: "产能", meta: "21家企业" },
    { name: "产量", meta: "全球产量" }, { name: "开工率", meta: "16家企业" }, { name: "出货量", meta: "21家企业" },
  ];
  const selectedPrice = data.price.categories.find((item) => item.name === priceName) ?? data.price.categories[0];
  const selectedProduction = data.production.companies.find((item) => item.name === productionName) ?? data.production.companies[0];
  const selectedCapacity = data.capacity.companies.find((item) => item.name === capacityName) ?? data.capacity.companies[0];
  const selectedUtilization = data.utilization.companies.find((item) => item.name === utilizationName) ?? data.utilization.companies[0];
  const selectedShipment = data.shipments.companies.find((item) => item.name === shipmentName) ?? data.shipments.companies[0];
  const priceLatest = selectedPrice.series[selectedPrice.series.length - 1];
  const latestProduction = lastNumber(data.production.total);
  const latestCapacity = lastNumber(data.capacity.total);
  const latestUtilization = lastNumber(data.utilization.average) * 100;
  const latestShipment = lastNumber(data.shipments.total);
  const headerDetails: Record<Module, { context: string; updated: string }> = {
    "总览": { context: "行业核心趋势 · 2026-06 · GWh", updated: "2026-06" },
    "价格": { context: `储能电芯价格 · ${priceLatest?.[0]?.slice(0, 7) ?? "—"} · 元/Wh`, updated: priceLatest?.[0]?.slice(0, 7) ?? "—" },
    "产能": { context: `企业产能 · ${data.capacity.months.at(-1) ?? "—"} · GWh/年`, updated: data.capacity.months.at(-1) ?? "—" },
    "产量": { context: `企业产量 · ${data.production.months.at(-1) ?? "—"} · GWh`, updated: data.production.months.at(-1) ?? "—" },
    "开工率": { context: `行业开工率 · ${data.utilization.months.at(-1) ?? "—"} · %`, updated: data.utilization.months.at(-1) ?? "—" },
    "出货量": { context: `企业出货量 · ${data.shipments.months.at(-1) ?? "—"} · GWh`, updated: data.shipments.months.at(-1) ?? "—" },
  };

  const renderDetail = () => {
    if (active === "价格") return <>
      <section className="panel primary-panel"><PanelTitle index="01" title={`${selectedPrice.name}价格趋势`} sub="最低 / 均价 / 最高 · 鼠标移动查看每期数据" /><TrendChart title={`${selectedPrice.name}价格趋势`} unit="元/Wh" lines={[
        { name: "最低价", color: "#6d899c", points: selectedPrice.series.map((p) => [p[0], p[1]]) },
        { name: "均价", color: "#a18b4e", points: selectedPrice.series.map((p) => [p[0], p[3]]) },
        { name: "最高价", color: "#c17632", points: selectedPrice.series.map((p) => [p[0], p[2]]) },
      ]} /></section>
      <section className="panel side-panel"><PanelTitle index="02" title="价格品类" sub="全部 11 类" /><div className="category-list">{data.price.categories.map((item) => { const latest = item.series[item.series.length - 1]; return <button key={item.name} className={priceName === item.name ? "selected" : ""} onClick={() => setPriceName(item.name)}><span>{item.name}</span><strong>{latest?.[3]?.toFixed(2) ?? "—"}</strong><small>元/Wh</small></button>; })}</div></section>
      <section className="panel table-panel"><PanelTitle index="03" title="全部品类最新价格" sub={`更新至 ${priceLatest?.[0] ?? "—"}`} /><div className="data-table-wrap"><table className="data-table"><thead><tr><th>电芯品类</th><th>最低价</th><th>均价</th><th>最高价</th><th>历史数据点</th></tr></thead><tbody>{data.price.categories.map((item) => { const latest = item.series[item.series.length - 1]; return <tr key={item.name} className={priceName === item.name ? "selected" : ""} onClick={() => setPriceName(item.name)}><td>{item.name}</td><td>{latest?.[1]?.toFixed(2) ?? "—"}</td><td>{latest?.[3]?.toFixed(2) ?? "—"}</td><td>{latest?.[2]?.toFixed(2) ?? "—"}</td><td>{item.series.length.toLocaleString("zh-CN")}</td></tr>; })}</tbody></table></div></section>
    </>;

    if (active === "产量") return <>
      <section className="panel primary-panel"><PanelTitle index="01" title="全球储能电池产量" sub={`叠加查看：${selectedProduction.name}`} /><TrendChart title={`全球储能电池产量_${selectedProduction.name}`} unit="GWh" lines={[{ name: "全球合计", color: COLORS[0], points: data.production.total }, { name: selectedProduction.name, color: COLORS[1], points: selectedProduction.values }]} /></section>
      <section className="panel side-panel"><PanelTitle index="02" title="企业产量排行" sub="最新月 · 点击联动" /><Ranking title="企业产量排行" entities={data.production.companies} selected={productionName} onSelect={setProductionName} unit="GWh" /></section>
      <section className="panel table-panel"><PanelTitle index="03" title="全部企业产量数据" sub="覆盖2024年1月至2026年6月" /><EntityTable entities={data.production.companies} selected={productionName} onSelect={setProductionName} unit="GWh" kind="standard" /></section>
    </>;

    if (active === "产能") return <>
      <section className="panel primary-panel"><PanelTitle index="01" title="全球储能电池产能" sub={`叠加查看：${selectedCapacity.name}`} /><TrendChart title={`全球储能电池产能_${selectedCapacity.name}`} unit="GWh/年" lines={[{ name: "全球合计", color: COLORS[0], points: data.capacity.total }, { name: selectedCapacity.name, color: COLORS[2], points: selectedCapacity.values }]} /></section>
      <section className="panel side-panel"><PanelTitle index="02" title="企业产能排行" sub="最新月 · 点击联动" /><Ranking title="企业产能排行" entities={data.capacity.companies} selected={capacityName} onSelect={setCapacityName} unit="GWh/年" /></section>
      <section className="panel table-panel"><PanelTitle index="03" title="全部企业产能数据" sub="全球口径 · GWh/年" /><EntityTable entities={data.capacity.companies} selected={capacityName} onSelect={setCapacityName} unit="GWh/年" kind="standard" /></section>
    </>;

    if (active === "开工率") return <>
      <section className="panel primary-panel"><PanelTitle index="01" title="中国储能电池开工率" sub={`行业平均与 ${selectedUtilization.name}`} /><TrendChart title={`中国储能电池开工率_${selectedUtilization.name}`} unit="%" lines={[{ name: "行业平均", color: COLORS[0], points: data.utilization.average.map((p) => [p[0], p[1] === null ? null : p[1] * 100]) }, { name: selectedUtilization.name, color: COLORS[3], points: selectedUtilization.values }]} /></section>
      <section className="panel side-panel"><PanelTitle index="02" title="企业开工率排行" sub="最新月 · 点击联动" /><Ranking title="企业开工率排行" entities={data.utilization.companies} selected={utilizationName} onSelect={setUtilizationName} unit="%" percent /></section>
      <section className="panel table-panel"><PanelTitle index="03" title="全部企业开工率" sub="覆盖2024年1月至2026年6月" /><EntityTable entities={data.utilization.companies} selected={utilizationName} onSelect={setUtilizationName} unit="%" percent kind="standard" /></section>
    </>;

    if (active === "出货量") return <>
      <section className="panel primary-panel"><PanelTitle index="01" title="全球储能电池出货量" sub={`行业合计与 ${selectedShipment.name}`} /><TrendChart title={`全球储能电池出货量_${selectedShipment.name}`} unit="GWh" lines={[{ name: "全球合计", color: COLORS[0], points: data.shipments.total }, { name: selectedShipment.name, color: COLORS[1], points: selectedShipment.values }]} /></section>
      <section className="panel side-panel"><PanelTitle index="02" title="企业出货排行" sub="最新月 · 点击联动" /><Ranking title="企业出货排行" entities={data.shipments.companies} selected={shipmentName} onSelect={setShipmentName} unit="GWh" /></section>
      <section className="panel table-panel"><PanelTitle index="03" title="全部企业出货量" sub="2024年1月至2026年6月 · 全部21家" /><EntityTable entities={data.shipments.companies} selected={shipmentName} onSelect={setShipmentName} unit="GWh" kind="shipment" /></section>
    </>;

    return <>
      <section className="panel overview-main"><PanelTitle index="01" title="行业核心趋势" sub="全球月度总量与环比趋势" /><div className="overview-chart-grid"><OverviewMetricChart title="全球月度产量" points={data.production.total} color={COLORS[0]} /><OverviewMetricChart title="全球月度出货量" points={data.shipments.total} color={COLORS[1]} /></div></section>
    </>;
  };

  return <main className="app-shell database-template">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="返回东吴电新数据库首页"><img src="/soochow-securities.png" width="218" height="48" alt="东吴证券 Soochow Securities" /></a>
      <p className="side-label">数据模块</p>
      <nav>{modules.map((module, index) => <button key={module.name} className={active === module.name ? "active" : ""} onClick={() => setActive(module.name)}><i className={`dot dot-${index}`} /><span><b>{module.name}</b><small>{module.meta}</small></span><em>›</em></button>)}</nav>
      <div className="side-source"><strong>数据口径</strong><p>价格：日度最低/最高/均价</p><p>产能、产量、开工率：月度</p><p>出货量：全球企业月度</p></div>
      <div className="side-bottom">数据来源<br /><b>鑫椤锂电</b></div>
    </aside>
    <section className="workspace">
      <ResearchPageHeader
        title="储能电池产业链数据库"
        context={`${active} · ${headerDetails[active].context}`}
        updated={headerDetails[active].updated}
      />
      <section className="kpi-row">
        <Kpi active={active === "价格"} onClick={() => setActive("价格")} label="储能电芯均价" value={fmt(priceLatest?.[3] ?? 0, 2)} unit="元/Wh" note={`${data.price.categories.length}个价格品类`} />
        <Kpi active={active === "产量"} onClick={() => setActive("产量")} label="最新全球月产量" value={fmt(latestProduction, 1)} unit="GWh" note={`${data.production.companies.length}家企业`} />
        <Kpi active={active === "产能"} onClick={() => setActive("产能")} label="最新全球总产能" value={fmt(latestCapacity, 1)} unit="GWh/年" note={`${data.capacity.companies.length}家企业`} />
        <Kpi active={active === "开工率"} onClick={() => setActive("开工率")} label="行业平均开工率" value={fmt(latestUtilization, 1)} unit="%" note={`${data.utilization.companies.length}家企业`} />
        <Kpi active={active === "出货量"} onClick={() => setActive("出货量")} label="最新全球月出货量" value={fmt(latestShipment, 1)} unit="GWh" note="2026年6月" />
      </section>
      <section className={`content-grid module-${active}`}>{renderDetail()}</section>
      <footer>数据来源：{data.source} · 鼠标悬停趋势图查看历史数据 · 点击排行或表格切换企业</footer>
    </section>
  </main>;
}
