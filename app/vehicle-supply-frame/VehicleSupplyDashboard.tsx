"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import history from "./history.json";
import { exportChartWorkbook, type ChartWorkbookSpec } from "../excel-export";

type PageKey = "overview" | "relations" | "company";
type TrendRow = { period: string; totalGwh: number; units: number; shares: Record<string, number> };
type MetricSet = { totalGwh: number; mom: number; yoy: number; top1: number; cr3: number; batteryCount: number; carCount: number };
type BatteryRank = { name: string; value: number; gwh: number };
type CarRank = { name: string; value: number; gwh: number };
type CategoryRow = { name: string; value: number };
type HeatmapRow = { car: string; gwh: number; values: number[] };
type ChangeRow = { car: string; battery: string; previous: number; current: number; change: number; gwh: number };
type DetailRow = { car: string; model: string; battery: string; chemistry: string; units: number; gwh: number };
type Snapshot = {
  metrics: MetricSet;
  batteryNames: string[];
  topBatteries: BatteryRank[];
  topCars: CarRank[];
  categories: CategoryRow[];
  heatmap: HeatmapRow[];
  changes: ChangeRow[];
  latestRows: DetailRow[];
  hasYoy: boolean;
};
type CompanyMonth = { period: string; totalGwh: number; suppliers: Record<string, number> };
type Company = { name: string; monthly: CompanyMonth[] };
type HistoryView = { trend: TrendRow[]; snapshots: Record<string, Snapshot>; companies: Company[] };
type HistoryData = {
  sourceRows: number;
  firstPeriod: string;
  lastPeriod: string;
  periods: string[];
  categoryOptions: string[];
  views: Record<string, HistoryView>;
};

const historyData = history as HistoryData;

const COLORS = ["#123a63", "#b3a15a", "#778694", "#ee792d", "#8f9092", "#c9ced2"];
const AREA_COLORS = ["#123a63", "#b3a15a", "#778694", "#8f9092", "#c9ced2", "#dfe3e6"];
const NAV: { key: PageKey; label: string; note: string }[] = [
  { key: "overview", label: "行业总览", note: "规模与格局" },
  { key: "relations", label: "供应关系", note: "车企 × 电池" },
  { key: "company", label: "单车企详情", note: "供应结构" },
];

