"use client";

import { useMemo, useState } from "react";
import rawData from "./data/battery-export.json";

type Metric = "amount" | "quantity" | "unitPrice";
type Tab = "overview" | "countries" | "provinces" | "continents" | "details";
type TotalRow = { month: string; amount: number; quantity: number; unitPrice: number | null };
type EntityRow = TotalRow & { name: string };

const data = rawData as {
  meta: { title: string; brand: string; source: string; frequency: string; startMonth: string; latestMonth: string };
  total: TotalRow[];
  countries: EntityRow[];
  provinces: EntityRow[];
  continents: EntityRow[];
};

const COLORS = ["#2878ff", "#18a57b", "#8f63e9", "#f0a637", "#ee6b68", "#2ea7b8", "#7b8ba6", "#c56fa4"];
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

const metricMeta: Record<Metric, { label: string; unit: string; compact: (value: number) => string; full: (value: number) => string }> = {
  amount: { label: "出口金额", unit: "亿美元", compact: (v) => v.toFixed(1), full: (v) => `${v.toFixed(2)} 亿美元` },
  quantity: { label: "出口数量", unit: "亿个", compact: (v) => (v / 100_000_000).toFixed(1), full: (v) => `${(v / 100_000_000).toFixed(2)} 亿个` },
  unitPrice: { label: "平均单价", unit: "美元/个", compact: (v) => v.toFixed(1), full: (v) => `${v.toFixed(2)} 美元/个` },
};

function metricValue(row: TotalRow | EntityRow, metric: Metric) {
  return Number(row[metric] ?? 0);
}

function pct(now: number, before?: number) {
  if (!before) return null;
  return (now / before - 1) * 100;
}

