"use client";

import { useState } from "react";

type Module = { name: string; desc: string; update: string; status: "已接入" | "整理中"; icon: string; tone: string };
const modules: Module[] = [
  { name: "光伏价格数据库", desc: "硅料、硅片、电池片、组件、玻璃、EVA、POE 与石英砂价格", update: "2026-07-24", status: "整理中", icon: "¥", tone: "blue" },
  { name: "光伏成本与盈利", desc: "产业链成本拆分、原材料价格、单位成本和盈利测算", update: "2026-07-24", status: "整理中", icon: "◒", tone: "green" },
  { name: "国内光伏装机", desc: "国内装机、户用装机、组件招标、组件与逆变器出口", update: "2026-07-01", status: "整理中", icon: "▥", tone: "orange" },
  { name: "海外光伏装机", desc: "全球及主要国家的光伏装机、结构和出货数据", update: "2026-07-07", status: "整理中", icon: "◎", tone: "purple" },
  { name: "风电装机数据库", desc: "国内外风电装机、发电量、利用小时、弃风率和政策", update: "2026-07-31", status: "整理中", icon: "≋", tone: "teal" },
  { name: "组件招标与中标", desc: "招标规模、开标价格、中标供应商和技术路线", update: "2026-07-17", status: "整理中", icon: "▦", tone: "red" },
  { name: "全国电力统计", desc: "光伏、风电、水火电装机、利用小时及电源电网投资", update: "2026-07-22", status: "整理中", icon: "⚡", tone: "navy" },
  { name: "月度产业链报告", desc: "硅料进口、硅片/玻璃/组件/电池出口及国家历史序列", update: "2026-06", status: "整理中", icon: "▤", tone: "gold" },
];

export function Workbench() {
  const [active, setActive] = useState("全部数据库");
  const [query, setQuery] = useState("");
  const topics = ["全部数据库", "光伏", "风电", "价格与盈利", "装机与电力", "招标与报告"];
  const visible = modules.filter((m) => {
    const matchText = !query || `${m.name}${m.desc}`.includes(query.trim());
    if (active === "全部数据库") return matchText;
    if (active === "光伏") return matchText && m.name.includes("光伏");
    if (active === "风电") return matchText && m.name.includes("风电");
    if (active === "价格与盈利") return matchText && (m.name.includes("价格") || m.name.includes("盈利"));
    if (active === "装机与电力") return matchText && (m.name.includes("装机") || m.name.includes("电力"));
    return matchText && (m.name.includes("招标") || m.name.includes("报告"));
  });

  return <main className="workbench-shell">
    <aside className="workbench-sidebar"><div className="workbench-brand"><span>DW</span><div><b>东吴电新</b><small>RESEARCH OS</small></div></div><div className="sidebar-label">研究工作台</div><nav className="sidebar-nav"><a className="active" href="#home">⌂<span>数据库总览</span></a><a href="#modules">▦<span>数据模块</span><em>{modules.length}</em></a><a href="#workflow">◌<span>更新流程</span></a></nav><div className="sidebar-label">当前版本</div><div className="topic-list"><button>光伏数据库</button><button>风电数据库</button><button>产业链数据</button></div><div className="sidebar-bottom"><span className="live-dot" />新能源数据库初版<small>先完成模块入口，再逐个接入明细和图表</small></div></aside>
    <section className="workbench-main" id="home"><header className="workbench-topbar"><div><span className="crumb">RESEARCH WORKSPACE / DATABASE HUB</span><h1>新能源数据库看板</h1></div><div className="top-actions"><button className="icon-button" aria-label="搜索">⌕</button><button className="avatar">研</button></div></header>
      <section className="workspace-hero"><div><span className="hero-label">新能源研究工作台</span><h2>把光伏、风电和产业链数据，<br /><strong>整理成一个入口。</strong></h2><p>这是独立于电池出口数据库的新看板，先搭建数据库目录和更新状态，再逐步加入交互图表与 PPT 小组件。</p></div><div className="hero-date"><span>当前版本</span><b>初版<small> Database Hub</small></b><span className="positive">8 个数据库模块</span></div></section>
      <div className="section-heading" id="modules"><div><span className="section-kicker">DATABASE MODULES</span><h2>数据库入口</h2></div><div className="search"><span>筛选</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索数据库" /></div></div>
      <div className="segmented" style={{ marginBottom: 18 }}>{topics.map((topic) => <button key={topic} className={active === topic ? "active" : ""} onClick={() => setActive(topic)}>{topic}</button>)}</div>
      <div className="module-grid">{visible.map((m) => <article className="module-card" key={m.name}><div className={`module-icon ${m.tone}`}>{m.icon}</div><div className="module-card-body"><div className="module-card-top"><span>{m.status}</span><small>更新至 {m.update}</small></div><h3>{m.name}</h3><p>{m.desc}</p><button className="module-open">进入模块 <b>→</b></button></div></article>)}</div>
      <section className="workflow-panel" id="workflow"><div><span className="section-kicker">UPDATE WORKFLOW</span><h2>后续接入顺序</h2><p>先把每个 Excel 变成独立数据模块，再补充趋势图、筛选器、下载和 PPT 图表生成。</p></div><div className="workflow-steps"><span><b>01</b>原始数据</span><i>→</i><span><b>02</b>计算模型</span><i>→</i><span><b>03</b>可视化</span><i>→</i><span><b>04</b>PPT 小组件</span></div></section>
      <footer className="workbench-footer"><span>东吴电新 · New Energy Database Hub</span><span>当前站点不包含电池出口数据库</span><span>持续更新中</span></footer>
    </section>
  </main>;
}
