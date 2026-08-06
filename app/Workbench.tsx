"use client";

import { useMemo, useState } from "react";
import rawData from "./data/battery-export.json";

type MetricKey = "amount" | "quantity" | "unitPrice";
type Row = { month: string; amount: number; quantity: number; unitPrice: number | null };
type EntityRow = Row & { name: string };
type DataShape = { meta: { latestMonth: string; source: string; startMonth: string }; total: Row[]; countries: EntityRow[]; provinces: EntityRow[]; continents: EntityRow[] };

const data = rawData as DataShape;
const labels: Record<MetricKey, { label: string; unit: string }> = {
  amount: { label: "出口金额", unit: "亿美元" },
  quantity: { label: "出口数量", unit: "亿个" },
  unitPrice: { label: "平均单价", unit: "美元/个" },
};

function metricValue(row: Row, metric: MetricKey) {
  if (metric === "quantity") return row.quantity / 100_000_000;
  return Number(row[metric] ?? 0);
}
function pct(now: number, old?: number | null) { return old ? (now / old - 1) * 100 : null; }
function signed(value: number | null) { return value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`; }
function monthBefore(month: string, years: number) {
  const [year, m] = month.split("-").map(Number);
  return `${year - years}-${String(m).padStart(2, "0")}`;
}
function downloadCsv(rows: EntityRow[], month: string) {
  const csv = ["名称,月份,出口金额(亿美元),出口数量,平均单价(美元/个)", ...rows.map((r) => `${r.name},${month},${r.amount},${r.quantity},${r.unitPrice ?? ""}`)].join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `电池出口-${month}.csv`; a.click(); URL.revokeObjectURL(url);
}

export function Workbench() {
  const [month, setMonth] = useState(data.meta.latestMonth);
  const [metric, setMetric] = useState<MetricKey>("amount");
  const [tab, setTab] = useState<"overview" | "data" | "reports">("overview");
  const latest = data.total.find((r) => r.month === month) ?? data.total.at(-1)!;
  const index = data.total.indexOf(latest);
  const previous = data.total[index - 1];
  const yearAgo = data.total.find((r) => r.month === monthBefore(month, 1));
  const countries = useMemo(() => data.countries.filter((r) => r.month === month).sort((a, b) => b.amount - a.amount), [month]);
  const continents = useMemo(() => data.continents.filter((r) => r.month === month).sort((a, b) => b.amount - a.amount), [month]);
  const trend = data.total.slice(-12);
  const ytd = data.total.filter((r) => r.month.startsWith(month.slice(0, 4)) && r.month <= month).reduce((s, r) => s + r.amount, 0);
  const priorYtd = data.total.filter((r) => r.month.startsWith(String(Number(month.slice(0, 4)) - 1)) && r.month.slice(5) <= month.slice(5)).reduce((s, r) => s + r.amount, 0);
  const max = Math.max(...trend.map((r) => metricValue(r, metric)), 1);
  const yoy = pct(latest.amount, yearAgo?.amount);
  const mom = pct(latest.amount, previous?.amount);

  return <main className="workbench-shell">
    <aside className="workbench-sidebar">
      <div className="workbench-brand"><span>DW</span><div><b>东吴电新</b><small>RESEARCH OS</small></div></div>
      <div className="sidebar-label">研究工作台</div>
      <nav className="sidebar-nav">
        <a className={tab === "overview" ? "active" : ""} href="#home" onClick={() => setTab("overview")}>⌂<span>数据总览</span></a>
        <a className={tab === "data" ? "active" : ""} href="#data" onClick={() => setTab("data")}>▦<span>出口明细</span><em>{countries.length}</em></a>
        <a className={tab === "reports" ? "active" : ""} href="#reports" onClick={() => setTab("reports")}>▤<span>报告中心</span></a>
        <a href="./sheet1/">▥<span>Sheet1 月报</span></a>
      </nav>
      <div className="sidebar-label">数据主题</div>
      <div className="topic-list"><button>电池出口</button><button>锂电排产</button><button>材料价格</button><button>光伏风电</button></div>
      <div className="sidebar-bottom"><span className="live-dot" />数据已更新至 {data.meta.latestMonth}<small>海关总署数据 · 仅供研究使用</small></div>
    </aside>
    <section className="workbench-main" id="home">
      <header className="workbench-topbar"><div><span className="crumb">RESEARCH WORKSPACE / OVERVIEW</span><h1>新能源数据看板</h1></div><div className="top-actions"><button className="icon-button" aria-label="搜索">⌕</button><button className="avatar">研</button></div></header>
      <section className="workspace-hero"><div><span className="hero-label">今日研究摘要</span><h2>把每天要看的数据，<br /><strong>集中在一个工作台。</strong></h2><p>先从电池出口数据开始，逐步接入光伏、风电、价格、成本和招标数据库。</p></div><div className="hero-date"><span>观察月份</span><select value={month} onChange={(e) => setMonth(e.target.value)}>{data.total.map((r) => <option key={r.month}>{r.month}</option>)}</select><b>{latest.amount.toFixed(1)}<small> 亿美元</small></b><span className={yoy != null && yoy < 0 ? "negative" : "positive"}>同比 {signed(yoy)}</span></div></section>
      <div className="dashboard-grid">
        <section className="summary-column">
          <div className="section-heading"><div><span className="section-kicker">AT A GLANCE</span><h2>关键指标</h2></div><span className="last-updated">最后更新 {data.meta.latestMonth}</span></div>
          <div className="workbench-kpis">
            <article><span>出口金额</span><strong>{latest.amount.toFixed(1)}<small>亿美元</small></strong><b className={yoy != null && yoy < 0 ? "negative" : "positive"}>{signed(yoy)} <small>同比</small></b></article>
            <article><span>出口数量</span><strong>{(latest.quantity / 100_000_000).toFixed(1)}<small>亿个</small></strong><b className={pct(latest.quantity, yearAgo?.quantity)! < 0 ? "negative" : "positive"}>{signed(pct(latest.quantity, yearAgo?.quantity))} <small>同比</small></b></article>
            <article><span>年初至今</span><strong>{ytd.toFixed(1)}<small>亿美元</small></strong><b className={pct(ytd, priorYtd)! < 0 ? "negative" : "positive"}>{signed(pct(ytd, priorYtd))} <small>累计同比</small></b></article>
            <article><span>第一大目的地</span><strong className="word-value">{countries[0]?.name ?? "—"}</strong><b>{countries[0]?.amount.toFixed(1)} <small>亿美元</small></b></article>
          </div>
          <article className="widget-panel chart-widget" id="widgets"><div className="widget-heading"><div><span className="section-kicker">PPT CHART WIDGET</span><h3>月度出口趋势</h3><p>切换指标，查看趋势；明细可导出 CSV，图表可直接用于汇报。</p></div><button className="download-button" onClick={() => downloadCsv(countries, month)}>↓ 导出明细 CSV</button></div><div className="widget-toolbar"><div className="mini-tabs">{(Object.keys(labels) as MetricKey[]).map((key) => <button key={key} className={metric === key ? "active" : ""} onClick={() => setMetric(key)}>{labels[key].label}</button>)}</div><span>{labels[metric].unit}</span></div><div className="bar-chart" aria-label="月度出口趋势图">{trend.map((r) => <div className="bar-item" key={r.month}><div className="bar-value">{metricValue(r, metric).toFixed(1)}</div><div className="bar-track-vertical"><i style={{ height: `${Math.max(8, metricValue(r, metric) / max * 100)}%` }} /></div><small>{r.month.slice(2).replace("-", ".")}</small></div>)}</div></article>
          <div className="lower-grid"><article className="widget-panel ranking-widget" id="data"><div className="widget-heading"><div><span className="section-kicker">TOP DESTINATIONS</span><h3>{month} 目的地排名</h3></div><button className="text-button" onClick={() => downloadCsv(countries, month)}>下载 CSV →</button></div>{countries.slice(0, 7).map((r, i) => <div className="compact-rank" key={r.name}><b>{String(i + 1).padStart(2, "0")}</b><span>{r.name}</span><i><em style={{ width: `${r.amount / Math.max(countries[0]?.amount ?? 1, 1) * 100}%` }} /></i><strong>{r.amount.toFixed(1)}</strong></div>)}</article><article className="widget-panel mix-widget"><div className="widget-heading"><div><span className="section-kicker">CONTINENT MIX</span><h3>洲别结构</h3></div><span>{month}</span></div>{continents.slice(0, 6).map((r, i) => <div className="mix-row" key={r.name}><span><i className={`mix-dot dot-${i}`} />{r.name}</span><strong>{r.amount.toFixed(1)}<small> 亿美元</small></strong></div>)}</article></div>
        </section>
        <aside className="reports-column" id="reports"><div className="section-heading"><div><span className="section-kicker">REPORT HUB</span><h2>报告中心</h2></div><button className="text-button">管理 →</button></div><div className="report-list"><a className="report-card featured-report" href="./sheet1/"><div className="report-icon blue">▥</div><div><b>6 月电池出口更新</b><span>Sheet1 · 海关总署</span><small>可交互明细表</small></div><em>打开 →</em></a><a className="report-card" href="#widgets"><div className="report-icon green">↗</div><div><b>电池出口趋势摘要</b><span>自动生成 · 12 个月</span><small>支持导出分析数据</small></div><em>使用 →</em></a><a className="report-card" href="#reports"><div className="report-icon orange">▦</div><div><b>锂电排产更新</b><span>鑫椤锂电 · 2026.08</span><small>等待导入</small></div><em className="muted">待更新</em></a><a className="report-card" href="#reports"><div className="report-icon purple">◌</div><div><b>光伏风电数据库</b><span>价格 · 装机 · 招标</span><small>初版接入中</small></div><em className="muted">待接入</em></a></div><div className="quick-box"><span className="section-kicker">QUICK ACTIONS</span><h3>常用操作</h3><button onClick={() => downloadCsv(countries, month)}>↓ 导出当前目的地明细</button><button onClick={() => window.open("./sheet1/", "_self")}>▥ 打开 Sheet1 汇总表</button><button onClick={() => window.print()}>⌁ 打印当前看板</button></div><div className="tip-box"><b>研究提示</b><p>{continents[0]?.name ?? "主要洲别"}是当前出口金额最高的区域；可在 Sheet1 中按国家、月份和同比快速核对。</p></div></aside>
      </div>
      <footer className="workbench-footer"><span>东吴电新 · Research Workspace</span><span>数据来源：{data.meta.source} · 月度更新</span><span>支持 CSV 导出</span></footer>
    </section>
  </main>;
}
