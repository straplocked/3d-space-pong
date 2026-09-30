#!/usr/bin/env node
/**
 * Generates the PWA icon set (PNG) from scripts/icon-source.svg.
 *
 * The source SVG is a single 512x512 opaque-background design (neon paddle
 * + ball on the game's dark palette) — opaque so it also works unmodified
 * as a "maskable" icon (the whole square must be filled; nothing may rely
 * on transparency, since platforms crop maskable icons to their own shape).
 *
 * Rendered with a real browser (via the Playwright Docker image, same as
 * scripts/screenshots.mjs) rather than a native image library, so this repo
 * doesn't need to add an image-processing dependency just for icons.
 *
 * Usage (from repo root):
 *   docker run --rm \
 *     -v "$PWD/scripts:/scripts" \
 *     -v "$PWD/packages/web/public/icons:/out" \
 *     mcr.microsoft.com/playwright:v1.55.0-noble \
 *     node /scripts/generate-icons.mjs --svg=/scripts/icon-source.svg --out-dir=/out
 *
 * Or directly with a local Playwright install:
 *   node scripts/generate-icons.mjs
 */
import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const svgPath = args.svg ?? path.resolve(__dirname, "icon-source.svg");
const outDir =
  args["out-dir"] ??
  path.resolve(__dirname, "../packages/web/public/icons");

// name, pixel size. Maskable reuses the same opaque-background artwork —
// the source already keeps the paddle+ball inside the ~80% safe zone.
const TARGETS = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-512-maskable.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const svg = await readFile(svgPath, "utf8");

  const browser = await chromium.launch({
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });

  try {
    for (const target of TARGETS) {
      const page = await browser.newPage({
        viewport: { width: target.size, height: target.size },
        deviceScaleFactor: 1,
      });
      const html = `<!doctype html>
<html><head><style>
  html,body{margin:0;padding:0;width:${target.size}px;height:${target.size}px;background:#000500;}
  svg{display:block;width:${target.size}px;height:${target.size}px;}
</style></head>
<body>${svg}</body></html>`;
      await page.setContent(html, { waitUntil: "networkidle" });
      const outPath = path.join(outDir, target.name);
      await page.screenshot({ path: outPath, omitBackground: false });
      await page.close();
      console.log(`wrote ${outPath} (${target.size}x${target.size})`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
