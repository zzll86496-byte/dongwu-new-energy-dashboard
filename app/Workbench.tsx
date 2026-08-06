"use client";

import { useMemo, useState } from "react";
import rawData from "./data/battery-export.json";

type MetricKey = "amount" | "quantity" | "unitPrice";
type Row = { month: string; amount: number; quantity: number; unitPrice: number | null };
type EntityRow = Row & { name: string };
type DataShape = { meta: { latestMonth: string; source: string; startMonth: string }; total: Row[]; countries: EntityRow[]; provinces: EntityRow[]; continents: EntityRow[] };

const data = rawData as DataShape;
const metricLabels: Record<MetricKey, { label: string; unit: string }> = {
  amount: { label: "出口金额", unit: "亿美元" },
  quantity: { label: "出口数量", unit: "亿个" },
  unitPrice: { label: "平均单价", unit: "美元/个" },
};

function value(row: Row, metric: MetricKey) {
  if (metric === "quantity") return row.quantity / 100_000_000;
  return Number(row[metric] ?? 0);
}

function change(now: number, before?: number | null) {
  if (!before) return null;
  return (now / before - 1) * 100;
}

function signed(value: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[char] ?? char);
}

function buildPptSvg(rows: Row[], metric: MetricKey, title: string) {
  const width = 1600;
  const height = 900;
  const plot = { left: 120, right: 80, top: 180, bottom: 130 };
  const values = rows.map((row) => value(row, metric));
  const max = Math.max(...values, 1);
  const barWidth = (width - plot.left - plot.right) / rows.length * 0.62;
  const gap = (width - plot.left - plot.right) / rows.length;
  const bars = rows.map((row, index) => {
    const current = value(row, metric);
    const barHeight = (height - plot.top - plot.bottom) * current / max;
    const x = plot.left + index * gap + (gap - barWidth) / 2;
    const y = height - plot.bottom - barHeight;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="12" fill="#2f7df4"/><text x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 18).toFixed(1)}" text-anchor="middle" fill="#18365e" font-size="24" font-weight="700">${current.toFixed(1)}</text><text x="${(x + barWidth / 2).toFixed(1)}" y="${height - plot.bottom + 42}" text-anchor="middle" fill="#6c84a7" font-size="21">${escapeXml(row.month.slice(2).replace("-", "."))}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f7faff"/><rect x="48" y="42" width="1504" height="816" rx="28" fill="#fff" stroke="#dce8f7" stroke-width="3"/><text x="100" y="105" fill="#173a70" font-size="34" font-family="Microsoft YaHei,Arial" font-weight="800">${escapeXml(title)}</text><text x="100" y="145" fill="#7690b2" font-size="20" font-family="Microsoft YaHei,Arial">单位：${metricLabels[metric].unit} · 数据来源：海关总署</text><line x1="${plot.left}" y1="${height - plot.bottom}" x2="${width - plot.right}" y2="${height - plot.bottom}" stroke="#c9d9eb" stroke-width="3"/>${bars}<text x="${width - plot.right}" y="${height - 62}" text-anchor="end" fill="#9aacc3" font-size="18" font-family="Microsoft YaHei,Arial">东吴电新 · 数据看板</text></svg>`;
}

function downloadPng(rows: Row[], metric: MetricKey, title: string) {
  const svg = buildPptSvg(rows, metric, title);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600; canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, "-")}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    }, "image/png");
    URL.revokeObjectURL(url);
  };
  image.src = url;
}

