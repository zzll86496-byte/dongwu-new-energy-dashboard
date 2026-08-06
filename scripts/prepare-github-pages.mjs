import { cp, mkdir, copyFile } from "node:fs/promises";

await mkdir("out/sheet1", { recursive: true });
await copyFile("out/index.html", "out/sheet1/index.html");
await cp("out/assets", "out/sheet1/assets", { recursive: true });
