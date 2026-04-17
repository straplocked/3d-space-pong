/**
 * Tiny hash router. Routes are strings like "/menu" or "/game?mode=2p".
 * The fragment after `#` is the path. We support a query string after `?`.
 */
export type RouteHandler = (params: URLSearchParams) => void | Promise<void>;

const routes = new Map<string, RouteHandler>();
let notFoundHandler: (() => void) | null = null;

export function defineRoute(path: string, handler: RouteHandler): void {
  routes.set(path, handler);
}

export function defineNotFound(handler: () => void): void {
  notFoundHandler = handler;
}

export function go(target: string): void {
  // Always store with leading slash, no leading hash.
  const clean = target.startsWith("/") ? target : `/${target}`;
  if (location.hash === `#${clean}`) {
    // Same hash → no popstate fires; force a re-render.
    handleHashChange();
  } else {
    location.hash = clean;
  }
}

export function currentPath(): string {
  const raw = location.hash.replace(/^#/, "");
  return raw || "/menu";
}

function handleHashChange(): void {
  const full = currentPath();
  const [path, query = ""] = full.split("?");
  const handler = routes.get(path ?? "/menu");
  const params = new URLSearchParams(query);
  if (handler) {
    void handler(params);
  } else {
    notFoundHandler?.();
  }
}

export function startRouter(): void {
  window.addEventListener("hashchange", handleHashChange);
  if (!location.hash) {
    location.hash = "/attract";
  } else {
    handleHashChange();
  }
}