export function Workbench() {
  const [metric, setMetric] = useState<MetricKey>("amount");
  const [month, setMonth] = useState(data.meta.latestMonth);
  const latest = data.total.find((row) => row.month === month) ?? data.total.at(-1)!;
  const previous = data.total.find((row) => row.month === data.total[Math.max(0, data.total.indexOf(latest) - 1)]?.month);
  const priorYear = data.total.find((row) => row.month === `${month.slice(0, 4) - 1}-${month.slice(5)}`);
  const latestCountries = data.countries.filter((row) => row.month === month).sort((a, b) => b.amount - a.amount);
  const latestContinents = data.continents.filter((row) => row.month === month).sort((a, b) => b.amount - a.amount);
  const trendRows = useMemo(() => data.total.slice(-12), []);
  const ytd = data.total.filter((row) => row.month.startsWith(month.slice(0, 4)) && row.month <= month).reduce((sum, row) => sum + row.amount, 0);
  const priorYtd = data.total.filter((row) => row.month.startsWith(String(Number(month.slice(0, 4)) - 1)) && row.month.slice(5) <= month.slice(5)).reduce((sum, row) => sum + row.amount, 0);
  const metricNow = value(latest, metric);
  const metricPrev = previous ? value(previous, metric) : null;
  const metricPriorYear = priorYear ? value(priorYear, metric) : null;

  return <main className="workbench-shell">
    <aside className="workbench-sidebar">
      <div className="workbench-brand"><span>DW</span><div><b>东吴电新</b><small>RESEARCH OS</small></div></div>
      <div className="sidebar-label">研究工作台</div>
      <nav className="sidebar-nav">
        <a className="active" href="#home">⌂ <span>数据总览</span></a>
        <a href="#reports">▤ <span>报告中心</span><em>4</em></a>
        <a href="#widgets">◈ <span>我的小组件</span></a>
        <a href="./sheet1/">▦ <span>Sheet1 月报</span></a>
      </nav>
      <div className="sidebar-label">数据主题</div>
      <div className="topic-list"><button>电池出口</button><button>锂电排产</button><button>材料价格</button><button>储能招标</button></div>
      <div className="sidebar-bottom"><span className="live-dot" />数据已更新至 {data.meta.latestMonth}<small>内部研究工作台 · 仅供研究使用</small></div>
    </aside>
    <section className="workbench-main" id="home">
      <header className="workbench-topbar"><div><span className="crumb">RESEARCH WORKSPACE / OVERVIEW</span><h1>数据看板</h1></div><div className="top-actions"><button className="icon-button" aria-label="搜索">⌕</button><button className="avatar">翟</button></div></header>
      <section className="workspace-hero"><div><span className="hero-label">今日研究摘要</span><h2>把每天要看的数据，<br /><strong>集中在一个工作台。</strong></h2><p>快速查看出口、排产和材料价格报告，生成可直接放入 PPT 的图表。</p></div><div className="hero-date"><span>观察月份</span><select value={month} onChange={(event) => setMonth(event.target.value)}>{data.total.map((row) => <option key={row.month}>{row.month}</option>)}</select><b>{latest.amount.toFixed(1)}<small> 亿美元</small></b><span className="positive">同比 {signed(change(latest.amount, priorYear?.amount))}</span></div></section>
      <div className="dashboard-grid">
        <section className="summary-column">
          <div className="section-heading"><div><span className="section-kicker">AT A GLANCE</span><h2>关键指标</h2></div><span className="last-updated">最后更新 {data.meta.latestMonth}</span></div>
          <div className="workbench-kpis"><article><span>出口金额</span><strong>{latest.amount.toFixed(1)}<small>亿美元</small></strong><b className={change(latest.amount, priorYear?.amount)! >= 0 ? "positive" : "negative"}>{signed(change(latest.amount, priorYear?.amount))} <small>同比</small></b></article><article><span>出口数量</span><strong>{(latest.quantity / 100_000_000).toFixed(1)}<small>亿个</small></strong><b className={change(latest.quantity, priorYear?.quantity)! >= 0 ? "positive" : "negative"}>{signed(change(latest.quantity, priorYear?.quantity))} <small>同比</small></b></article><article><span>年初至今</span><strong>{ytd.toFixed(1)}<small>亿美元</small></strong><b className={change(ytd, priorYtd)! >= 0 ? "positive" : "negative"}>{signed(change(ytd, priorYtd))} <small>累计同比</small></b></article><article><span>第一大目的地</span><strong className="word-value">{latestCountries[0]?.name ?? "—"}</strong><b>{latestCountries[0]?.amount.toFixed(1)} <small>亿美元</small></b></article></div>
          <article className="widget-panel chart-widget" id="widgets"><div className="widget-heading"><div><span className="section-kicker">PPT CHART WIDGET</span><h3>月度出口趋势</h3><p>选择指标后，一键下载 16:9 PNG 图，可直接插入 PPT。</p></div><button className="download-button" onClick={() => downloadPng(trendRows, metric, `国内电池出口-${metricLabels[metric].label}`)}>↓ 下载 PPT 图</button></div><div className="widget-toolbar"><div className="mini-tabs">{(Object.keys(metricLabels) as MetricKey[]).map((key) => <button key={key} className={metric === key ? "active" : ""} onClick={() => setMetric(key)}>{metricLabels[key].label}</button>)}</div><span>{metricLabels[metric].unit}</span></div><div className="bar-chart" aria-label="月度出口趋势图">{trendRows.map((row) => <div className="bar-item" key={row.month}><div className="bar-value">{value(row, metric).toFixed(1)}</div><div className="bar-track-vertical"><i style={{ height: `${Math.max(8, value(row, metric) / Math.max(...trendRows.map((item) => value(item, metric)), 1) * 100)}%` }} /></div><small>{row.month.slice(2).replace("-", ".")}</small></div>)}</div></article>
          <div className="lower-grid"><article className="widget-panel ranking-widget"><div className="widget-heading"><div><span className="section-kicker">TOP DESTINATIONS</span><h3>{month} 目的地排行</h3></div><a href="./sheet1/">查看 Sheet1 →</a></div>{latestCountries.slice(0, 6).map((row, index) => <div className="compact-rank" key={row.name}><b>{String(index + 1).padStart(2, "0")}</b><span>{row.name}</span><i><em style={{ width: `${row.amount / Math.max(latestCountries[0]?.amount ?? 1, 1) * 100}%` }} /></i><strong>{row.amount.toFixed(1)}</strong></div>)}</article><article className="widget-panel mix-widget"><div className="widget-heading"><div><span className="section-kicker">CONTINENT MIX</span><h3>洲别结构</h3></div><span>{month}</span></div>{latestContinents.slice(0, 5).map((row, index) => <div className="mix-row" key={row.name}><span><i className={`mix-dot dot-${index}`} />{row.name}</span><strong>{row.amount.toFixed(1)}<small> 亿美元</small></strong></div>)}</article></div>
        </section>
        <aside className="reports-column" id="reports"><div className="section-heading"><div><span className="section-kicker">REPORT HUB</span><h2>报告中心</h2></div><button className="text-button">管理 →</button></div><div className="report-list"><a className="report-card featured-report" href="./sheet1/"><div className="report-icon blue">▦</div><div><b>6月电池出口更新</b><span>Sheet1 · 海关总署</span><small>可交互明细表</small></div><em>打开 →</em></a><a className="report-card" href="#widgets"><div className="report-icon green">↗</div><div><b>锂电出口趋势摘要</b><span>自动生成 · 12个月</span><small>已准备好 PPT 图</small></div><em>使用 →</em></a><a className="report-card" href="#reports"><div className="report-icon orange">◷</div><div><b>8月锂电排产更新</b><span>鑫椤锂电 · 2026.08</span><small>数据待导入</small></div><em className="muted">待更新</em></a><a className="report-card" href="#reports"><div className="report-icon purple">◒</div><div><b>材料价格跟踪</b><span>SMM · 日度/周度</span><small>数据待接入</small></div><em className="muted">待更新</em></a></div><div className="quick-box"><span className="section-kicker">QUICK ACTIONS</span><h3>常用操作</h3><button onClick={() => downloadPng(trendRows, "amount", "国内电池出口金额趋势")}>▣ 生成出口金额图</button><button onClick={() => window.open("./sheet1/", "_self")}>▤ 打开 Sheet1 汇总表</button><button onClick={() => window.print()}>⌁ 打印当前看板</button></div><div className="tip-box"><b>研究提示</b><p>{latestContinents[0]?.name ?? "主要洲别"}仍是当前出口金额最高的区域；可在 Sheet1 中按国家、月份和同比快速核对。</p></div></aside>
      </div>
      <footer className="workbench-footer"><span>东吴电新 · Research Workspace</span><span>数据来源：{data.meta.source} · 月度更新</span><span>支持 PNG / CSV 导出</span></footer>
    </section>
  </main>;
}
