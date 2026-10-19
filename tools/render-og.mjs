// Renders the 1200x630 link-preview image to assets/og-image.png.
// Optional dev tool — needs Playwright (npm i -g playwright). The site build never runs it.
// Run: npm run og-image   (then npm run build)

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import config from "../site.config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = join(ROOT, "assets", "og-image.png");

export function ogHtml(c = config) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  body{background:radial-gradient(700px 420px at 82% 45%,rgba(201,169,110,.13),transparent 70%),linear-gradient(160deg,#17171A,#0B0B0C);
    color:#F4EFE6;font-family:Manrope,sans-serif;position:relative}
  .copy{position:absolute;left:88px;top:96px;width:640px}
  .mark{font-size:30px;font-weight:600;letter-spacing:-.01em;color:#C9A96E}
  .rule{width:56px;height:1px;background:#C9A96E;opacity:.6;margin:36px 0 40px}
  h1{margin:0;font-size:78px;line-height:82px;font-weight:500;letter-spacing:-.03em}
  h1 span{display:block;color:#C9A96E}
  p{margin:36px 0 0;font-size:24px;color:#A9A39A}
  svg{position:absolute;right:-40px;top:40px;width:560px;opacity:.85}
</style></head><body>
<svg viewBox="0 0 400 400"><defs>
  <linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9D4FF"/><stop offset=".28" stop-color="#F2D5EA"/><stop offset=".5" stop-color="#F6EBD6"/><stop offset=".72" stop-color="#BFE2EE"/><stop offset="1" stop-color="#D8CBFA"/></linearGradient>
  <linearGradient id="d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6F78B8"/><stop offset=".5" stop-color="#A88FB8"/><stop offset="1" stop-color="#6E9CB3"/></linearGradient>
  <linearGradient id="s" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="b" x1="0" y1="1" x2="1" y2="0"><stop offset=".18" stop-color="#9DB4FF" stop-opacity="0"/><stop offset=".24" stop-color="#9DB4FF" stop-opacity=".7"/><stop offset=".3" stop-color="#F7B9D9" stop-opacity="0"/><stop offset=".62" stop-color="#8FD3E8" stop-opacity="0"/><stop offset=".67" stop-color="#8FD3E8" stop-opacity=".6"/><stop offset=".71" stop-color="#F6C9E4" stop-opacity=".5"/><stop offset=".77" stop-color="#F6C9E4" stop-opacity="0"/></linearGradient>
  <mask id="m"><rect x="70" y="70" width="260" height="260" rx="74" fill="#fff"/><rect x="128" y="128" width="144" height="144" rx="34" fill="#000"/></mask>
</defs><g transform="rotate(-24 200 200)">
  <g transform="translate(10 16)" mask="url(#m)" opacity=".75"><rect width="400" height="400" fill="url(#d)"/></g>
  <g mask="url(#m)"><rect width="400" height="400" fill="url(#a)"/><rect width="400" height="400" fill="url(#b)"/><rect width="400" height="400" fill="url(#s)"/></g>
  <rect x="71.5" y="71.5" width="257" height="257" rx="73" fill="none" stroke="#fff" stroke-opacity=".55"/>
</g></svg>
<div class="copy">
  <div class="mark">${esc(c.brandName)}</div>
  <div class="rule"></div>
  <h1>More bookings. <span>Even after hours.</span></h1>
  <p>After-hours Instagram replies for med spas</p>
</div>
</body></html>`;
}

export async function loadPlaywright() {
  try { return await import("playwright"); } catch {}
  const globalRoot = execSync("npm root -g").toString().trim();
  const require = createRequire(join(globalRoot, "noop.js"));
  return require("playwright");
}

async function main() {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(ogHtml(), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(OUT, await page.screenshot({ type: "png" }));
  await browser.close();
  console.log("✔  Wrote assets/og-image.png");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
