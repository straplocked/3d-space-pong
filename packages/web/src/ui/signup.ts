import { SignUpSchema, DIFFICULTIES } from "@3d-pong/shared";
import type { Difficulty } from "@3d-pong/shared";
import { api, ApiError } from "../api.js";
import { DIFFICULTY_PROFILES } from "../game/AI.js";
import { go } from "../router.js";
import { getCurrentUser, setCurrentUser } from "../state.js";

export function renderSignup(root: HTMLElement): void {
  const cached = getCurrentUser();
  const cachedNote = cached
    ? `<p class="tagline">Welcome back, <strong>${escapeHtml(cached.displayName)}</strong>. Pick your poison.</p>`
    : "";

  root.innerHTML = `
    <section class="card">
      <h1>${cached ? "Choose Difficulty" : "Sign Up"}</h1>
      ${cached ? cachedNote : '<p class="tagline">Sign up so the leaderboard knows who to mock.</p>'}

      ${
        cached
          ? ""
          : `
      <form id="signup-form" novalidate>
        <div class="form-error-global" id="form-error" style="display:none"></div>

        <div class="form-field">
          <label for="displayName">What should the leaderboard mock you as?</label>
          <input id="displayName" name="displayName" type="text" autocomplete="nickname" required />
          <div class="form-error" data-for="displayName"></div>
        </div>

        <div class="form-field">
          <label for="email">We promise not to spam you. Much.</label>
          <input id="email" name="email" type="email" autocomplete="email" required />
          <div class="form-error" data-for="email"></div>
        </div>

        <div class="form-field-checkbox">
          <input id="marketingConsent" name="marketingConsent" type="checkbox" />
          <label for="marketingConsent">Yes, email me occasional existential paddle advice.</label>
        </div>

        <button type="submit" class="btn">Continue</button>
      </form>
      `
      }

      <div id="difficulty-section" style="${cached ? "" : "display:none"}">
        <div class="difficulty-grid">
          ${DIFFICULTIES.map((d) => {
            const profile = DIFFICULTY_PROFILES[d];
            return `
              <button class="difficulty-card" data-difficulty="${d}">
                <span class="name">${escapeHtml(profile.name.toUpperCase())}</span>
                <span class="subtitle">${escapeHtml(profile.subtitle)}</span>
              </button>
            `;
          }).join("")}
        </div>
      </div>

      <button class="btn btn-back btn-secondary" data-action="back">← Back</button>
    </section>
  `;

  root
    .querySelector('[data-action="back"]')
    ?.addEventListener("click", () => go("/menu"));

  // Wire difficulty cards
  root.querySelectorAll<HTMLButtonElement>(".difficulty-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset.difficulty as Difficulty | undefined;
      if (!d) return;
      go(`/game?mode=ai&difficulty=${d}`);
    });
  });

  if (cached) return;

  const form = root.querySelector<HTMLFormElement>("#signup-form");
  const errorBox = root.querySelector<HTMLDivElement>("#form-error");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form) return;
    clearErrors(form);
    if (errorBox) errorBox.style.display = "none";

    const formData = new FormData(form);
    const input = {
      displayName: String(formData.get("displayName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      marketingConsent: formData.get("marketingConsent") === "on",
    };

    const parsed = SignUpSchema.safeParse(input);
    if (!parsed.success) {
      for (const [field, messages] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
        const el = form.querySelector<HTMLDivElement>(
          `[data-for="${field}"]`,
        );
        if (el && messages && messages.length > 0) {
          el.textContent = messages[0] ?? "";
        }
      }
      return;
    }

    try {
      const result = await api.signup(parsed.data);
      setCurrentUser({
        userId: result.userId,
        displayName: result.displayName,
      });
      // Re-render to show difficulty picker.
      renderSignup(root);
    } catch (err) {
      if (errorBox) {
        errorBox.style.display = "block";
        errorBox.textContent =
          err instanceof ApiError
            ? err.message
            : "Couldn't reach the server. Try again in a moment.";
      }
    }
  });
}

function clearErrors(form: HTMLFormElement): void {
  form
    .querySelectorAll<HTMLDivElement>(".form-error")
    .forEach((el) => (el.textContent = ""));
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