function fmt(value: number, digits = 1) {
  return value.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function periodText(period: string) {
  const [year, month] = period.split("-");
  return `${year}年${Number(month)}月`;
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${fmt(value, 1)}`;
}

const ratio = (value: number | null | undefined) => typeof value === "number" ? value / 100 : 0;

function useChartExporter() {
  const [exporting, setExporting] = useState("");
  const runExport = async (key: string, spec: ChartWorkbookSpec) => {
    if (exporting) return;
    setExporting(key);
    try {
      await exportChartWorkbook(spec);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Excel导出失败，请重试");
    } finally {
      setExporting("");
    }
  };
  return { exporting, runExport };
}

function MetricCard({ label, value, unit, change, active }: { label: string; value: string; unit?: string; change?: string; active?: boolean }) {
  return (
    <div className={`metric-card ${active ? "active" : ""}`}>
      <span className="metric-label">{label}</span>
      <div className="metric-number">{value} <small>{unit}</small></div>
      {change && <span className={`metric-change ${change.startsWith("-") ? "down" : ""}`}>{change}</span>}
    </div>
  );
}

function Card({ title, hint, className = "", exportBusy = false, onExport, children }: { title: string; hint?: string; className?: string; exportBusy?: boolean; onExport?: () => void; children: React.ReactNode }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div><h2>{title}</h2>{hint && <p>{hint}</p>}</div>
        {onExport && <button type="button" className="chart-export-btn" aria-label={`导出${title}到Excel`} disabled={exportBusy} onClick={onExport}>{exportBusy ? "生成中" : "导出Excel"}</button>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function LineChart({ rows, batteryNames = [], mode = "total", height = 260 }: { rows: TrendRow[]; batteryNames?: string[]; mode?: "total" | "share"; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      const w = rect.width, h = rect.height;
      const pad = { l: 45, r: 18, t: 22, b: 38 };
      const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
      ctx.font = "11px Arial";
      ctx.strokeStyle = "#dce4e9";
      ctx.fillStyle = "#82909b";
      ctx.lineWidth = 1;
      const series = mode === "total"
        ? [{ name: "总装机", color: COLORS[0], values: rows.map(r => r.totalGwh) }]
        : batteryNames.slice(0, 5).map((name, i) => ({ name, color: COLORS[i], values: rows.map(r => r.shares[name] || 0) }));
      const max = Math.max(...series.flatMap(s => s.values)) * 1.15 || 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + ch * i / 4;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
        ctx.fillText(fmt(max * (1 - i / 4), 0), 5, y + 4);
      }
      const labelStep = Math.max(1, Math.ceil(rows.length / 7));
      rows.forEach((r, i) => {
        const x = pad.l + cw * i / Math.max(1, rows.length - 1);
        if (i % labelStep === 0 || i === rows.length - 1) {
          ctx.textAlign = "center";
          ctx.fillText(r.period.replace("-", "."), x, h - 13);
        }
      });
      series.forEach(s => {
        ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.name === "总装机" || s.name === "宁德时代" ? 3 : 2;
        ctx.beginPath();
        s.values.forEach((v, i) => {
          const x = pad.l + cw * i / Math.max(1, rows.length - 1);
          const y = pad.t + ch - v / max * ch;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        s.values.forEach((v, i) => {
          const x = pad.l + cw * i / Math.max(1, rows.length - 1);
          const y = pad.t + ch - v / max * ch;
          ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
        });
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [rows, batteryNames, mode]);
  return <canvas ref={ref} className="line-canvas" style={{ height }} aria-label={mode === "total" ? "月度总装机趋势" : "主要电池企业份额趋势"} />;
}

function Legend({ names }: { names: string[] }) {
  return <div className="legend">{names.map((name, i) => <span key={name}><i style={{ background: COLORS[i % COLORS.length] }} />{name}</span>)}</div>;
}

function Donut({ items, center, unit }: { items: { name: string; value: number }[]; center: string; unit: string }) {
  let cursor = 0;
  const stops = items.slice(0, 5).map((x, i) => {
    const start = cursor; cursor += x.value;
    return `${COLORS[i]} ${start}% ${cursor}%`;
  });
  if (cursor < 100) stops.push(`#e4e8eb ${cursor}% 100%`);
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${stops.join(",")})` }}>
        <div><strong>{center}</strong><span>{unit}</span></div>
      </div>
      <div className="donut-list">{items.slice(0, 5).map((x, i) => <div key={x.name}><span><i style={{ background: COLORS[i] }} />{x.name}</span><b>{fmt(x.value)}%</b></div>)}</div>
    </div>
  );
}

function SupplierEvolutionChart({ monthly, supplierNames }: { monthly: CompanyMonth[]; supplierNames: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const selectedNames = supplierNames.slice(0, 5);
  const supplierValues = selectedNames.map(name => monthly.map(item => item.suppliers[name] || 0));
  const otherValues = monthly.map((item, index) => item.totalGwh > 0
    ? Math.max(0, 100 - supplierValues.reduce((sum, series) => sum + series[index], 0))
    : 0);
  const hasOther = otherValues.some(value => value > 0.05);
  const lineItems = [
    ...selectedNames.map((name, index) => ({ name, color: AREA_COLORS[index % AREA_COLORS.length], values: supplierValues[index] })),
    ...(hasOther ? [{ name: "其他", color: AREA_COLORS[selectedNames.length % AREA_COLORS.length], values: otherValues }] : []),
  ];

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      const w = rect.width, h = rect.height;
      const pad = { l: 54, r: 18, t: 42, b: 38 };
      const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
      ctx.clearRect(0, 0, w, h);
      ctx.font = "11px Arial";
      ctx.lineWidth = 1;
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + ch * i / 4;
        ctx.strokeStyle = "#dce4e9";
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
        ctx.fillStyle = "#82909b";
        ctx.textAlign = "right";
        ctx.fillText(`${100 - i * 25}%`, pad.l - 8, y);
      }
      lineItems.forEach((item) => {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        item.values.forEach((value, index) => {
          const x = pad.l + cw * index / Math.max(1, monthly.length - 1);
          const y = pad.t + ch - value / 100 * ch;
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        item.values.forEach((value, index) => {
          const x = pad.l + cw * index / Math.max(1, monthly.length - 1);
          const y = pad.t + ch - value / 100 * ch;
          ctx.beginPath();
          ctx.arc(x, y, index === hoverIndex ? 4 : 2.4, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.lineWidth = index === hoverIndex ? 2.4 : 1.6;
          ctx.strokeStyle = item.color;
          ctx.stroke();
        });
      });

      if (hoverIndex !== null && monthly[hoverIndex]) {
        const x = pad.l + cw * hoverIndex / Math.max(1, monthly.length - 1);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "#8da0ad";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, pad.t);
        ctx.lineTo(x, pad.t + ch);
        ctx.stroke();
        ctx.restore();
      }

      const labelStep = Math.max(1, Math.ceil(monthly.length / 7));
      monthly.forEach((item, index) => {
        if (index % labelStep !== 0 && index !== monthly.length - 1) return;
        const x = pad.l + cw * index / Math.max(1, monthly.length - 1);
        ctx.fillStyle = "#7b8993";
        ctx.textAlign = "center";
        ctx.fillText(item.period, x, h - 16);
      });
      ctx.fillStyle = "#6f7f8b";
      ctx.textAlign = "left";
      ctx.fillText("份额", 7, 17);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [monthly, supplierNames, hoverIndex]);

  const updateHover = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (monthly.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const chartLeft = 54;
    const chartRight = 18;
    const chartWidth = Math.max(1, rect.width - chartLeft - chartRight);
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - chartLeft) / chartWidth));
    setHoverIndex(Math.round(ratio * Math.max(0, monthly.length - 1)));
  };
  const tooltipTransform = hoverIndex !== null && hoverIndex < 2
    ? "translateX(0)"
    : hoverIndex !== null && hoverIndex > monthly.length - 3
      ? "translateX(-100%)"
      : "translateX(-50%)";
  const tooltipLeft = hoverIndex === null || monthly.length <= 1 ? 50 : 4 + hoverIndex / (monthly.length - 1) * 92;

  return <div className="supplier-evolution">
    <div className="legend">{lineItems.map(item => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div>
    <canvas
      ref={ref}
      className="line-canvas supplier-line-canvas"
      style={{ height: 330 }}
      aria-label="供应商份额折线趋势图"
      onMouseMove={updateHover}
      onMouseLeave={() => setHoverIndex(null)}
    />
    {hoverIndex !== null && monthly[hoverIndex] && <div className="supplier-tooltip" style={{ left: `${tooltipLeft}%`, transform: tooltipTransform }}>
      <strong>{monthly[hoverIndex].period}</strong>
      {lineItems.map(item => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><b>{item.values[hoverIndex].toFixed(2)}%</b></div>)}
    </div>}
  </div>;
}

function OverviewPage({ snapshot, trend, period }: { snapshot: Snapshot; trend: TrendRow[]; period: string }) {
  const monthLabel = periodText(period);
  const rangeLabel = `${trend[0]?.period.replace("-", ".")}—${trend.at(-1)?.period.replace("-", ".")}`;
  const leader = snapshot.topBatteries[0];
  const { exporting, runExport } = useChartExporter();
  const shareNames = snapshot.batteryNames.slice(0, 5);
  const exportTotalTrend = () => runExport("total", {
    title: "国内动力电池总装机趋势",
    unit: "GWh",
    fileName: `动力电池总装机趋势_${period}`,
    chart: { type: "line", categories: trend.map(item => item.period), series: [{ name: "总装机", color: COLORS[0], values: trend.map(item => item.totalGwh) }] },
    headers: ["月份", "总装机量(GWh)", "车辆数"],
    rows: trend.map(item => [item.period, item.totalGwh, item.units]),
  });
  const exportShareTrend = () => runExport("share", {
    title: "主要电池企业份额趋势",
    unit: "份额",
    fileName: `主要电池企业份额趋势_${period}`,
    chart: { type: "line", categories: trend.map(item => item.period), series: shareNames.map((name, index) => ({ name, color: COLORS[index], values: trend.map(item => ratio(item.shares[name])) })), percent: true },
    headers: ["月份", ...shareNames.map(name => `${name}份额`)],
    rows: trend.map(item => [item.period, ...shareNames.map(name => ratio(item.shares[name]))]),
    percentColumns: shareNames.map((_, index) => index + 1),
  });
  const exportBatteryStructure = () => runExport("batteryStructure", {
    title: `${monthLabel}电池企业结构`,
    unit: "份额",
    fileName: `电池企业结构_${period}`,
    chart: { type: "donut", categories: snapshot.topBatteries.map(item => item.name), series: [{ name: "市场份额", color: COLORS[0], values: snapshot.topBatteries.map(item => ratio(item.value)) }], percent: true },
    headers: ["电池企业", "市场份额", "装机量(GWh)"],
    rows: snapshot.topBatteries.map(item => [item.name, ratio(item.value), item.gwh]),
    percentColumns: [1],
  });
  const exportCategoryStructure = () => runExport("categoryStructure", {
    title: `${monthLabel}车辆类别结构`,
    unit: "份额",
    fileName: `车辆类别结构_${period}`,
    chart: { type: "bar", categories: snapshot.categories.map(item => item.name), series: [{ name: "装机份额", color: COLORS[0], values: snapshot.categories.map(item => ratio(item.value)) }], percent: true },
    headers: ["车辆类别", "装机份额"],
    rows: snapshot.categories.map(item => [item.name, ratio(item.value)]),
    percentColumns: [1],
  });
  return <>
    <div className="metrics-grid">
      <MetricCard active label={`${Number(period.slice(5))}月总装机`} value={fmt(snapshot.metrics.totalGwh, 2)} unit="GWh" change={`同比 ${signed(snapshot.metrics.yoy)}%`} />
      <MetricCard label="环比增速" value={signed(snapshot.metrics.mom)} unit="%" change={`截至${monthLabel}`} />
      <MetricCard label={`${leader?.name || "头部企业"}份额`} value={fmt(snapshot.metrics.top1, 2)} unit="%" change={`${leader?.gwh || 0} GWh`} />
      <MetricCard label="CR3集中度" value={fmt(snapshot.metrics.cr3)} unit="%" change="前三家合计" />
      <MetricCard label="活跃配套车企" value={String(snapshot.metrics.carCount)} unit="家" change={`${snapshot.metrics.batteryCount}家电池企业`} />
    </div>
    <div className="dashboard-grid overview-grid">
      <Card title="国内动力电池总装机趋势" hint={`${rangeLabel} · GWh`} className="span-5" exportBusy={exporting === "total"} onExport={exportTotalTrend}><LineChart rows={trend} /></Card>
      <Card title="主要电池企业份额趋势" hint="按装机总电量计算" className="span-7" exportBusy={exporting === "share"} onExport={exportShareTrend}><Legend names={shareNames} /><LineChart rows={trend} batteryNames={snapshot.batteryNames} mode="share" /></Card>
      <Card title={`${monthLabel}企业结构`} hint="主要电池企业市场份额" className="span-5" exportBusy={exporting === "batteryStructure"} onExport={exportBatteryStructure}><Donut items={snapshot.topBatteries} center={fmt(snapshot.metrics.totalGwh)} unit="GWh" /></Card>
      <Card title="车辆类别结构" hint="乘用车、客车及专用车" className="span-3" exportBusy={exporting === "categoryStructure"} onExport={exportCategoryStructure}>
        <div className="rank-bars">{snapshot.categories.map((x, i) => <div key={x.name}><div><span>{x.name}</span><b>{x.value}%</b></div><em><i style={{ width: `${x.value}%`, background: COLORS[i % COLORS.length] }} /></em></div>)}</div>
      </Card>
      <Card title="原始数据抽样" hint={`明细库共 ${historyData.sourceRows.toLocaleString()} 条记录`} className="span-4 table-card">
        <div className="mini-table"><table><thead><tr><th>车企</th><th>车型</th><th>电池企业</th><th>装机/GWh</th></tr></thead><tbody>{snapshot.latestRows.slice(0, 7).map((r, i) => <tr key={i}><td>{r.car}</td><td>{r.model}</td><td>{r.battery}</td><td>{r.gwh}</td></tr>)}</tbody></table></div>
      </Card>
    </div>
  </>;
}

function RelationsPage({ snapshot, period }: { snapshot: Snapshot; period: string }) {
  const leader = snapshot.topBatteries[0];
  const { exporting, runExport } = useChartExporter();
  const exportSupplyMatrix = () => runExport("matrix", {
    title: `${periodText(period)}车企与电池企业供应份额`,
    unit: "份额",
    fileName: `车企电池供应份额_${period}`,
    chart: { type: "bar", categories: snapshot.heatmap.map(item => item.car), series: snapshot.batteryNames.map((name, index) => ({ name, color: COLORS[index % COLORS.length], values: snapshot.heatmap.map(item => ratio(item.values[index])) })), percent: true },
    headers: ["汽车企业", ...snapshot.batteryNames.map(name => `${name}份额`), "当月装机(GWh)"],
    rows: snapshot.heatmap.map(item => [item.car, ...item.values.map(ratio), item.gwh]),
    percentColumns: snapshot.batteryNames.map((_, index) => index + 1),
  });
  const exportCarRanking = () => runExport("carRanking", {
    title: `${periodText(period)}车企装机排名`,
    unit: "GWh",
    fileName: `车企装机排名_${period}`,
    chart: { type: "bar", categories: snapshot.topCars.slice(0, 10).map(item => item.name), series: [{ name: "装机量", color: COLORS[0], values: snapshot.topCars.slice(0, 10).map(item => item.gwh) }] },
    headers: ["排名", "汽车企业", "装机量(GWh)"],
    rows: snapshot.topCars.slice(0, 10).map((item, index) => [index + 1, item.name, item.gwh]),
  });
  return <>
    <div className="metrics-grid compact-metrics">
      <MetricCard active label="覆盖车企" value={String(snapshot.metrics.carCount)} unit="家" change={`${periodText(period)}有装机`} />
      <MetricCard label="电池企业" value={String(snapshot.metrics.batteryCount)} unit="家" change="形成有效配套" />
      <MetricCard label="头部供应商" value={leader?.name || "—"} change={`${leader?.value || 0}% 市占率`} />
      <MetricCard label="车企样本" value={String(snapshot.heatmap.length)} unit="家" change="按当月装机量筛选" />
    </div>
    <div className="dashboard-grid relations-grid">
      <Card title="车企 × 电池企业供应份额矩阵" hint="颜色越深，供应份额越高；右侧为车企当月装机" className="span-9 heatmap-card" exportBusy={exporting === "matrix"} onExport={exportSupplyMatrix}>
        <div className="heatmap-scroll"><div className="heatmap" style={{ gridTemplateColumns: `150px repeat(${snapshot.batteryNames.length}, minmax(82px, 1fr)) 76px` }}>
          <div className="hm-head sticky">汽车企业</div>{snapshot.batteryNames.map(n => <div className="hm-head" key={n}>{n}</div>)}<div className="hm-head">GWh</div>
          {snapshot.heatmap.map(row => <div className="hm-row" key={row.car} style={{ display: "contents" }}><div className="hm-car">{row.car}</div>{row.values.map((v, i) => <div key={i} className="hm-cell" style={{ background: `rgba(18,58,99,${0.07 + v / 115})`, color: v > 55 ? "white" : "#17324d" }}>{v ? `${v}%` : "—"}</div>)}<div className="hm-total">{row.gwh}</div></div>)}
        </div></div>
      </Card>
      <Card title="车企装机排名" hint={periodText(period)} className="span-3" exportBusy={exporting === "carRanking"} onExport={exportCarRanking}>
        <div className="rank-bars numbered">{snapshot.topCars.slice(0, 10).map((x, i) => <div key={x.name}><div><span><small>{i + 1}</small>{x.name}</span><b>{x.gwh} GWh</b></div><em><i style={{ width: `${x.value / Math.max(snapshot.topCars[0]?.value || 1, 1) * 100}%` }} /></em></div>)}</div>
      </Card>
    </div>
  </>;
}

function CompanyPage({ snapshot, period, companies }: { snapshot: Snapshot; period: string; companies: Company[] }) {
  const [company, setCompany] = useState(companies[0]?.name || "");
  const { exporting, runExport } = useChartExporter();
  useEffect(() => {
    if (!companies.some(item => item.name === company)) setCompany(companies[0]?.name || "");
  }, [companies, company]);
  const detail = companies.find(x => x.name === company) || companies[0];
  const monthly = detail?.monthly.filter(m => m.period <= period).slice(-13) || [];
  const latest = detail?.monthly.find(m => m.period === period);
  const supplierTotals = useMemo(() => {
    if (!latest) return [];
    return Object.entries(latest.suppliers).map(([name,value]) => ({name,value})).sort((a,b)=>b.value-a.value);
  }, [latest]);
  const supplierNames = Array.from(new Set(monthly.flatMap(m => Object.keys(m.suppliers)))).slice(0,6);
  const rows = snapshot.latestRows.filter(x => x.car === company);
  const maxCompanyGwh = Math.max(...monthly.map(x=>x.totalGwh), 0.001);
  const visibleSuppliers = supplierTotals.slice(0, 5);
  const otherSupplierShare = Math.max(0, 100 - visibleSuppliers.reduce((sum, item) => sum + item.value, 0));
  const structureChartItems = [...visibleSuppliers, ...(otherSupplierShare > 0.05 ? [{ name: "其他", value: otherSupplierShare }] : [])];
  const evolutionNames = supplierNames.slice(0, 5);
  const evolutionValues = evolutionNames.map(name => monthly.map(item => item.suppliers[name] || 0));
  const otherEvolution = monthly.map((item, index) => item.totalGwh > 0 ? Math.max(0, 100 - evolutionValues.reduce((sum, series) => sum + series[index], 0)) : 0);
  const evolutionSeries = [
    ...evolutionNames.map((name, index) => ({ name, color: AREA_COLORS[index % AREA_COLORS.length], values: evolutionValues[index].map(ratio) })),
    ...(otherEvolution.some(value => value > 0.05) ? [{ name: "其他", color: AREA_COLORS[evolutionNames.length % AREA_COLORS.length], values: otherEvolution.map(ratio) }] : []),
  ];
  const exportCompanyTrend = () => runExport("companyTrend", {
    title: `${company}月度装机趋势`,
    unit: "GWh",
    fileName: `${company}_月度装机趋势_${period}`,
    chart: { type: "bar", categories: monthly.map(item => item.period), series: [{ name: "装机量", color: COLORS[0], values: monthly.map(item => item.totalGwh) }] },
    headers: ["月份", "装机量(GWh)"],
    rows: monthly.map(item => [item.period, item.totalGwh]),
  });
  const exportSupplierStructure = () => runExport("supplierStructure", {
    title: `${company}${periodText(period)}供应结构`,
    unit: "份额",
    fileName: `${company}_供应结构_${period}`,
    chart: { type: "donut", categories: structureChartItems.map(item => item.name), series: [{ name: "供应份额", color: COLORS[0], values: structureChartItems.map(item => ratio(item.value)) }], percent: true },
    headers: ["供应商", "供应份额"],
    rows: supplierTotals.map(item => [item.name, ratio(item.value)]),
    percentColumns: [1],
  });
  const exportSupplierEvolution = () => runExport("supplierEvolution", {
    title: `${company}供应商份额演变`,
    unit: "份额",
    fileName: `${company}_供应商份额演变_${period}`,
    chart: { type: "line", categories: monthly.map(item => item.period), series: evolutionSeries, percent: true },
    headers: ["月份", ...evolutionSeries.map(item => `${item.name}份额`)],
    rows: monthly.map((item, monthIndex) => [item.period, ...evolutionSeries.map(series => series.values[monthIndex])]),
    percentColumns: evolutionSeries.map((_, index) => index + 1),
  });
  return <>
    <div className="company-toolbar"><div><span>分析对象</span><select value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(x=><option key={x.name}>{x.name}</option>)}</select></div><p>从车企视角观察装机规模、供应商份额与集中度变化</p></div>
    <div className="metrics-grid compact-metrics">
      <MetricCard active label={`${Number(period.slice(5))}月装机`} value={fmt(latest?.totalGwh || 0,2)} unit="GWh" change="当前车企口径" />
      <MetricCard label="第一供应商" value={supplierTotals[0]?.name || "—"} change={`${supplierTotals[0]?.value || 0}% 份额`} />
      <MetricCard label="供应商数量" value={String(supplierTotals.length)} unit="家" change="当月有效装机" />
      <MetricCard label="Top2集中度" value={fmt(supplierTotals.slice(0,2).reduce((s,x)=>s+x.value,0))} unit="%" change="供应集中风险指标" />
    </div>
    <div className="dashboard-grid company-grid">
      <Card title={`${company}月度装机趋势`} hint={`${monthly[0]?.period.replace("-", ".")}—${period.replace("-", ".")} · GWh`} className="span-7" exportBusy={exporting === "companyTrend"} onExport={exportCompanyTrend}><div className="bar-chart">{monthly.map((m,i)=><div key={m.period}><span>{m.totalGwh}</span><i style={{height:`${Math.max(3,m.totalGwh/maxCompanyGwh*100)}%`,background:i===monthly.length-1?COLORS[0]:"#909294"}}/><small>{m.period.slice(5)}月</small></div>)}</div></Card>
      <Card title="当前供应结构" hint={periodText(period)} className="span-5" exportBusy={exporting === "supplierStructure"} onExport={exportSupplierStructure}><Donut items={supplierTotals} center={fmt(latest?.totalGwh || 0,2)} unit="GWh" /></Card>
      <Card title="供应商份额演变" hint="多供应商折线 · 悬浮查看月度份额" className="span-12" exportBusy={exporting === "supplierEvolution"} onExport={exportSupplierEvolution}><SupplierEvolutionChart monthly={monthly} supplierNames={supplierNames}/></Card>
    </div>
  </>;
}

export default function Dashboard() {
  const [page, setPage] = useState<PageKey>("overview");
  const [period, setPeriod] = useState(historyData.lastPeriod);
  const [category, setCategory] = useState(historyData.categoryOptions[0] || "全部车型");
  const current = NAV.find(x=>x.key===page)!;
  const view = historyData.views[category] || historyData.views[historyData.categoryOptions[0]];
  const snapshot = view.snapshots[period] || view.snapshots[historyData.lastPeriod];
  const trend = view.trend.filter(row => row.period <= period).slice(-13);
  return (
    <main className="app-shell supply-template">
      <aside className="supply-sidebar">
        <a className="supply-brand" href="/"><span>东吴</span><div><strong>东吴电新</strong><small>NEW ENERGY DATA</small></div></a>
        <div className="supply-filter"><label>分析月份</label><select aria-label="数据月份" value={period} onChange={event=>setPeriod(event.target.value)}>{[...historyData.periods].reverse().map(item=><option value={item} key={item}>{periodText(item)}</option>)}</select></div>
        <div className="supply-filter"><label>车辆类别</label><select aria-label="车辆类别" value={category} onChange={event=>setCategory(event.target.value)}>{historyData.categoryOptions.map(item=><option value={item} key={item}>{item}</option>)}</select></div>
        <div className="supply-nav-block"><label>分析维度</label><nav className="supply-nav" aria-label="仪表盘页面">{NAV.map(item=><button key={item.key} onClick={()=>setPage(item.key)} className={page===item.key?"selected":""}><span><b>{item.label}</b><small>{item.note}</small></span></button>)}</nav></div>
        <div className="supply-current"><span>当前选择</span><strong>{current.label}</strong><small>{periodText(period)} · {category}</small></div>
        <div className="supply-source">数据范围<br/><b>{historyData.firstPeriod}—{historyData.lastPeriod}</b></div>
      </aside>
      <section className="supply-main">
        <header className="topbar"><div className="brand"><span>DONGWU NEW ENERGY · SUPPLY DASHBOARD</span><h1>动力电池车企配套数据库</h1><p>国内装机 · {period} · {category} · GWh</p></div></header>
        <div className="page-title"><div><span>{String(NAV.findIndex(x=>x.key===page)+1).padStart(2,"0")}</span><h2>{current.label}</h2><p>{current.note} · {periodText(period)} · {category}</p></div><div className="data-badge"><i/>历史数据已连接 <b>{historyData.sourceRows.toLocaleString()}</b> 条</div></div>
        <div className="content">{page==="overview"?<OverviewPage snapshot={snapshot} trend={trend} period={period}/>:page==="relations"?<RelationsPage snapshot={snapshot} period={period}/>:<CompanyPage snapshot={snapshot} period={period} companies={view.companies}/>}</div>
        <footer>东吴电新 · 动力电池配套关系数据库可视化初稿 <span>数据范围 {historyData.firstPeriod}—{historyData.lastPeriod}</span></footer>
      </section>
    </main>
  );
}
