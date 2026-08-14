import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, "http://localhost/"), {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Soochow research database index", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN"/);
  assert.match(html, /东吴电新｜新能源产业链数据库研究索引/);
  assert.match(html, /新能源产业链数据库/);
  assert.match(html, /选择数据库进入查询/);
  assert.match(html, /最新数据：电动车销量已覆盖至2026年7月/);
  assert.match(html, /储能电池产业链数据库/);
  assert.match(html, /国内电动车销量数据库/);
  assert.doesNotMatch(html, /type="search"|搜索数据库|电新数据库/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/);
});

test("keeps all six database routes and the branded asset", async () => {
  const [page, css, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/portal-home.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    access(new URL("public/soochow-securities.png", projectRoot)),
  ]);

  for (const route of [
    "/database",
    "/lithium",
    "/battery-export",
    "/vehicle-supply",
    "/installation",
    "/sales",
  ]) {
    assert.match(page, new RegExp(`href: "${route}"`));
  }

  assert.match(page, /aria-label="数据库入口"/);
  assert.doesNotMatch(page, /index:|→|simple-search|useState|useMemo/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(page, /commercial-vehicle|商用车数据库/);
  assert.doesNotMatch(css, /database-portal__card:nth-child\(7\)/);
  assert.match(layout, /<html lang="zh-CN">/);
  assert.doesNotMatch(layout, /Geist|next\/font\/google/);
});

test("keeps the approved planning template across database interfaces", async () => {
  const [sharedCss, storage, lithium, batteryExport, installationCss, supply, supplyCss, sales, salesCoreCss, salesSelectCss] = await Promise.all([
    readFile(new URL("../app/research-template.css", import.meta.url), "utf8"),
    readFile(new URL("../app/DatabasePage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LithiumDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/BatteryExportDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/installation-frame/research-template.css", import.meta.url), "utf8"),
    readFile(new URL("../app/vehicle-supply-frame/VehicleSupplyDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/vehicle-supply-frame/research-template.css", import.meta.url), "utf8"),
    readFile(new URL("../app/sales/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sales/core-charts.css", import.meta.url), "utf8"),
    readFile(new URL("../app/sales/selects.css", import.meta.url), "utf8"),
  ]);

  assert.match(sharedCss, /--research-navy:\s*#153e6c/);
  assert.match(sharedCss, /width:\s*146px/);
  assert.match(storage, /className="app-shell database-template"/);
  assert.match(lithium, /className="planning-sidebar"/);
  assert.match(batteryExport, /className="export-sidebar"/);
  assert.match(installationCss, /grid-template-columns:\s*146px minmax\(0, 1fr\)/);
  assert.match(supply, /className="supply-sidebar"/);
  assert.match(supplyCss, /grid-template-columns:\s*146px minmax\(0, 1fr\)/);
  assert.match(sales, /className="sales-sidebar"/);
  assert.doesNotMatch(sales, /LONG-CHART CORE|销量长图核心图表|core-chart-heading/);
  assert.match(sales, /className="core-model-toolbar"/);
  assert.match(sales, /core-chart-grid--three-tail/);
  assert.doesNotMatch(sales, /<select\b|<option\b/);
  assert.match(sales, /role="combobox"/);
  assert.match(sales, /role="listbox"/);
  assert.match(sales, /aria-activedescendant/);
  assert.match(salesSelectCss, /\.sales-select-menu button\.selected/);
  assert.match(salesSelectCss, /\.sales-select-trigger:focus-visible/);
  assert.match(salesSelectCss, /@media \(pointer: coarse\)/);
  assert.match(salesCoreCss, /nth-last-child\(-n\+3\)\{grid-column:span 2\}/);
  assert.match(salesCoreCss, /core-chart-grid--single \.core-chart-card\{grid-column:auto;width:min\(100%,1760px\)\}/);
  assert.match(salesCoreCss, /core-chart-grid--single \.core-chart-card svg\{height:clamp\(320px,24vw,460px\)\}/);
  for (const source of [storage, lithium, batteryExport, supply, sales]) {
    assert.match(source, /soochow-securities\.png/);
    assert.match(source, /alt="东吴证券 Soochow Securities"/);
  }

  const installation = await readFile(new URL("../app/installation-frame/page.tsx", import.meta.url), "utf8");
  assert.match(installation, /soochow-securities\.png/);
  assert.match(installation, /alt="东吴证券 Soochow Securities"/);
  await assert.rejects(access(new URL("public/commercial-vehicle-dashboard.html", projectRoot)));
});
