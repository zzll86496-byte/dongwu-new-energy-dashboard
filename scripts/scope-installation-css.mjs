import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const scope = ".installation-scope";
const files = [
  "app/installation-frame/installation.css",
  "app/installation-frame/install-summary.css",
];

function scopedSelector(selector) {
  const value = selector.trim();
  if (value === scope || value.startsWith(`${scope} `) || value.startsWith(`${scope}:`)) return value;
  if (value === "*" || value === "html" || value === "body" || value === ":root") return scope;
  if (value.startsWith("body ")) return `${scope}${value.slice(4)}`;
  if (value.startsWith("html ")) return `${scope}${value.slice(4)}`;
  if (value.startsWith("body") && !/[.#[:]/.test(value[4] ?? "")) return `${scope}${value.slice(4)}`;
  if (value.startsWith("html") && !/[.#[:]/.test(value[4] ?? "")) return `${scope}${value.slice(4)}`;
  return `${scope} ${value}`;
}

for (const relativePath of files) {
  const absolutePath = path.resolve(relativePath);
  const root = postcss.parse(fs.readFileSync(absolutePath, "utf8"), { from: absolutePath });
  root.walkRules((rule) => {
    let parent = rule.parent;
    while (parent) {
      if (parent.type === "atrule" && /keyframes$/i.test(parent.name)) return;
      parent = parent.parent;
    }
    rule.selectors = [...new Set(rule.selectors.map(scopedSelector))];
  });
  fs.writeFileSync(absolutePath, root.toString(), "utf8");
}
