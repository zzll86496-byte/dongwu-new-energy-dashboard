import type { Metadata } from "next";
import "./installation.css";
import "./install-summary.css";
import "../research-system.css";

export const metadata: Metadata = {
  title: "电动车装机数据库 · 核心长图 · 5000",
  description: "按Excel核心长图口径重绘的动力电池装机研究看板",
};

const headerLayoutCss = `
.workspace>main{padding-top:12px}
.domestic-main,.chemistry-main,.chinaRank-main,.global-main{display:grid;grid-template-columns:minmax(190px,.62fr) minmax(0,3.38fr);gap:10px 12px;align-items:stretch}
.global-main{grid-template-columns:minmax(320px,.9fr) minmax(0,3.1fr)}
.domestic-main>.page-head,.chemistry-main>.page-head,.chinaRank-main>.page-head,.global-main>.page-head{grid-column:1;grid-row:1;min-height:88px;margin:0;padding:8px 4px;align-items:center}
.domestic-main>.page-head h1,.chemistry-main>.page-head h1,.chinaRank-main>.page-head h1,.global-main>.page-head h1{font-size:21px;line-height:1.2}
.domestic-main>.install-dashboard,.chemistry-main>.structure-dashboard,.chinaRank-main>.maker-module,.global-main>.global-module{display:contents}
.domestic-main .summary-kpis{grid-column:2;grid-row:1;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.domestic-main .summary-kpis article,.chinaRank-main .kpi,.global-main .kpi{min-width:0;min-height:88px;padding:10px 12px;border-radius:9px}
.domestic-main .summary-kpis article>span,.chinaRank-main .kpi>span,.global-main .kpi>span{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.domestic-main .summary-kpis strong,.chinaRank-main .kpi strong,.global-main .kpi strong{margin-top:7px;font-size:22px;white-space:nowrap}
.domestic-main .summary-kpis small,.chinaRank-main .kpi div b,.global-main .kpi div b{font-size:9px;margin-left:5px}
.domestic-main .summary-kpis p,.chinaRank-main .kpi p,.global-main .kpi p{margin-top:7px;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.domestic-main .dashboard-toolbar{grid-column:1/-1;grid-row:2}.domestic-main .main-grid{grid-column:1/-1;grid-row:3}.domestic-main .battery-grid{grid-column:1/-1;grid-row:4}
.chinaRank-main .kpi-grid,.global-main .kpi-grid{grid-column:2;grid-row:1;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}
.chinaRank-main .maker-control-card{grid-column:1/-1;grid-row:2;margin:0}.chinaRank-main .maker-dashboard-grid{grid-column:1/-1;grid-row:3}
.global-main .market-scope-tabs{grid-column:1;grid-row:2;width:100%;height:auto;margin:0;align-self:stretch}.global-main .market-scope-tabs button{height:100%}.global-main .maker-control-card{grid-column:2;grid-row:2;margin:0}.global-main .maker-dashboard-grid{grid-column:1/-1;grid-row:3}
.chemistry-main .structure-toolbar{grid-column:2;grid-row:1;min-height:88px;margin:0;padding:8px 10px}.chemistry-main .structure-grid,.chemistry-main .vehicle-total-grid{grid-column:1/-1;grid-row:2}.chemistry-main .company-line-panel{grid-column:1/-1;grid-row:3}
@media(max-width:1250px){.domestic-main,.chemistry-main,.chinaRank-main{grid-template-columns:minmax(160px,.5fr) minmax(0,3.5fr)}.global-main{grid-template-columns:minmax(280px,.85fr) minmax(0,3.15fr)}.domestic-main>.page-head h1,.chemistry-main>.page-head h1,.chinaRank-main>.page-head h1,.global-main>.page-head h1{font-size:18px}.domestic-main .summary-kpis article,.chinaRank-main .kpi,.global-main .kpi{padding:9px 10px}.domestic-main .summary-kpis strong,.chinaRank-main .kpi strong,.global-main .kpi strong{font-size:19px}.chemistry-main .view-tabs button{padding-inline:11px}}
@media(max-width:900px){.domestic-main,.chemistry-main,.chinaRank-main,.global-main{display:block}.domestic-main>.page-head,.chemistry-main>.page-head,.chinaRank-main>.page-head,.global-main>.page-head{min-height:64px;margin-bottom:9px}.domestic-main>.install-dashboard,.chemistry-main>.structure-dashboard{display:flex}.chinaRank-main>.maker-module,.global-main>.global-module{display:block}.domestic-main .summary-kpis,.chinaRank-main .kpi-grid,.global-main .kpi-grid{grid-template-columns:1fr 1fr;margin-bottom:10px}.global-main .market-scope-tabs{margin-bottom:14px}.chemistry-main .structure-toolbar{min-height:58px;margin-bottom:10px}}
@media(max-width:560px){.domestic-main .summary-kpis,.chinaRank-main .kpi-grid,.global-main .kpi-grid{grid-template-columns:1fr}}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><style>{headerLayoutCss}</style>{children}</>;
}
