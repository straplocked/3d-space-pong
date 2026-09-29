#!/usr/bin/env node
/**
 * Reusable Playwright screenshot capturer.
 *
 * Takes a base URL and a list of routes, and captures each one in both
 * "light" and "dark" `prefers-color-scheme`, saving PNGs to an output dir.
 *
 * Meant to be run inside the official Playwright Docker image (which ships
 * matching browser binaries), e.g.:
 *
 *   docker run --rm --network host \
 *     -v "$PWD/docs/assets/screenshots:/out" \
 *     -v "$PWD/scripts:/scripts" \
 *     mcr.microsoft.com/playwright:v1.55.0-noble \
 *     node /scripts/screenshots.mjs \
 *       --base-url=http://localhost:3600 \
 *       --out-dir=/out
 *
 * WebGL note: headless Chromium needs software GL to render three.js canvases
 * reliably in a container without a GPU. This script launches Chromium with
 * `--use-gl=swiftshader` / `--enable-unsafe-swiftshader` for that reason.
 *
 * Usage:
 *   node screenshots.mjs --base-url=http://localhost:3000 [--out-dir=./out] [--wait=1500]
 *
 * Routes are configured in the PAGES array below (name, path, extra wait,
 * optional pre-screenshot action). Edit PAGES to add/remove screens.
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
const baseUrl = args["base-url"] || process.env.BASE_URL || "http://localhost:3000";
const outDir = args["out-dir"] || "./docs/assets/screenshots";
const defaultWait = Number(args.wait || 1500);

// Each entry: { name, path, wait?, action? }
// `action(page)` runs after navigation + default wait, before the screenshot
// (e.g. to dismiss the attract-mode title screen or nudge into gameplay).
const PAGES = [
  { name: "menu", path: "/#/menu", wait: 1000 },
  {
    name: "attract",
    path: "/#/attract",
    wait: 6000, // let it settle past the 5s "title" phase into "demo"
  },
  {
    name: "gameplay-2p",
    path: "/#/game?mode=2p",
    wait: 2500,
  },
  { name: "leaderboard", path: "/#/leaderboard", wait: 1500 },
];

async function shootOne(browser, colorScheme, page404) {
  const results = [];
  for (const p of PAGES) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme,
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
    const file = path.join(outDir, `${p.name}-${colorScheme}.png`);
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
    for (const scheme of ["light", "dark"]) {
      console.log(`--- capturing colorScheme=${scheme} ---`);
      await shootOne(browser, scheme);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