function previousMonth(month: string, delta = 1) {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(year, mon - 1 - delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatChange(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function sumRows(rows: EntityRow[], metric: Metric) {
  if (metric === "unitPrice") {
    const amount = rows.reduce((s, row) => s + row.amount, 0) * 100_000_000;
    const quantity = rows.reduce((s, row) => s + row.quantity, 0);
    return quantity ? amount / quantity : 0;
  }
  return rows.reduce((s, row) => s + metricValue(row, metric), 0);
}

function MetricSwitch({ value, onChange, compact = false }: { value: Metric; onChange: (value: Metric) => void; compact?: boolean }) {
  return (
    <div className={`metric-switch ${compact ? "compact" : ""}`} aria-label="指标切换">
      {(Object.keys(metricMeta) as Metric[]).map((item) => (
        <button key={item} className={value === item ? "active" : ""} onClick={() => onChange(item)}>
          {metricMeta[item].label}
        </button>
      ))}
    </div>
  );
}

function Delta({ value, label }: { value: number | null; label: string }) {
  const cls = value == null ? "neutral" : value >= 0 ? "positive" : "negative";
  return <span className={`delta ${cls}`}>{label} {formatChange(value)}</span>;
}

function LineChart({
  labels,
  series,
  metric,
  height = 310,
}: {
  labels: string[];
  series: { name: string; color: string; values: (number | null)[] }[];
  metric: Metric;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 860;
  const pad = { top: 22, right: 24, bottom: 42, left: 62 };
  const values = series.flatMap((s) => s.values).filter((v): v is number => v != null && Number.isFinite(v));
  const minRaw = Math.min(...values, 0);
  const maxRaw = Math.max(...values, 1);
  const span = Math.max(maxRaw - minRaw, maxRaw * 0.12, 1);
  const min = metric === "unitPrice" ? Math.max(0, minRaw - span * 0.18) : 0;
  const max = maxRaw + span * 0.12;
  const x = (i: number) => pad.left + (i * (width - pad.left - pad.right)) / Math.max(labels.length - 1, 1);
  const y = (v: number) => pad.top + ((max - v) * (height - pad.top - pad.bottom)) / Math.max(max - min, 1);
  const pathFor = (vals: (number | null)[]) => {
    let started = false;
    return vals.map((v, i) => {
      if (v == null) { started = false; return ""; }
      const cmd = started ? "L" : "M";
      started = true;
      return `${cmd}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    }).join(" ");
  };
  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round(((px - pad.left) / (width - pad.left - pad.right)) * Math.max(labels.length - 1, 1));
    setHover(Math.max(0, Math.min(labels.length - 1, index)));
  };

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metricMeta[metric].label}趋势图`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[0, 1, 2, 3, 4].map((step) => {
          const value = min + ((max - min) * (4 - step)) / 4;
          const yy = pad.top + (step * (height - pad.top - pad.bottom)) / 4;
          return <g key={step}><line x1={pad.left} y1={yy} x2={width - pad.right} y2={yy} className="grid-line" /><text x={pad.left - 10} y={yy + 4} textAnchor="end" className="axis-text">{metricMeta[metric].compact(value)}</text></g>;
        })}
        {labels.map((label, i) => (i === 0 || i === labels.length - 1 || i % Math.max(1, Math.ceil(labels.length / 7)) === 0) ? <text key={label} x={x(i)} y={height - 12} textAnchor="middle" className="axis-text">{label}</text> : null)}
        {series.map((item) => <path key={item.name} d={pathFor(item.values)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
        {series.map((item) => item.values.map((v, i) => v == null ? null : <circle key={`${item.name}-${i}`} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 2.5} fill="#fff" stroke={item.color} strokeWidth="2" />))}
        {hover != null && <line x1={x(hover)} y1={pad.top} x2={x(hover)} y2={height - pad.bottom} className="hover-line" />}
      </svg>
      <div className="chart-legend">{series.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div>
      {hover != null && <div className="chart-tooltip"><b>{labels[hover]}</b>{series.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<strong>{item.values[hover] == null ? "—" : metricMeta[metric].full(item.values[hover]!)}</strong></span>)}</div>}
    </div>
  );
}

function Ranking({ rows, metric, selected, onSelect, limit = 12 }: { rows: EntityRow[]; metric: Metric; selected?: string; onSelect?: (name: string) => void; limit?: number }) {
  const ranked = [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, limit);
  const max = Math.max(...ranked.map((row) => metricValue(row, metric)), 1);
  const total = sumRows(rows, metric);
  return <div className="ranking">{ranked.map((row, index) => {
    const value = metricValue(row, metric);
    return <button key={row.name} className={selected === row.name ? "selected" : ""} onClick={() => onSelect?.(row.name)}>
      <span className="rank-num">{String(index + 1).padStart(2, "0")}</span><span className="rank-name">{row.name}</span>
      <span className="bar-track"><i style={{ width: `${(value / max) * 100}%`, background: COLORS[index % COLORS.length] }} /></span>
      <strong>{metricMeta[metric].compact(value)}</strong><small>{metric === "unitPrice" ? metricMeta[metric].unit : `${total ? (value / total * 100).toFixed(1) : "0.0"}%`}</small>
    </button>;
  })}</div>;
}

function Donut({ rows, metric }: { rows: EntityRow[]; metric: Metric }) {
  const ranked = [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
  const total = sumRows(rows, metric);
  let cursor = 0;
  const gradient = ranked.map((row, index) => {
    const share = total ? metricValue(row, metric) / total * 100 : 0;
    const start = cursor;
    cursor += share;
    return `${COLORS[index % COLORS.length]} ${start}% ${cursor}%`;
  }).join(",");
  return <div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(${gradient})` }}><div><strong>{metricMeta[metric].compact(total)}</strong><span>{metricMeta[metric].unit}</span></div></div><div className="donut-legend">{ranked.map((row, index) => <div key={row.name}><i style={{ background: COLORS[index % COLORS.length] }} /><span>{row.name}</span><strong>{total ? (metricValue(row, metric) / total * 100).toFixed(1) : "0.0"}%</strong></div>)}</div></div>;
}

function DestinationHeatmap({ rows }: { rows: EntityRow[] }) {
  const [year, setYear] = useState<"all" | "2024" | "2025" | "2026">("all");
  const [limit, setLimit] = useState(15);
  const [active, setActive] = useState<{ name: string; month: string; value: number } | null>(null);
  const months = data.total.map((row) => row.month).filter((item) => year === "all" || item.startsWith(year));
  const monthSet = new Set(months);
  const visibleRows = rows.filter((row) => monthSet.has(row.month));
  const totals = new Map<string, number>();
  visibleRows.forEach((row) => totals.set(row.name, (totals.get(row.name) ?? 0) + row.amount));
  const names = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name]) => name);
  const lookup = new Map(visibleRows.map((row) => [`${row.name}|${row.month}`, row.amount]));
  const max = Math.max(...names.flatMap((name) => months.map((item) => lookup.get(`${name}|${item}`) ?? 0)), 1);
  const gridStyle = { gridTemplateColumns: `150px repeat(${months.length}, minmax(64px, 1fr)) 96px`, minWidth: `${246 + months.length * 64}px` };
  const selected = active ?? (() => {
    const name = names[0];
    const month = months[months.length - 1];
    return { name, month, value: lookup.get(`${name}|${month}`) ?? 0 };
  })();

  return <article className="panel heatmap-panel">
    <div className="panel-head heatmap-titlebar"><div><span className="panel-kicker">SHEET1 · DESTINATION MATRIX</span><h2>主要目的地月度出口金额热力图</h2><p>复刻 Excel Sheet1 的国家 × 月份透视矩阵；颜色越深，单月出口金额越高。<a className="sheet1-inline-link" href="/sheet1">打开6月出口汇总表 →</a></p></div><div className="heatmap-controls"><div className="segmented" aria-label="选择年份">{(["all", "2024", "2025", "2026"] as const).map((item) => <button key={item} className={year === item ? "active" : ""} onClick={() => { setYear(item); setActive(null); }}>{item === "all" ? "全部" : item}</button>)}</div><label>显示<select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setActive(null); }}><option value={10}>Top 10</option><option value={15}>Top 15</option><option value={20}>Top 20</option></select></label></div></div>
    <div className="heatmap-readout"><div><span>当前单元格</span><strong>{selected.name} · {selected.month}</strong></div><b>{selected.value.toFixed(2)}<small> 亿美元</small></b><div className="heatmap-legend"><span>低</span><i /><span>高</span></div></div>
    <div className="heatmap-scroll" role="region" aria-label="主要目的地月度出口金额热力图" tabIndex={0}>
      <div className="heatmap-row heatmap-header" style={gridStyle}><span className="heatmap-country">目的地</span>{months.map((item) => <span key={item}>{item.slice(2).replace("-", ".")}</span>)}<span className="heatmap-total">期间合计</span></div>
      {names.map((name, rowIndex) => <div className="heatmap-row" style={gridStyle} key={name}><span className="heatmap-country"><i>{String(rowIndex + 1).padStart(2, "0")}</i>{name}</span>{months.map((item) => {
        const value = lookup.get(`${name}|${item}`) ?? 0;
        const intensity = Math.sqrt(value / max);
        const isActive = active?.name === name && active.month === item;
        return <button key={item} className={`heatmap-cell ${isActive ? "active" : ""}`} style={{ backgroundColor: `rgba(40,120,255,${0.06 + intensity * 0.88})`, color: intensity > .58 ? "#fff" : "#254d7f" }} onMouseEnter={() => setActive({ name, month: item, value })} onFocus={() => setActive({ name, month: item, value })} onClick={() => setActive({ name, month: item, value })} aria-label={`${name} ${item} 出口金额 ${value.toFixed(2)} 亿美元`} title={`${name} · ${item}\n${value.toFixed(2)} 亿美元`}>{value > 0 ? value.toFixed(1) : "—"}</button>;
      })}<strong className="heatmap-total">{(totals.get(name) ?? 0).toFixed(1)}</strong></div>)}
    </div>
    <div className="heatmap-note"><span>单位：亿美元</span><span>横向滚动查看全部月份</span><span>国家排名按所选期间累计金额</span></div>
  </article>;
}

function EntityTable({ rows, month, metric, search, limit = 80 }: { rows: EntityRow[]; month: string; metric: Metric; search: string; limit?: number }) {
  const current = rows.filter((row) => row.month === month && row.name.includes(search));
  const ytdStart = `${month.slice(0, 4)}-01`;
  const ytdRows = rows.filter((row) => row.month >= ytdStart && row.month <= month);
  const lookup = new Map(rows.map((row) => [`${row.name}|${row.month}`, row]));
  const sorted = [...current].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, limit);
  return <div className="table-wrap"><table><thead><tr><th>排名</th><th>地区</th><th>{metricMeta[metric].label}</th><th>环比</th><th>同比</th><th>年初至今</th><th>出口数量</th><th>平均单价</th></tr></thead><tbody>{sorted.map((row, index) => {
    const prev = lookup.get(`${row.name}|${previousMonth(month)}`);
    const lastYear = lookup.get(`${row.name}|${previousMonth(month, 12)}`);
    const ytd = sumRows(ytdRows.filter((item) => item.name === row.name), metric);
    return <tr key={row.name}><td>{index + 1}</td><td><b>{row.name}</b></td><td className="primary-cell">{metricMeta[metric].full(metricValue(row, metric))}</td><td><Delta value={pct(metricValue(row, metric), prev ? metricValue(prev, metric) : undefined)} label="" /></td><td><Delta value={pct(metricValue(row, metric), lastYear ? metricValue(lastYear, metric) : undefined)} label="" /></td><td>{metricMeta[metric].full(ytd)}</td><td>{(row.quantity / 100_000_000).toFixed(2)} 亿个</td><td>{row.unitPrice == null ? "—" : `$${row.unitPrice.toFixed(2)}`}</td></tr>;
  })}</tbody></table></div>;
}

function EntityView({ title, subtitle, rows, month, setMonth }: { title: string; subtitle: string; rows: EntityRow[]; month: string; setMonth: (month: string) => void }) {
  const [metric, setMetric] = useState<Metric>("amount");
  const [search, setSearch] = useState("");
  const latestRows = rows.filter((row) => row.month === month);
  const names = [...new Set(rows.map((row) => row.name))];
  const [selected, setSelected] = useState(names[0] ?? "");
  const selectedName = latestRows.some((row) => row.name === selected) ? selected : [...latestRows].sort((a, b) => b.amount - a.amount)[0]?.name ?? selected;
  const entitySeries = rows.filter((row) => row.name === selectedName).sort((a, b) => a.month.localeCompare(b.month));
  return <section className="view-stack">
    <div className="view-heading"><div><p className="eyebrow">REGIONAL BREAKDOWN</p><h2>{title}</h2><p>{subtitle}</p></div><div className="view-controls"><MetricSwitch value={metric} onChange={setMetric} compact /><select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="选择月份">{data.total.map((row) => <option key={row.month}>{row.month}</option>)}</select></div></div>
    <div className="grid two"><article className="panel"><div className="panel-head"><div><span className="panel-kicker">RANKING</span><h3>{month} 排名</h3></div><span className="unit-pill">{metricMeta[metric].unit}</span></div><Ranking rows={latestRows} metric={metric} selected={selectedName} onSelect={setSelected} /></article>
      <article className="panel"><div className="panel-head"><div><span className="panel-kicker">TREND</span><h3>{selectedName} · 月度趋势</h3></div><span className="unit-pill">{metricMeta[metric].unit}</span></div><LineChart labels={entitySeries.map((r) => r.month.slice(2))} series={[{ name: selectedName, color: "#2878ff", values: entitySeries.map((r) => metricValue(r, metric)) }]} metric={metric} /></article></div>
    <article className="panel"><div className="panel-head"><div><span className="panel-kicker">DATA TABLE</span><h3>地区明细</h3></div><label className="search"><span>搜索</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="输入地区名称" /></label></div><EntityTable rows={rows} month={month} metric={metric} search={search} /></article>
  </section>;
}

export function BatteryDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [metric, setMetric] = useState<Metric>("amount");
  const [month, setMonth] = useState(data.meta.latestMonth);
  const [detailType, setDetailType] = useState<"countries" | "provinces">("countries");
  const [search, setSearch] = useState("");
  const totalLookup = useMemo(() => new Map(data.total.map((row) => [row.month, row])), []);
  const latest = totalLookup.get(month) ?? data.total[data.total.length - 1];
  const prev = totalLookup.get(previousMonth(month));
  const priorYear = totalLookup.get(previousMonth(month, 12));
  const currentYear = month.slice(0, 4);
  const ytd = data.total.filter((row) => row.month.startsWith(currentYear) && row.month <= month).reduce((sum, row) => sum + row.amount, 0);
  const priorYtd = data.total.filter((row) => row.month.startsWith(String(Number(currentYear) - 1)) && row.month.slice(5) <= month.slice(5)).reduce((sum, row) => sum + row.amount, 0);
  const countryMonth = data.countries.filter((row) => row.month === month);
  const provinceMonth = data.provinces.filter((row) => row.month === month);
  const continentMonth = data.continents.filter((row) => row.month === month);
  const topCountry = [...countryMonth].sort((a, b) => b.amount - a.amount)[0];
  const topProvince = [...provinceMonth].sort((a, b) => b.amount - a.amount)[0];
  const topContinent = [...continentMonth].sort((a, b) => b.amount - a.amount)[0];
  const yearSeries = [2024, 2025, 2026].map((year, index) => ({ name: `${year}年`, color: COLORS[index], values: MONTHS.map((_, i) => {
    const row = totalLookup.get(`${year}-${String(i + 1).padStart(2, "0")}`);
    return row ? metricValue(row, metric) : null;
  }) }));

  const exportCsv = () => {
    const rows = detailType === "countries" ? data.countries : data.provinces;
    const filtered = rows.filter((row) => row.month === month && row.name.includes(search));
    const csv = ["地区,月份,金额(亿美元),数量(个),平均单价(美元/个)", ...filtered.map((row) => `${row.name},${row.month},${row.amount},${row.quantity},${row.unitPrice ?? ""}`)].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = `电池出口_${detailType}_${month}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  return <main>
    <header className="site-header"><div className="brand-mark"><span>DW</span><div><b>东吴电新</b><small>ENERGY RESEARCH</small></div></div><div className="header-meta"><span className="live-dot" />数据更新至 {data.meta.latestMonth}<i />来源：{data.meta.source}</div></header>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">CHINA BATTERY EXPORT MONITOR</p><h1>国内电池出口<br /><em>数据观察站</em></h1><p className="hero-desc">基于海关总署月度数据，快速追踪出口规模、目的市场、出发省份与洲别结构。</p><div className="hero-tags"><span>2024.01—2026.06</span><span>231 个目的地</span><span>31 个省级地区</span></div></div><div className="hero-focus"><div className="hero-focus-top"><span>{month} 出口金额</span><select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="选择观察月份">{data.total.map((row) => <option key={row.month}>{row.month}</option>)}</select></div><strong>{latest.amount.toFixed(2)}<small>亿美元</small></strong><div className="hero-deltas"><Delta value={pct(latest.amount, prev?.amount)} label="环比" /><Delta value={pct(latest.amount, priorYear?.amount)} label="同比" /></div><div className="hero-mini"><span>年初至今<b>{ytd.toFixed(1)} 亿美元</b></span><span>累计同比<b className={pct(ytd, priorYtd)! >= 0 ? "up" : "down"}>{formatChange(pct(ytd, priorYtd))}</b></span></div></div></section>
    <nav className="tabs" aria-label="数据视图">{([
      ["overview", "总览"], ["countries", "目的地"], ["provinces", "出发地"], ["continents", "洲别"], ["details", "明细数据"],
    ] as [Tab, string][]).map(([key, label], index) => <button key={key} onClick={() => setTab(key)} className={tab === key ? "active" : ""}><span>0{index + 1}</span>{label}</button>)}</nav>

    {tab === "overview" && <section className="view-stack">
      <div className="kpi-grid"><article><span>出口数量</span><strong>{(latest.quantity / 100_000_000).toFixed(2)}<small>亿个</small></strong><Delta value={pct(latest.quantity, priorYear?.quantity)} label="同比" /></article><article><span>平均单价</span><strong>{latest.unitPrice?.toFixed(2)}<small>美元/个</small></strong><Delta value={pct(latest.unitPrice ?? 0, priorYear?.unitPrice ?? undefined)} label="同比" /></article><article><span>第一目的地</span><strong>{topCountry?.name}</strong><small>{topCountry?.amount.toFixed(2)} 亿美元</small></article><article><span>第一出发地</span><strong>{topProvince?.name}</strong><small>{topProvince?.amount.toFixed(2)} 亿美元</small></article></div>
      <a className="summary-entry-card" href="/sheet1"><div><span>MONTHLY EXPORT BRIEF · 2026.06</span><h2>6月电池出口更新交互表</h2><p>集中查看总金额、主要出发地、到达洲与到达国家，支持筛选、搜索、排序和行指标详情。</p></div><div className="summary-entry-metrics"><span>出口金额<strong>{latest.amount.toFixed(1)}<small> 亿美元</small></strong></span><span>同比<strong>{formatChange(pct(latest.amount, priorYear?.amount))}</strong></span><span>环比<strong>{formatChange(pct(latest.amount, prev?.amount))}</strong></span></div><b>进入交互表 <i>→</i></b></a>
      <DestinationHeatmap rows={data.countries} />
      <article className="panel featured"><div className="panel-head"><div><span className="panel-kicker">MONTHLY TREND</span><h2>各年同期对比</h2><p>按月份比较 2024—2026 年出口表现</p></div><MetricSwitch value={metric} onChange={setMetric} /></div><LineChart labels={MONTHS} series={yearSeries} metric={metric} height={350} /></article>
      <div className="grid two"><article className="panel"><div className="panel-head"><div><span className="panel-kicker">TOP DESTINATIONS</span><h3>{month} 目的地排名</h3></div><button className="text-button" onClick={() => setTab("countries")}>查看全部 →</button></div><Ranking rows={countryMonth} metric="amount" limit={8} /></article><article className="panel"><div className="panel-head"><div><span className="panel-kicker">CONTINENT MIX</span><h3>{month} 洲别结构</h3></div><span className="unit-pill">亿美元</span></div><Donut rows={continentMonth} metric="amount" /></article></div>
      <article className="insight-band"><div><span>本月观察</span><h3>出口动能保持强劲，市场结构更趋多元</h3></div><p><b>{month}</b> 出口金额同比 <strong>{formatChange(pct(latest.amount, priorYear?.amount))}</strong>；{topContinent?.name}以 <strong>{topContinent?.amount.toFixed(1)} 亿美元</strong> 居洲别首位，{topCountry?.name}为第一大目的地，{topProvince?.name}为第一大出发地。</p></article>
    </section>}

    {tab === "countries" && <EntityView title="目的国家与地区" subtitle="观察出口目的市场规模、结构与单一市场趋势。" rows={data.countries} month={month} setMonth={setMonth} />}
    {tab === "provinces" && <EntityView title="出发省份" subtitle="追踪各省级地区的出口贡献与月度变化。" rows={data.provinces} month={month} setMonth={setMonth} />}
    {tab === "continents" && <section className="view-stack"><div className="view-heading"><div><p className="eyebrow">CONTINENT MIX</p><h2>洲别结构</h2><p>六大洲出口规模、份额与趋势。</p></div><div className="view-controls"><MetricSwitch value={metric} onChange={setMetric} compact /><select value={month} onChange={(e) => setMonth(e.target.value)}>{data.total.map((row) => <option key={row.month}>{row.month}</option>)}</select></div></div><div className="grid two"><article className="panel"><div className="panel-head"><div><span className="panel-kicker">SHARE</span><h3>{month} 洲别构成</h3></div></div><Donut rows={continentMonth} metric={metric} /></article><article className="panel"><div className="panel-head"><div><span className="panel-kicker">RANKING</span><h3>洲别排名</h3></div></div><Ranking rows={continentMonth} metric={metric} limit={6} /></article></div><article className="panel"><div className="panel-head"><div><span className="panel-kicker">TREND</span><h3>各洲月度出口趋势</h3></div><span className="unit-pill">{metricMeta[metric].unit}</span></div><LineChart labels={data.total.map((r) => r.month.slice(2))} series={[...new Set(data.continents.map((r) => r.name))].map((name, i) => ({ name, color: COLORS[i], values: data.total.map((t) => { const row = data.continents.find((r) => r.name === name && r.month === t.month); return row ? metricValue(row, metric) : null; }) }))} metric={metric} height={380} /></article></section>}
    {tab === "details" && <section className="view-stack"><div className="view-heading"><div><p className="eyebrow">DETAILED DATA</p><h2>明细数据</h2><p>筛选、核对并导出当前月份地区数据。</p></div><div className="view-controls"><select value={month} onChange={(e) => setMonth(e.target.value)}>{data.total.map((row) => <option key={row.month}>{row.month}</option>)}</select><button className="export-button" onClick={exportCsv}>导出 CSV</button></div></div><article className="panel"><div className="panel-head table-tools"><div className="segmented"><button className={detailType === "countries" ? "active" : ""} onClick={() => setDetailType("countries")}>目的地</button><button className={detailType === "provinces" ? "active" : ""} onClick={() => setDetailType("provinces")}>出发地</button></div><label className="search"><span>搜索</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="输入地区名称" /></label></div><EntityTable rows={detailType === "countries" ? data.countries : data.provinces} month={month} metric="amount" search={search} limit={250} /></article></section>}
    <footer><div className="brand-mark small"><span>DW</span><div><b>东吴电新</b><small>ENERGY RESEARCH</small></div></div><p>数据来源：海关总署 · 月度更新 · 本站数据由《国内电池出口数据库》整理生成</p><span>最新数据：{data.meta.latestMonth}</span></footer>
  </main>;
}
