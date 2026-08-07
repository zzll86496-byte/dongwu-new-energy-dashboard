import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the lithium planning dashboard shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>东吴电新｜锂电产业链排产数据库<\/title>/);
  assert.match(html, /PLANNING DASHBOARD/);
  assert.match(html, /产业环节/);
  assert.match(html, /2026-08/);
  assert.match(html, /环比观察/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("renders the dense reference-style planning modules", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /总量趋势/);
  assert.match(html, /企业横向对比/);
  assert.match(html, /纵向数据/);
  assert.match(html, /企业结构/);
  assert.match(html, /原始数据/);
  assert.match(html, /点击企业或单元格可联动图表/);
});
