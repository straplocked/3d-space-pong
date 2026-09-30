/**
 * Lazy-loaded engine bundle. Everything that pulls in three.js is
 * re-exported from here and loaded with a dynamic import() from main.ts,
 * so the menu / signup / leaderboard screens paint without first
 * downloading and parsing ~500 kB of 3D engine — noticeable on a phone
 * over mobile data. The service worker precaches this chunk too, so
 * offline play is unaffected.
 */
export { PongGame } from "./game/PongGame.js";
export { startAttract } from "./ui/attract.js";
export { mountDevPanel, loadGfxSettings } from "./ui/devpanel.js";
