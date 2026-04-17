import "./styles.css";
import { DIFFICULTIES, type Difficulty } from "@3d-pong/shared";
import { initParallax } from "./ui/parallax.js";
import { defineRoute, defineNotFound, startRouter, go } from "./router.js";
import { renderMenu } from "./ui/menu.js";
import { renderSignup } from "./ui/signup.js";
import { renderLeaderboard } from "./ui/leaderboard.js";
import { renderGameOver } from "./ui/gameOver.js";
import { renderNotFound } from "./ui/notFound.js";
import { mountHud } from "./ui/hud.js";
import { showPauseOverlay, type PauseHandle } from "./ui/pause.js";
import { startAttract, type AttractHandle } from "./ui/attract.js";
import {
  enterGameplayViewport,
  leaveGameplayViewport,
} from "./ui/fullscreen.js";
import { mountRotatePrompt, type RotateHandle } from "./ui/rotate.js";
import {
  mountDevPanel,
  loadGfxSettings,
  type DevPanelHandle,
} from "./ui/devpanel.js";
import { PongGame, type GameMode } from "./game/PongGame.js";
import { api } from "./api.js";
import { getCurrentUser } from "./state.js";
import { printConsoleEasterEgg } from "./content/quips.js";
import { sfx } from "./audio/sound.js";
import { startIdleWatcher, type IdleWatcherHandle } from "./ui/idle.js";

const appRoot = document.getElementById("app") as HTMLElement;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

let activeGame: PongGame | null = null;
let activeHud: ReturnType<typeof mountHud> | null = null;
let activePause: PauseHandle | null = null;
let activeRotate: RotateHandle | null = null;
let activeAttract: AttractHandle | null = null;
let activeDevPanel: DevPanelHandle | null = null;

// Idle-to-attract: after 60s of no interaction on non-game routes,
// automatically engage attract mode.
const IDLE_TIMEOUT_MS = 60_000;
let idleWatcher: IdleWatcherHandle | null = null;

