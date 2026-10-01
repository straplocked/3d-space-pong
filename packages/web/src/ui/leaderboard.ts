import type { LeaderboardRow, LeaderboardSort } from "@3d-space-pong/shared";
import { api } from "../api.js";
import { go } from "../router.js";
import { quips } from "../content/quips.js";
import { sfx } from "../audio/sound.js";

type Tab = "fame" | "shame";

const TAB_SORT: Record<Tab, LeaderboardSort> = {
  fame: "wins",
  shame: "losses",
};

/**
 * Tabbed leaderboard screen: Hall of Fame (sort=wins) alongside the
 * original Hall of Shame (sort=losses). Both badges (🙈 ROOKIE VICTIM,
 * 👑 LEGEND SLAYER) are computed server-side from the *unfiltered* match
 * history, so they're accurate on either tab.
 *
 * The tab defaults to "shame" unless the route carries `?tab=fame` —
 * preserving the historical deep-link shape (attract mode, bookmarks).
 * `gameOver.ts`'s "View Leaderboard" button sends winners straight to the
 * Fame tab and everyone else to Shame.
 */
export function renderLeaderboard(
  root: HTMLElement,
  params?: URLSearchParams,
): void {
  const initialTab: Tab = params?.get("tab") === "fame" ? "fame" : "shame";
  let activeTab: Tab = initialTab;
  let loadToken = 0;

  root.innerHTML = `
    <section class="card leaderboard">
      <h1>Leaderboards</h1>
      <p class="tagline">Permanent record of wins and losses against the machine.</p>
      <div class="leaderboard-tabs" role="tablist">
        <button type="button" role="tab" class="${activeTab === "fame" ? "active" : ""}" data-tab="fame" aria-selected="${activeTab === "fame"}">🏆 Hall of Fame</button>
        <button type="button" role="tab" class="${activeTab === "shame" ? "active" : ""}" data-tab="shame" aria-selected="${activeTab === "shame"}">💀 Hall of Shame</button>
      </div>
      <div id="lb-body">Loading the receipts...</div>
      <button class="btn btn-back btn-secondary" data-action="back">← Back</button>
    </section>
  `;

  root
    .querySelector('[data-action="back"]')
    ?.addEventListener("click", () => go("/menu"));

  const bodyEl = root.querySelector<HTMLDivElement>("#lb-body");
  const tabButtons = root.querySelectorAll<HTMLButtonElement>(
    ".leaderboard-tabs button",
  );

  function setActiveTab(tab: Tab): void {
    activeTab = tab;
    for (const btn of tabButtons) {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    }
    if (bodyEl) void load(bodyEl, tab);
  }

  for (const btn of tabButtons) {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab as Tab;
      if (tab === activeTab) return;
      sfx.menuBlip();
      setActiveTab(tab);
    });
  }

  async function load(body: HTMLElement, tab: Tab): Promise<void> {
    const token = ++loadToken;
    body.innerHTML = `<div class="empty-state">Loading...</div>`;
    try {
      const data = await api.leaderboard({ sort: TAB_SORT[tab], limit: 25 });
      if (token !== loadToken) return; // a later tab switch already won
      body.innerHTML = renderRows(data.leaderboard, tab);
    } catch {
      if (token !== loadToken) return;
      body.innerHTML = `<div class="empty-state">Couldn't reach the server.</div>`;
    }
  }

  setActiveTab(initialTab);
}

function renderRows(rows: LeaderboardRow[], tab: Tab): string {
  if (rows.length === 0) {
    const pool =
      tab === "fame" ? quips.emptyLeaderboardWins : quips.emptyLeaderboardLosses;
    const fallback =
      tab === "fame" ? "Nobody has won yet." : "Nobody has lost yet.";
    const emptyMsg = pool[0] ?? fallback;
    return `<div class="empty-state">${escapeHtml(emptyMsg)}</div>`;
  }

  const metricHeader = tab === "fame" ? "WINS" : "LOSSES";
  const sideStatHeader = tab === "fame" ? "W/L RATIO" : "FASTEST L";

  return `
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th class="rank">#</th>
          <th class="name">PLAYER</th>
          <th>${metricHeader}</th>
          <th>${sideStatHeader}</th>
          <th>W / L</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((row, i) => {
            const metric = tab === "fame" ? row.wins : row.losses;
            const sideStat =
              tab === "fame"
                ? row.ratio === null
                  ? "—"
                  : row.ratio.toFixed(2)
                : row.shortestLossMs === null
                  ? "—"
                  : `${(row.shortestLossMs / 1000).toFixed(1)}s`;
            return `
              <tr>
                <td class="rank">${i + 1}</td>
                <td class="name">
                  ${escapeHtml(row.displayName)}
                  ${row.lostToRookie ? '<span class="badge badge-rookie-victim">🙈 ROOKIE VICTIM</span>' : ""}
                  ${row.beatLegend ? '<span class="badge badge-legend-slayer">👑 LEGEND SLAYER</span>' : ""}
                </td>
                <td>${metric}</td>
                <td>${sideStat}</td>
                <td>${row.wins}W / ${row.losses}L</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}
