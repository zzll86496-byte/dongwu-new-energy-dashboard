"use client";

import { useEffect, useMemo, useState } from "react";
import rawData from "./data/battery-export.json";
import { exportChartWorkbook, type ChartWorkbookSpec } from "./excel-export";
import "./export.css";
import "./research-template.css";

type Metric = { period:string; amount:number|null; mom:number|null; yoy:number|null; cumulative:number|null; cumulativeYoy:number|null; quantity:number|null; quantityMom:number|null; quantityYoy:number|null; unitPrice:number|null; unitMom:number|null; unitYoy:number|null };
type Entity = { name:string; values:Metric[] };
type ExportData = { meta:{ title:string; source:string; latestPeriod:string; updated:string; unit:string; note:string }; periods:string[]; totals:Metric[]; dimensions:{ countries:Entity[]; provinces:Entity[]; continents:Entity[] } };

const data = rawData as ExportData;
const colors = ["#12355e", "#a99b5a", "#8c8c8e", "#6f7d8c", "#ed7d31", "#c9c9c9"];
const labels = { countries:"目的国", provinces:"出发省份", continents:"洲别" } as const;
const fmt = (value:number|null|undefined, digits=1) => value == null ? "—" : value.toLocaleString("zh-CN", { minimumFractionDigits:digits, maximumFractionDigits:digits });
const pct = (value:number|null|undefined) => value == null ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
const periodLabel = (period:string) => `${period.slice(2,4)}.${period.slice(4)}`;
const longPeriod = (period:string) => `${period.slice(0,4)}-${period.slice(4)}`;
const at = (entity:Entity, period:string) => entity.values.find((item) => item.period === period);

function TrendChart({ series, selected, onSelect, start, end }:{ series:Metric[]; selected:string; onSelect:(period:string)=>void; start:string; end:string }) {
  const startIndex = Math.max(0, series.findIndex((item)=>item.period===start));
  const endIndex = Math.max(0, series.findIndex((item)=>item.period===end));
  const recent = series.slice(Math.min(startIndex,endIndex), Math.max(startIndex,endIndex)+1);
  const max = Math.max(...recent.map((item) => item.amount ?? 0), 1) * 1.13;
  const points = recent.map((item, index) => ({ item, x:52 + index * 646 / Math.max(recent.length - 1, 1), y:170 - ((item.amount ?? 0) / max) * 132 }));
  return <div className="export-trend"><svg viewBox="0 0 730 205" role="img" aria-label="电池出口金额趋势">
    {[0,1,2,3].map((step) => { const y=170-step*44; return <g key={step}><line x1="52" y1={y} x2="698" y2={y}/><text x="43" y={y+4} textAnchor="end">{fmt(max*step/3,0)}</text></g>; })}
    <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#12355e" strokeWidth="2.3" />
    {points.map(({item,x,y}, index) => <g className="trend-point" key={item.period} onClick={() => onSelect(item.period)}><circle cx={x} cy={y} r={item.period===selected?5:3} className={item.period===selected?"active":""}/>{index%2===0 && <text x={x} y="191" textAnchor="middle">{periodLabel(item.period)}</text>}<title>{longPeriod(item.period)}：{fmt(item.amount,2)}亿美元</title></g>)}
  </svg></div>;
}

function ExportRange({ label, periods, start, end, onStart, onEnd }:{ label:string; periods:string[]; start:string; end:string; onStart:(value:string)=>void; onEnd:(value:string)=>void }) {
  return <div className="export-chart-range"><select aria-label={`${label}起始月份`} value={start} onChange={(event)=>onStart(event.target.value)}>{periods.map((item)=><option key={item} value={item}>{periodLabel(item)}</option>)}</select><i>—</i><select aria-label={`${label}结束月份`} value={end} onChange={(event)=>onEnd(event.target.value)}>{periods.map((item)=><option key={item} value={item}>{periodLabel(item)}</option>)}</select></div>;
}

