import type { LeaderboardRow } from "@3d-pong/shared";
import { api } from "../api.js";
import { go } from "../router.js";
import { quips } from "../content/quips.js";

/**
 * The leaderboard is a Hall of Shame only — a single view, sorted by
 * losses descending. Badges call out the especially humiliating losses
 * (Rookie Victim, Legend Slayer for the rare redemption arc).
 */
export function renderLeaderboard(root: HTMLElement): void {
  root.innerHTML = `
    <section class="card leaderboard">
      <h1>Hall of Shame</h1>
      <p class="tagline">Permanent record of losses against the machine.</p>
      <div id="lb-body">Loading the receipts...</div>
      <button class="btn btn-back btn-secondary" data-action="back">← Back</button>
    </section>
  `;

  root
    .querySelector('[data-action="back"]')
    ?.addEventListener("click", () => go("/menu"));

  const bodyEl = root.querySelector<HTMLDivElement>("#lb-body");
  if (!bodyEl) return;

  void load(bodyEl);
}

async function load(body: HTMLElement): Promise<void> {
  body.innerHTML = `<div class="empty-state">Loading...</div>`;
  try {
    const data = await api.leaderboard({ sort: "losses", limit: 25 });
    body.innerHTML = renderRows(data.leaderboard);
  } catch {
    body.innerHTML = `<div class="empty-state">Couldn't reach the server.</div>`;
  }
}

function renderRows(rows: LeaderboardRow[]): string {
  if (rows.length === 0) {
    const emptyMsg =
      quips.emptyLeaderboardLosses[0] ?? "Nobody has lost yet.";
    return `<div class="empty-state">${escapeHtml(emptyMsg)}</div>`;
  }

  return `
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th class="rank">#</th>
          <th class="name">PLAYER</th>
          <th>LOSSES</th>
          <th>FASTEST L</th>
          <th>W / L</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((row, i) => {
            const fastest =
              row.shortestLossMs === null
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
                <td>${row.losses}</td>
                <td>${fastest}</td>
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
