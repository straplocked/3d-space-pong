/**
 * Floating graphics tuning panel.
 *
 * - Sliders for every live-adjustable graphics knob in PongGame.
 * - Live FPS counter at the top.
 * - Auto-saves to localStorage on every change so settings survive
 *   reloads. The matching `loadGfxSettings()` helper is exported so
 *   the game route can apply saved values to a fresh game instance
 *   before the panel itself is mounted.
 * - Toggle visibility with the backtick (`) key, the [×] close button,
 *   or the corner [GFX] tab when collapsed.
 * - Reset button restores defaults and clears the saved overrides.
 *
 * Mounted only during the /game route — the attract demo isn't a
 * tuning surface (and its dismiss-on-any-input behavior would fight
 * the panel's clicks).
 */
import {
  defaultGfx,
  type GfxSettings,
  type PongGame,
} from "../game/PongGame.js";

const STORAGE_KEY = "3d-pong:gfx-settings";
const VISIBLE_KEY = "3d-pong:gfx-visible";

interface ControlDef {
  key: keyof GfxSettings;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface SectionDef {
  title: string;
  controls: ControlDef[];
}

const SECTIONS: SectionDef[] = [
  {
    title: "post-processing",
    controls: [
      { key: "bloomStrength", label: "bloom strength", min: 0, max: 2, step: 0.01 },
      { key: "bloomRadius", label: "bloom radius", min: 0, max: 2, step: 0.01 },
      { key: "bloomThreshold", label: "bloom threshold", min: 0, max: 1, step: 0.01 },
      { key: "toneExposure", label: "tone exposure", min: 0.1, max: 2, step: 0.05 },
    ],
  },
  {
    title: "lighting",
    controls: [
      { key: "keyLightIntensity", label: "key light", min: 0, max: 3, step: 0.05 },
      { key: "ambientIntensity", label: "ambient", min: 0, max: 1, step: 0.01 },
      { key: "shadowOpacity", label: "shadow opacity", min: 0, max: 1, step: 0.01 },
      { key: "paddleEmissive", label: "paddle glow", min: 0, max: 1, step: 0.01 },
      { key: "ballEmissive", label: "ball glow", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "atmosphere",
    controls: [
      { key: "fogDensity", label: "fog density", min: 0, max: 0.05, step: 0.001 },
      { key: "dustSize", label: "dust size", min: 0.05, max: 0.5, step: 0.01 },
      { key: "dustOpacity", label: "dust opacity", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "stars",
    controls: [
      { key: "starSize", label: "star size", min: 0.1, max: 2, step: 0.05 },
      { key: "starOpacity", label: "star opacity", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "stage",
    controls: [
      { key: "stageOpacity", label: "stage glow", min: 0, max: 1, step: 0.01 },
    ],
  },
];

/** Load saved overrides from localStorage. Returns null if nothing saved. */
export function loadGfxSettings(): Partial<GfxSettings> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Partial<GfxSettings>;
    }
    return null;
  } catch {
    return null;
  }
}

function saveGfxSettings(settings: GfxSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function clearGfxSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Format the current settings as a TypeScript `defaultGfx()` return body. */
function settingsToCode(settings: GfxSettings): string {
  const entries = Object.entries(settings)
    .map(([k, v]) => `    ${k}: ${typeof v === "number" ? v : JSON.stringify(v)},`)
    .join("\n");
  return `export function defaultGfx(): GfxSettings {\n  return {\n${entries}\n  };\n}`;
}

function formatValue(v: number, step: number): string {
  if (step >= 1) return v.toFixed(0);
  if (step >= 0.1) return v.toFixed(1);
  if (step >= 0.01) return v.toFixed(2);
  return v.toFixed(3);
}

export interface DevPanelHandle {
  destroy(): void;
}

/** execCommand('copy') fallback for non-HTTPS contexts (e.g. localhost). */
function fallbackCopy(text: string, flash: (msg: string) => void): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    const ok = document.execCommand("copy");
    flash(ok ? "COPIED ✓" : "LOGGED TO CONSOLE");
    if (!ok) console.log("// --- GFX settings export ---\n" + text);
  } catch {
    console.log("// --- GFX settings export ---\n" + text);
    flash("LOGGED TO CONSOLE");
  } finally {
    ta.remove();
  }
}

export function mountDevPanel(opts: { game: PongGame }): DevPanelHandle {
  const { game } = opts;

  // Build the panel DOM. The toggle button is a sibling of the panel
  // itself so closing the panel still leaves a visible re-open affordance.
  const root = document.createElement("div");
  root.className = "gfx-root";

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "gfx-toggle";
  toggleBtn.type = "button";
  toggleBtn.setAttribute("aria-label", "Toggle graphics panel");
  toggleBtn.textContent = "[ GFX ]";
  root.appendChild(toggleBtn);

  const panel = document.createElement("div");
  panel.className = "gfx-panel";

  const sectionsHtml = SECTIONS.map((section) => {
    const controlsHtml = section.controls
      .map((c) => {
        return `
          <div class="gfx-control">
            <div class="gfx-control-row">
              <label for="gfx-${c.key}">${c.label}</label>
              <span class="gfx-value" data-key="${c.key}"></span>
            </div>
            <input
              id="gfx-${c.key}"
              type="range"
              data-key="${c.key}"
              min="${c.min}"
              max="${c.max}"
              step="${c.step}"
            />
          </div>
        `;
      })
      .join("");
    return `
      <div class="gfx-section">
        <div class="gfx-section-title">// ${section.title}</div>
        ${controlsHtml}
      </div>
    `;
  }).join("");

  panel.innerHTML = `
    <header class="gfx-panel-header">
      <span class="gfx-panel-title">[ GFX TUNING ]</span>
      <button type="button" class="gfx-close" data-action="close" aria-label="Close panel">×</button>
    </header>
    <div class="gfx-fps-row">
      <span class="gfx-fps-label">FPS</span>
      <span class="gfx-fps-value" id="gfx-fps">--</span>
      <span class="gfx-device">${game.isMobile ? "mobile" : "desktop"}</span>
    </div>
    <div class="gfx-panel-body">
      ${sectionsHtml}
      <button type="button" class="gfx-reset" data-action="reset">RESET DEFAULTS</button>
      <button type="button" class="gfx-export" data-action="export">EXPORT TO CODE</button>
      <p class="gfx-hint">// press \` to toggle</p>
    </div>
  `;
  root.appendChild(panel);
  document.body.appendChild(root);

  // ----- State -----

  const current: GfxSettings = {
    ...defaultGfx(),
    ...(loadGfxSettings() ?? {}),
  };
  // Apply on mount so a fresh game starts with the saved overrides.
  game.applyGfx(current);

  // Visibility — defaults to visible on first run.
  const initialVisible = (() => {
    try {
      const raw = localStorage.getItem(VISIBLE_KEY);
      return raw !== "false";
    } catch {
      return true;
    }
  })();
  const setVisible = (v: boolean) => {
    panel.classList.toggle("hidden", !v);
    toggleBtn.classList.toggle("active", v);
    try {
      localStorage.setItem(VISIBLE_KEY, v ? "true" : "false");
    } catch {
      // ignore
    }
  };
  setVisible(initialVisible);

  // ----- Wire sliders -----

  const inputs = new Map<keyof GfxSettings, HTMLInputElement>();
  const valueSpans = new Map<keyof GfxSettings, HTMLSpanElement>();

  for (const section of SECTIONS) {
    for (const ctl of section.controls) {
      const input = panel.querySelector<HTMLInputElement>(
        `input[data-key="${ctl.key}"]`,
      );
      const valueSpan = panel.querySelector<HTMLSpanElement>(
        `.gfx-value[data-key="${ctl.key}"]`,
      );
      if (!input || !valueSpan) continue;

      input.value = String(current[ctl.key]);
      valueSpan.textContent = formatValue(current[ctl.key], ctl.step);
      inputs.set(ctl.key, input);
      valueSpans.set(ctl.key, valueSpan);

      input.addEventListener("input", () => {
        const v = parseFloat(input.value);
        if (!Number.isFinite(v)) return;
        (current as unknown as Record<string, number>)[ctl.key] = v;
        valueSpan.textContent = formatValue(v, ctl.step);
        game.applyGfx({ [ctl.key]: v } as Partial<GfxSettings>);
        saveGfxSettings(current);
      });
    }
  }

  // ----- Reset -----

  panel
    .querySelector<HTMLButtonElement>('[data-action="reset"]')
    ?.addEventListener("click", () => {
      const defaults = defaultGfx();
      Object.assign(current, defaults);
      game.applyGfx(defaults);
      clearGfxSettings();
      // Sync slider UI back to defaults
      for (const section of SECTIONS) {
        for (const ctl of section.controls) {
          const input = inputs.get(ctl.key);
          const valueSpan = valueSpans.get(ctl.key);
          if (input) input.value = String(defaults[ctl.key]);
          if (valueSpan)
            valueSpan.textContent = formatValue(defaults[ctl.key], ctl.step);
        }
      }
    });

  // ----- Export to code -----

  const exportBtn = panel.querySelector<HTMLButtonElement>(
    '[data-action="export"]',
  );
  exportBtn?.addEventListener("click", () => {
    const code = settingsToCode(current);

    const flashLabel = (msg: string) => {
      if (!exportBtn) return;
      exportBtn.textContent = msg;
      setTimeout(() => { exportBtn.textContent = "EXPORT TO CODE"; }, 1500);
    };

    // Try the async Clipboard API first (requires HTTPS or secure context).
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(
        () => flashLabel("COPIED ✓"),
        () => fallbackCopy(code, flashLabel),
      );
    } else {
      fallbackCopy(code, flashLabel);
    }
  });

  // ----- Close button + toggle button -----

  panel
    .querySelector<HTMLButtonElement>('[data-action="close"]')
    ?.addEventListener("click", () => setVisible(false));

  toggleBtn.addEventListener("click", () => {
    setVisible(panel.classList.contains("hidden"));
  });

  // ----- Backtick keyboard toggle -----

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Backquote") {
      // Don't intercept while typing in an input.
      const target = e.target as Element | null;
      if (target && target.matches?.("input, textarea, [contenteditable]")) {
        return;
      }
      setVisible(panel.classList.contains("hidden"));
      e.preventDefault();
    }
  };
  window.addEventListener("keydown", onKeyDown);

  // ----- Live FPS display -----

  const fpsEl = panel.querySelector<HTMLSpanElement>("#gfx-fps");
  const fpsTimer = window.setInterval(() => {
    if (!fpsEl) return;
    const fps = game.getFps();
    fpsEl.textContent = fps > 0 ? fps.toFixed(0) : "--";
    // Color-code: green > 50, amber 30-50, red < 30
    fpsEl.classList.toggle("ok", fps >= 50);
    fpsEl.classList.toggle("warn", fps >= 30 && fps < 50);
    fpsEl.classList.toggle("bad", fps > 0 && fps < 30);
  }, 250);

  return {
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      clearInterval(fpsTimer);
      root.remove();
    },
  };
}