export function BatteryExportDashboard() {
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState(data.meta.latestPeriod);
  const [dimension, setDimension] = useState<keyof typeof labels>("countries");
  const [selectedName, setSelectedName] = useState("");
  const [exporting, setExporting] = useState("");
  const defaultRangeStart = data.periods.slice(-18)[0] ?? data.periods[0];
  const defaultRangeEnd = data.periods.at(-1)!;
  const [totalStart, setTotalStart] = useState(defaultRangeStart);
  const [totalEnd, setTotalEnd] = useState(defaultRangeEnd);
  const [entityStart, setEntityStart] = useState(defaultRangeStart);
  const [entityEnd, setEntityEnd] = useState(defaultRangeEnd);
  const total = data.totals.find((item) => item.period === period) ?? data.totals.at(-1)!;
  const ranking = useMemo(() => data.dimensions[dimension].map((entity) => ({ entity, metric:at(entity, period) })).filter((item) => item.metric?.amount != null).sort((a,b) => (b.metric?.amount ?? 0)-(a.metric?.amount ?? 0)), [dimension, period]);
  const selected = ranking.find((item) => item.entity.name === selectedName) ?? ranking[0];
  const continents = data.dimensions.continents.map((entity) => ({ name:entity.name, value:at(entity, period)?.amount ?? 0 })).sort((a,b) => b.value-a.value);
  const continentTotal = continents.reduce((sum,item) => sum+item.value,0) || 1;
  let angle=0;
  const donut = continents.map((item,index) => { const start=angle; angle += item.value/continentTotal*100; return `${colors[index%colors.length]} ${start}% ${angle}%`; }).join(",");
  const maxRank = ranking[0]?.metric?.amount ?? 1;
  const selectedSeries = selected?.entity.values ?? [];
  const between = (series:Metric[], start:string, end:string) => {
    const startIndex=Math.max(0,series.findIndex((item)=>item.period===start));
    const endIndex=Math.max(0,series.findIndex((item)=>item.period===end));
    return series.slice(Math.min(startIndex,endIndex),Math.max(startIndex,endIndex)+1);
  };
  const runExport = async (key:string, spec:ChartWorkbookSpec) => {
    if (exporting) return;
    setExporting(key);
    try { await exportChartWorkbook(spec); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Excel导出失败，请重试"); }
    finally { setExporting(""); }
  };
  const exportTotalTrend = () => {
    const visible = between(data.totals,totalStart,totalEnd);
    return runExport("total", { title:"电池出口总额趋势", unit:"亿美元", chart:{ type:"line", categories:visible.map((item)=>periodLabel(item.period)), series:[{ name:"出口额", color:colors[0], values:visible.map((item)=>item.amount) }] }, headers:["月份","出口额","环比","同比","累计出口额","累计同比","出口数量","出口单价"], rows:data.totals.map((item)=>[longPeriod(item.period),item.amount,item.mom,item.yoy,item.cumulative,item.cumulativeYoy,item.quantity,item.unitPrice]), percentColumns:[2,3,5], fileName:"电池出口总额趋势" });
  };
  const exportContinents = () => runExport("continents", { title:`洲别结构_${longPeriod(period)}`, unit:"亿美元", chart:{ type:"donut", categories:continents.map((item)=>item.name), series:[{ name:"洲别", color:colors[0], values:continents.map((item)=>item.value) }] }, headers:["洲别","出口额","占比"], rows:continents.map((item)=>[item.name,item.value,item.value/continentTotal]), percentColumns:[2], fileName:`洲别结构_${longPeriod(period)}` });
  const exportRanking = () => {
    const visible = ranking.slice(0,14);
    return runExport("ranking", { title:`${labels[dimension]}出口排名_${longPeriod(period)}`, unit:"亿美元", chart:{ type:"bar", categories:visible.map((item)=>item.entity.name), series:[{ name:"出口额", color:colors[0], values:visible.map((item)=>item.metric?.amount) }] }, headers:[labels[dimension],"出口额","环比","同比","累计出口额","累计同比","出口数量","出口单价"], rows:ranking.map((item)=>[item.entity.name,item.metric?.amount,item.metric?.mom,item.metric?.yoy,item.metric?.cumulative,item.metric?.cumulativeYoy,item.metric?.quantity,item.metric?.unitPrice]), percentColumns:[2,3,5], fileName:`${labels[dimension]}出口排名_${longPeriod(period)}` });
  };
  const exportEntityTrend = () => {
    const visible = between(selectedSeries,entityStart,entityEnd);
    const name = selected?.entity.name ?? labels[dimension];
    return runExport("entity", { title:`${name}历史趋势`, unit:"亿美元", chart:{ type:"line", categories:visible.map((item)=>periodLabel(item.period)), series:[{ name, color:colors[0], values:visible.map((item)=>item.amount) }] }, headers:["月份","出口额","环比","同比","累计出口额","累计同比","出口数量","出口单价"], rows:selectedSeries.map((item)=>[longPeriod(item.period),item.amount,item.mom,item.yoy,item.cumulative,item.cumulativeYoy,item.quantity,item.unitPrice]), percentColumns:[2,3,5], fileName:`${name}历史趋势` });
  };

  useEffect(() => setReady(true), []);
  if (!ready) return <main className="export-shell"><div className="export-loading">国内电池出口数据库加载中…</div></main>;

  return <main className="export-shell"><div className="export-layout">
    <aside className="export-sidebar">
      <a className="export-brand" href="/"><span>东吴</span><div><strong>东吴电新</strong><small>NEW ENERGY DATA</small></div></a>
      <div className="export-side-block"><label>分析月份</label><select value={period} onChange={(event) => setPeriod(event.target.value)}>{[...data.periods].reverse().map((item) => <option value={item} key={item}>{longPeriod(item)}</option>)}</select></div>
      <div className="export-side-block"><label>分析维度</label><nav>{(Object.keys(labels) as (keyof typeof labels)[]).map((key) => <button className={dimension===key?"active":""} key={key} onClick={() => { setDimension(key); setSelectedName(""); }}><i />{labels[key]}</button>)}</nav></div>
      <div className="export-side-block"><label>当前选择</label><div className="export-selection"><strong>{selected?.entity.name ?? "—"}</strong><span>{labels[dimension]} · {longPeriod(period)}</span></div></div>
      <div className="export-side-note"><b>交互说明</b><p>切换月份与维度，点击榜单项目可联动下方历史趋势。</p></div>
      <div className="export-source">数据来源：{data.meta.source}<br/>更新至：{data.meta.updated}</div>
    </aside>
    <section className="export-main">
      <header className="export-topbar"><div><span>DONGWU NEW ENERGY · EXPORT DATABASE</span><h1>{data.meta.title}</h1><p>电池 · {longPeriod(period)} · 金额口径</p></div></header>
      <section className="export-kpis">
        <article><span>当月出口额</span><strong>{fmt(total.amount,2)}<small>亿美元</small></strong><p>环比 <b className={(total.mom??0)<0?"negative":"positive"}>{pct(total.mom)}</b></p></article>
        <article><span>当月同比</span><strong>{pct(total.yoy)}</strong><p>出口金额同比变化</p></article>
        <article><span>累计出口额</span><strong>{fmt(total.cumulative,1)}<small>亿美元</small></strong><p>累计同比 <b className={(total.cumulativeYoy??0)<0?"negative":"positive"}>{pct(total.cumulativeYoy)}</b></p></article>
        <article><span>出口数量</span><strong>{fmt((total.quantity??0)/100000000,2)}<small>亿个</small></strong><p>环比 <b className={(total.quantityMom??0)<0?"negative":"positive"}>{pct(total.quantityMom)}</b></p></article>
        <article><span>出口单价</span><strong>{fmt(total.unitPrice,2)}<small>美元/个</small></strong><p>环比 <b className={(total.unitMom??0)<0?"negative":"positive"}>{pct(total.unitMom)}</b></p></article>
      </section>
      <section className="export-card total-trend"><div className="export-card-head"><b>01 出口总额趋势</b><div className="export-head-actions"><ExportRange label="出口总额趋势" periods={data.periods} start={totalStart} end={totalEnd} onStart={setTotalStart} onEnd={setTotalEnd}/><button disabled={!!exporting} onClick={exportTotalTrend}>{exporting==="total"?"生成中":"导出Excel"}</button><span>亿美元</span></div></div><TrendChart series={data.totals} selected={period} onSelect={setPeriod} start={totalStart} end={totalEnd}/></section>
      <section className="export-card continent-card"><div className="export-card-head"><b>02 洲别结构</b><div className="export-head-actions"><button disabled={!!exporting} onClick={exportContinents}>{exporting==="continents"?"生成中":"导出Excel"}</button><span>{longPeriod(period)}</span></div></div><div className="continent-body"><div className="export-donut" style={{background:`conic-gradient(${donut})`}}><div><strong>{fmt(total.amount,1)}</strong><small>亿美元</small></div></div><div className="continent-list">{continents.map((item,index) => <div key={item.name}><i style={{background:colors[index%colors.length]}}/><span>{item.name}</span><b>{(item.value/continentTotal*100).toFixed(1)}%</b></div>)}</div></div></section>
      <section className="export-card ranking-card"><div className="export-card-head"><b>03 {labels[dimension]}出口排名</b><div className="export-head-actions"><button disabled={!!exporting} onClick={exportRanking}>{exporting==="ranking"?"生成中":"导出Excel"}</button><span>点击联动</span></div></div><div className="export-ranking">{ranking.slice(0,14).map((item,index) => <button className={selected?.entity.name===item.entity.name?"active":""} key={item.entity.name} onClick={() => setSelectedName(item.entity.name)}><em>{String(index+1).padStart(2,"0")}</em><span>{item.entity.name}</span><i><b style={{width:`${(item.metric!.amount!/maxRank)*100}%`}}/></i><strong>{fmt(item.metric?.amount,2)}</strong><small className={(item.metric?.yoy??0)<0?"negative":"positive"}>{pct(item.metric?.yoy)}</small></button>)}</div></section>
      <section className="export-card entity-card"><div className="export-card-head"><b>04 {selected?.entity.name ?? labels[dimension]}历史趋势</b><div className="export-head-actions"><ExportRange label="企业历史趋势" periods={data.periods} start={entityStart} end={entityEnd} onStart={setEntityStart} onEnd={setEntityEnd}/><button disabled={!!exporting} onClick={exportEntityTrend}>{exporting==="entity"?"生成中":"导出Excel"}</button><span>亿美元</span></div></div><TrendChart series={selectedSeries} selected={period} onSelect={setPeriod} start={entityStart} end={entityEnd}/></section>
      <section className="export-card table-card"><div className="export-card-head"><b>05 明细数据</b><span>{labels[dimension]} · {longPeriod(period)}</span></div><div className="export-table-wrap"><table><thead><tr><th>{labels[dimension]}</th><th>出口额（亿美元）</th><th>环比</th><th>同比</th><th>累计额（亿美元）</th><th>累计同比</th><th>出口数量（万个）</th><th>单价（美元/个）</th></tr></thead><tbody>{ranking.map((item) => <tr className={selected?.entity.name===item.entity.name?"selected":""} key={item.entity.name} onClick={() => setSelectedName(item.entity.name)}><th>{item.entity.name}</th><td>{fmt(item.metric?.amount,2)}</td><td className={(item.metric?.mom??0)<0?"negative":"positive"}>{pct(item.metric?.mom)}</td><td className={(item.metric?.yoy??0)<0?"negative":"positive"}>{pct(item.metric?.yoy)}</td><td>{fmt(item.metric?.cumulative,2)}</td><td className={(item.metric?.cumulativeYoy??0)<0?"negative":"positive"}>{pct(item.metric?.cumulativeYoy)}</td><td>{fmt((item.metric?.quantity??0)/10000,0)}</td><td>{fmt(item.metric?.unitPrice,2)}</td></tr>)}</tbody></table></div></section>
      <footer className="export-footer"><span>{data.meta.note}</span><span>数据来源：{data.meta.source}</span></footer>
    </section>
  </div></main>;
}
