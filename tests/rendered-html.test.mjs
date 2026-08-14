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

test("keeps all seven database routes and the branded asset", async () => {
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
    "/commercial-vehicle",
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
  assert.match(css, /database-portal__card:nth-child\(7\)/);
  assert.match(css, /grid-column:\s*3\s*\/\s*span\s*2/);
  assert.match(layout, /<html lang="zh-CN">/);
  assert.doesNotMatch(layout, /Geist|next\/font\/google/);
});
