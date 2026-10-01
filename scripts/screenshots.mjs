#!/usr/bin/env node
/**
 * Reusable Playwright screenshot capturer.
 *
 * The game is dark-only (see docs/leadership/product-overview.md and the
 * `color-scheme: dark` meta tag in index.html) — there's no light theme to
 * capture, so this always forces `colorScheme: "dark"`. It shoots each
 * configured page at each configured viewport and saves
 * `<page>-<viewport>.png`.
 *
 * Meant to be run inside the official Playwright Docker image (which ships
 * matching browser binaries), e.g.:
 *
 *   docker run --rm --network host \
 *     -v "$PWD/scripts:/scripts:ro" \
 *     -v "$PWD/docs/assets/screenshots:/out" \
 *     mcr.microsoft.com/playwright:v1.55.1-noble \
 *     node /scripts/screenshots.mjs \
 *       --base-url=http://localhost:3712 \
 *       --out-dir=/out
 *
 * WebGL note: headless Chromium needs software GL to render three.js canvases
 * reliably in a container without a GPU. This script launches Chromium with
 * `--use-gl=swiftshader` / `--enable-unsafe-swiftshader` for that reason.
 *
 * Usage:
 *   node screenshots.mjs --base-url=http://localhost:3712 [--out-dir=./out] [--wait=1500]
 *
 * Routes are configured in the PAGES array below (name, path, extra wait,
 * optional pre-screenshot action). Viewports are in VIEWPORTS. Edit either
 * to add/remove screens or sizes.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = args["base-url"] || process.env.BASE_URL || "http://localhost:3712";
const outDir = args["out-dir"] || "./docs/assets/screenshots";
const defaultWait = Number(args.wait || 1500);

// Each entry: { name, path, wait?, action? }
// `action(page)` runs after navigation + default wait, before the screenshot
// (e.g. to dismiss the attract-mode title screen or nudge into gameplay).
const PAGES = [
  { name: "menu", path: "/#/menu", wait: 1000 },
  { name: "game", path: "/#/game?mode=2p", wait: 2500 },
  { name: "hall-of-fame", path: "/#/leaderboard?tab=fame", wait: 1500 },
  { name: "hall-of-shame", path: "/#/leaderboard?tab=shame", wait: 1500 },
];

// name is used in the output filename; width/height are CSS pixels.
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 844, height: 390 }, // phone held landscape
];

async function shootOne(browser, viewport) {
  const results = [];
  for (const p of PAGES) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "dark",
      hasTouch: viewport.name === "phone",
      isMobile: viewport.name === "phone",
    });
    const pg = await context.newPage();
    const url = new URL(p.path, baseUrl).toString();
    try {
      await pg.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    } catch (err) {
      console.error(`[warn] navigation issue for ${url}: ${err.message}`);
    }
    await pg.waitForTimeout(p.wait ?? defaultWait);
    if (typeof p.action === "function") {
      try {
        await p.action(pg);
      } catch (err) {
        console.error(`[warn] action failed for ${p.name}: ${err.message}`);
      }
    }
    const file = path.join(outDir, `${p.name}-${viewport.name}.png`);
    await pg.screenshot({ path: file });
    results.push(file);
    console.log(`saved ${file}`);
    await context.close();
  }
  return results;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
      "--disable-gpu-sandbox",
      "--no-sandbox",
    ],
  });

  try {
    for (const viewport of VIEWPORTS) {
      console.log(`--- capturing viewport=${viewport.name} (${viewport.width}x${viewport.height}) ---`);
      await shootOne(browser, viewport);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
