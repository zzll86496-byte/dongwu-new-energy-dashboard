import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the battery export dashboard shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>国内电池出口数据观察站｜东吴电新<\/title>/);
  assert.match(html, /国内电池出口/);
  assert.match(html, /海关总署/);
  assert.match(html, /2026-06/);
  assert.match(html, /6月电池出口更新交互表/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("renders the standalone June export summary table", async () => {
  const response = await render("/sheet1");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /26年6月电池出口数据更新/);
  assert.match(html, /累计同比/);
  assert.match(html, /广东省/);
  assert.match(html, /其他国家/);
  assert.match(html, /国家、省份或洲别/);
  assert.match(html, /点击表格任意行查看指标/);
});
