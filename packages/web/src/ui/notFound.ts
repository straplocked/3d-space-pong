import { go } from "../router.js";

export function renderNotFound(root: HTMLElement): void {
  root.innerHTML = `
    <section class="card not-found">
      <h1>404</h1>
      <p>This route is off the table. Literally. Pong joke. We'll see ourselves out.</p>
      <button class="btn" data-action="menu">Back to Menu</button>
    </section>
  `;
  root
    .querySelector('[data-action="menu"]')
    ?.addEventListener("click", () => go("/menu"));
}