function clearScreen(): void {
  // clearScreen is called at the start of every route handler, AFTER the
  // hash has been updated. So `location.hash` is the destination route —
  // we use this to decide whether we're leaving gameplay (and should
  // release fullscreen/landscape) or just re-entering it (replay).
  const nextPath =
    (location.hash.replace(/^#/, "").split("?")[0] || "/menu");
  const leavingGame = nextPath !== "/game" && nextPath !== "/tuning";

  appRoot.innerHTML = "";
  if (activeDevPanel) {
    activeDevPanel.destroy();
    activeDevPanel = null;
  }
  if (activeAttract) {
    activeAttract.dismiss();
    activeAttract = null;
  }
  if (activeGame) {
    activeGame.dispose();
    activeGame = null;
  }
  if (activeHud) {
    activeHud.destroy();
    activeHud = null;
  }
  if (activePause) {
    activePause.dismiss();
    activePause = null;
  }
  if (activeRotate) {
    activeRotate.destroy();
    activeRotate = null;
  }
  if (leavingGame) {
    // Only release the gameplay viewport when navigating away from the
    // game route. Replays stay fullscreen + landscape on mobile.
    void leaveGameplayViewport();
  }
  canvas.classList.remove("active");
}

function asDifficulty(value: string | null): Difficulty {
  if (value && (DIFFICULTIES as readonly string[]).includes(value)) {
    return value as Difficulty;
  }
  return "rookie";
}

defineRoute("/attract", () => {
  clearScreen();
  idleWatcher?.pause();
  activeAttract = startAttract({
    root: appRoot,
    canvas,
    onDismiss: () => {
      activeAttract = null;
      go("/menu");
    },
  });
});

defineRoute("/menu", () => {
  clearScreen();
  idleWatcher?.resume();
  renderMenu(appRoot);
});

defineRoute("/signup", () => {
  clearScreen();
  idleWatcher?.resume();
  renderSignup(appRoot);
});

defineRoute("/leaderboard", () => {
  clearScreen();
  idleWatcher?.resume();
  renderLeaderboard(appRoot);
});

defineRoute("/tuning", () => {
  clearScreen();
  idleWatcher?.pause();
  canvas.classList.add("active");

  // Minimal overlay — just a back button so you can exit.
  appRoot.innerHTML = `
    <div class="tuning-overlay">
      <div class="tuning-tag">[ GFX TUNING MODE ]</div>
      <div class="tuning-hint">// AI vs AI — adjust settings with the panel</div>
      <button type="button" class="btn btn-small tuning-back" data-action="back">← MENU</button>
    </div>
  `;
  appRoot
    .querySelector('[data-action="back"]')
    ?.addEventListener("click", () => {
      sfx.menuBlip();
      go("/menu");
    });

  const game = new PongGame({
    canvas,
    mode: { kind: "demo", leftDifficulty: "pro", rightDifficulty: "expert" },
    onScoreChange: () => { /* tuning mode ignores score */ },
    onPauseRequested: () => { /* no pause in tuning mode */ },
  });
  activeGame = game;
  activeDevPanel = mountDevPanel({ game });
  void game.start();
});

defineRoute("/game", async (params) => {
  clearScreen();
  idleWatcher?.pause();
  const mode = params.get("mode");
  const difficulty = asDifficulty(params.get("difficulty"));

  let gameMode: GameMode;
  if (mode === "2p") {
    gameMode = { kind: "local2p" };
  } else {
    // AI mode requires a signed-in user.
    const user = getCurrentUser();
    if (!user) {
      go("/signup");
      return;
    }
    gameMode = { kind: "ai", difficulty };
  }

  canvas.classList.add("active");

  // Mobile: try fullscreen + landscape lock. Mount the rotate-to-landscape
  // prompt which auto-hides itself if the device is already in landscape
  // (or not a touch device at all).
  void enterGameplayViewport();
  activeRotate = mountRotatePrompt();

  // Forward declare `game` so closures below can reference it.
  let game: PongGame;

  const openPause = () => {
    if (!game || activePause) return;
    game.pause();
    activePause = showPauseOverlay({
      onResume: () => {
        activePause = null;
        game.resume();
      },
      onQuit: () => {
        activePause = null;
        game.abort();
      },
    });
  };

  activeHud = mountHud({
    mode: mode === "2p" ? "2p" : "ai",
    difficulty: gameMode.kind === "ai" ? gameMode.difficulty : undefined,
    onPause: openPause,
  });

  game = new PongGame({
    canvas,
    mode: gameMode,
    onScoreChange: (l, r) => activeHud?.setScore(l, r),
    onPauseRequested: openPause,
  });
  activeGame = game;

  // Apply any saved GFX settings (tuned via /tuning mode).
  const savedGfx = loadGfxSettings();
  if (savedGfx) game.applyGfx(savedGfx);

  const result = await game.start();

  // Clear pause overlay if quit was via the pause menu.
  if (activePause) {
    activePause.dismiss();
    activePause = null;
  }

  // If the player quit mid-match, don't record anything — just go home.
  if (result.aborted) {
    activeGame?.dispose();
    activeGame = null;
    activeHud?.destroy();
    activeHud = null;
    canvas.classList.remove("active");
    go("/menu");
    return;
  }

  // For AI mode, post the match result.
  if (gameMode.kind === "ai") {
    const user = getCurrentUser();
    if (user) {
      try {
        await api.recordMatch({
          userId: user.userId,
          difficulty: gameMode.difficulty,
          outcome: result.outcome,
          playerScore: result.playerScore,
          aiScore: result.aiScore,
          durationMs: Math.floor(result.durationMs),
        });
      } catch (err) {
        console.warn("Failed to record match:", err);
      }
    }
  }

  // Tear down game and show game-over screen.
  activeGame?.dispose();
  activeGame = null;
  activeHud?.destroy();
  activeHud = null;
  canvas.classList.remove("active");

  idleWatcher?.resume();
  renderGameOver(appRoot, {
    outcome: result.outcome,
    playerScore: result.playerScore,
    aiScore: result.aiScore,
    mode: mode === "2p" ? "2p" : "ai",
    difficulty: gameMode.kind === "ai" ? gameMode.difficulty : undefined,
  });
});

defineNotFound(() => {
  clearScreen();
  idleWatcher?.resume();
  renderNotFound(appRoot);
});

initParallax();
printConsoleEasterEgg();

// Start idle-to-attract watcher. On idle routes (menu, leaderboard, etc.)
// 60s of inactivity navigates to attract mode.
idleWatcher = startIdleWatcher({
  timeoutMs: IDLE_TIMEOUT_MS,
  onIdle: () => {
    // Only fire if we're on an idle-eligible route.
    const path = location.hash.replace(/^#/, "").split("?")[0] || "/menu";
    if (path === "/game" || path === "/attract" || path === "/tuning") return;
    go("/attract");
  },
});

// Unlock Web Audio on the first user gesture. iOS Safari requires this.
const unlockAudio = () => {
  sfx.unlock();
  window.removeEventListener("pointerdown", unlockAudio);
  window.removeEventListener("keydown", unlockAudio);
  window.removeEventListener("touchstart", unlockAudio);
};
window.addEventListener("pointerdown", unlockAudio, { once: false });
window.addEventListener("keydown", unlockAudio, { once: false });
window.addEventListener("touchstart", unlockAudio, { once: false });

startRouter();
