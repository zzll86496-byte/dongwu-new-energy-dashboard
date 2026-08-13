const entries = [
  { href: "/database", index: "01", kicker: "储能电池产业链", title: "储能电池产业链数据库", description: "价格、产能、产量、开工率与出货量的完整数据查询与趋势分析。", tags: ["11类价格", "21家产能企业", "21家出货企业"], tone: "navy" },
  { href: "/lithium", index: "02", kicker: "锂电产业链排产", title: "锂电产业链排产数据库", description: "按产业环节、分析月份和企业查看排产原始数据、趋势与环比变化。", tags: ["产业环节", "企业横向对比", "原始数据联动"], tone: "blue" },
  { href: "/battery-export", index: "03", kicker: "海关出口数据", title: "国内电池出口数据库", description: "按月份、目的国、出发省份与洲别查看电池出口金额、数量和单价。", tags: ["目的国", "出发省份", "洲别结构"], tone: "navy" },
  { href: "/commercial-vehicle", index: "04", kicker: "新能源商用车", title: "商用车数据库", description: "新能源商用车与电动重卡销量、装机量及单车带电量数据。", tags: ["商用车销量", "电动重卡", "装机电量"], tone: "blue" },
  { href: "/vehicle-supply", index: "05", kicker: "动力电池配套", title: "动力电池车企配套数据库", description: "国内动力电池装机规模、车企供应关系与单车企供应结构。", tags: ["行业总览", "供应关系", "单车企详情"], tone: "navy" },
  { href: "/installation", index: "06", kicker: "动力电池装机", title: "电动车装机数据库", description: "动力电池装机汇总、材料结构、产销装出口及国内外厂商排名。", tags: ["装机电量", "电池结构", "全球排名"], tone: "blue" },
  { href: "/sales", index: "07", kicker: "国内电动车销量", title: "国内电动车销量数据库", description: "乘联会批发与零售口径、企业对比和分车型月度销量分析。", tags: ["批发与零售", "企业选择", "分车型"], tone: "navy" },
];

export default function Home() {
  return <main className="portal-home">
    <header className="portal-header"><div className="portal-brand"><span>东吴</span><div><strong>东吴证券</strong><small>SOOCHOW SECURITIES</small></div></div></header>
    <section className="portal-hero"><h1>新能源产业链数据库入口</h1></section>
    <section className="portal-grid">{entries.map((entry) => <a className="portal-card" href={entry.href} key={entry.href}><h2>{entry.title}</h2><div className="portal-card-top"><span>{entry.index}</span><b>进入　→</b></div></a>)}</section>
    <footer className="portal-footer">东吴电新 · 本地数据库工作台 · 选择上方数据库开始使用</footer>
  </main>;
}
