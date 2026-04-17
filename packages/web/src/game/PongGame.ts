import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Difficulty } from "@3d-pong/shared";

import { Input } from "./Input.js";
import { AIController } from "./AI.js";
import { isTouchDevice } from "../ui/fullscreen.js";
import { sfx } from "../audio/sound.js";

export type GameMode =
  | { kind: "ai"; difficulty: Difficulty }
  | { kind: "local2p" }
  | {
      /** Attract-mode AI vs AI. Never ends until `abort()`; scores loop. */
      kind: "demo";
      leftDifficulty: Difficulty;
      rightDifficulty: Difficulty;
    };

export interface GameResult {
  playerScore: number;
  aiScore: number;
  /** Outcome from the human's perspective (only meaningful in AI mode). */
  outcome: "win" | "loss";
  durationMs: number;
  /** True if the match was aborted mid-game (quit). No score should be recorded. */
  aborted: boolean;
}

/**
 * Live-tunable graphics settings exposed by `PongGame.applyGfx()`. Every
 * field here can be changed at runtime via the dev panel without
 * rebuilding the scene. Things that *would* require a rebuild (star
 * count, dust count, paddle dimensions) are intentionally not in here.
 */
export interface GfxSettings {
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  toneExposure: number;
  fogDensity: number;
  starSize: number;
  starOpacity: number;
  dustSize: number;
  dustOpacity: number;
  stageOpacity: number;
  shadowOpacity: number;
  keyLightIntensity: number;
  ambientIntensity: number;
  /**
   * Emissive intensity on the paddle BODY material (MeshStandardMaterial).
   * The trim strips are MeshBasicMaterial and always glow at full brightness.
   * Lower values give scene lighting more authority over how paddles look.
   */
  paddleEmissive: number;
  /** Same idea but for the ball. */
  ballEmissive: number;
}

/** Default graphics settings — same on every device for now. The panel
 *  applies any saved overrides on top of these. */
export function defaultGfx(): GfxSettings {
  return {
    bloomStrength: 0.42,
    bloomRadius: 1.63,
    bloomThreshold: 0.43,
    toneExposure: 0.5,
    fogDensity: 0.005,
    starSize: 0.55,
    starOpacity: 0.06,
    dustSize: 0.05,
    dustOpacity: 0.41,
    stageOpacity: 0.05,
    shadowOpacity: 1,
    keyLightIntensity: 1.25,
    ambientIntensity: 0.13,
    paddleEmissive: 0.14,
    ballEmissive: 0.74,
  };
}

const ARENA_WIDTH = 20;
const ARENA_HEIGHT = 12;
const ARENA_DEPTH = 2;
const PADDLE_WIDTH = 0.4;
const PADDLE_HEIGHT = 2.6;
const PADDLE_DEPTH = 1.5;
const BALL_RADIUS = 0.3;
const PADDLE_X_OFFSET = ARENA_WIDTH / 2 - 0.6;
// Paddle motion model for keyboard input:
//  - Accelerates from 0 → max over ~0.14s (snappy but not instant)
//  - Decelerates to 0 over ~0.09s when input released
//  - Max speed sized so a full arena traversal takes ~0.32s under hold
// A short tap (~60ms) produces a small, precise move instead of a lurch.
const HUMAN_PADDLE_MAX_SPEED = 38; // world units per second
const HUMAN_PADDLE_ACCEL = 260; // world units per second^2
const HUMAN_PADDLE_FRICTION = 440; // world units per second^2
const BALL_INITIAL_SPEED = 9;
const BALL_SPEED_INCREMENT = 0.6; // added per paddle hit
const BALL_MAX_SPEED = 22;
const SCORE_TO_WIN = 7;

/** Move `value` toward `target` by at most `maxDelta`. */
function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return value;
}

export class PongGame {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private input: Input;
  private aiController: AIController | null = null;
  private aiLeftController: AIController | null = null; // for demo mode
  /** Public so the dev panel can read it for device-specific defaults. */
  public readonly isMobile: boolean;

  private leftPaddle!: THREE.Mesh;
  private rightPaddle!: THREE.Mesh;
  private ball!: THREE.Mesh;
  // 3D starfield (sphere shell around arena) and dust particles drifting
  // through the play volume — these together sell the "in space" feel.
  private starfield: THREE.Points | null = null;
  private dust: THREE.Points | null = null;
  private dustPositions: Float32Array | null = null;
  private dustVelocities: Float32Array | null = null;

  // Refs to live-tunable scene objects, captured by the build* methods.
  // The dev panel pokes these via applyGfx() so it can re-tune the
  // running scene without a rebuild.
  private bloomPass!: UnrealBloomPass;
  private keyLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private stageMesh!: THREE.Mesh;
  private shadowPlane!: THREE.Mesh;
  private starMat: THREE.PointsMaterial | null = null;
  private dustMat: THREE.PointsMaterial | null = null;
  // Paddle/ball body materials — kept for live emissive tuning via the
  // dev panel. The trim strips are unlit BasicMaterial and not exposed.
  private leftPaddleMat: THREE.MeshStandardMaterial | null = null;
  private rightPaddleMat: THREE.MeshStandardMaterial | null = null;
  private ballMat: THREE.MeshStandardMaterial | null = null;
  // Secondary lights that scale proportionally with the key light so
  // dragging the key-light slider has a dramatic, visible effect.
  private fillLight: THREE.DirectionalLight | null = null;
  private leftRimLight: THREE.PointLight | null = null;
  private rightRimLight: THREE.PointLight | null = null;
  private currentGfx: GfxSettings = defaultGfx();

  // Rolling FPS sampler — last 60 frames averaged.
  private fpsSamples: number[] = [];

  private ballVelocity = new THREE.Vector3();
  // Current paddle vertical velocity (world units per second). Used for
  // smoothed keyboard control — touch input sets the position directly
  // and bypasses these.
  private leftPaddleVel = 0;
  private rightPaddleVel = 0;
  private leftScore = 0;
  private rightScore = 0;
  private mode: GameMode;

  private startedAt = 0;
  private pausedAccumMs = 0;
  private pausedAt = 0;
  private running = false;
  private paused = false;
  private aborted = false;
  private resolveResult: ((result: GameResult) => void) | null = null;

  private onScoreChange: (left: number, right: number) => void;
  private onPauseRequested: () => void;
  private resizeHandler: () => void;

  constructor(opts: {
    canvas: HTMLCanvasElement;
    mode: GameMode;
    onScoreChange: (left: number, right: number) => void;
    /** Called when the player presses Escape in-game. The app decides
     *  whether to show a pause overlay and call `pause()` / `resume()`
     *  / `abort()` on the game. */
    onPauseRequested: () => void;
  }) {
    this.mode = opts.mode;
    this.onScoreChange = opts.onScoreChange;
    this.onPauseRequested = opts.onPauseRequested;

    if (this.mode.kind === "ai") {
      this.aiController = new AIController(this.mode.difficulty);
    } else if (this.mode.kind === "demo") {
      this.aiLeftController = new AIController(this.mode.leftDifficulty);
      this.aiController = new AIController(this.mode.rightDifficulty);
    }

    // Device-aware quality settings — mobile gets a leaner config for
    // higher sustained FPS, desktop keeps softer shadows and AA.
    const isMobile = isTouchDevice();
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: "high-performance",
    });
    // Cap DPR: 1.5 on desktop is the sweet spot (vs 2 = 44% more pixels);
    // 1.0 on mobile because retina phones absolutely crush the fragment
    // shader budget with bloom at 3x.
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5),
    );
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = isMobile
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap;
    // Tone mapping keeps highlights from blowing out to pure white.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.currentGfx.toneExposure;
    this.isMobile = isMobile;

    this.scene = new THREE.Scene();
    // Sparse exponential fog in the same near-black as the CSS --bg-0.
    // Density is intentionally low so the 3D starfield stays visible
    // out at depth — the arena should feel like it floats in deep
    // space with stars in every direction, not inside a fogged room.
    this.scene.fog = new THREE.FogExp2(0x000500, this.currentGfx.fogDensity);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 9, 18);
    this.camera.lookAt(0, 0, 0);

    this.buildArena();
    this.buildStarfield();
    this.buildDust();
    this.buildPaddlesAndBall();
    this.buildLights();

    // Post-processing — very subtle bloom. Only the brightest pixels
    // (ball, paddle edges) should bloom, so the threshold is high and
    // the strength is modest. UnrealBloomPass already does a half-res
    // pass internally; on mobile we feed it half the viewport size to
    // get another 4x savings on bloom cost (quarter-res total).
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomScale = this.isMobile ? 0.5 : 1.0;
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(
        window.innerWidth * bloomScale,
        window.innerHeight * bloomScale,
      ),
      this.currentGfx.bloomStrength,
      this.currentGfx.bloomRadius,
      this.currentGfx.bloomThreshold,
    );
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
    this.bloomPass = bloom;

    this.input = new Input();

    this.resizeHandler = () => this.handleResize();
    window.addEventListener("resize", this.resizeHandler);
  }

  private buildArena(): void {
    // === ARENA IN SPACE ===
    // No floor. No walls. The arena is a region of space, not a box.
    // What you see:
    //   - Two energy bars marking the top and bottom collision boundaries
    //   - An invisible ShadowMaterial plane that catches paddle/ball shadows
    //     so the ball's vertical position is still readable in 3D
    //   - A subtle radial-fade stage glow disc just for soft visual anchoring
    //   - A faint center court line
    // Stars and dust are added separately by buildStarfield()/buildDust().

    // --- Top and bottom boundary energy bars ---
    // These are now the *only* arena markers. They sit on the actual
    // collision Y so they double as a visual reference for the ball.
    // Bright enough to clear the bloom threshold and read as energy lines.
    const boundaryMat = new THREE.MeshBasicMaterial({
      color: 0x00ff55,
      fog: false,
    });
    const boundaryGeo = new THREE.BoxGeometry(ARENA_WIDTH, 0.12, 0.16);
    const topBar = new THREE.Mesh(boundaryGeo, boundaryMat);
    topBar.position.set(0, ARENA_HEIGHT / 2, 0);
    this.scene.add(topBar);
    const bottomBar = new THREE.Mesh(boundaryGeo, boundaryMat);
    bottomBar.position.set(0, -ARENA_HEIGHT / 2, 0);
    this.scene.add(bottomBar);

    // --- Invisible shadow catcher ---
    // ShadowMaterial renders nothing EXCEPT where shadows fall on it. The
    // result: ball and paddle shadows appear to float in empty space below
    // the arena, which is exactly the "in space" effect we want — no floor
    // visible, but still a clear visual cue for the ball's vertical position.
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_WIDTH * 1.4, ARENA_HEIGHT * 1.3),
      new THREE.ShadowMaterial({ opacity: this.currentGfx.shadowOpacity }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -ARENA_HEIGHT / 2 - 0.005;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
    this.shadowPlane = shadowPlane;

    // --- Soft stage glow disc ---
    // A circle below the arena with a radial vertex-color fade from a dim
    // phosphor green at center to fully transparent at the edge. Soft hint
    // of "this is the play volume" without being a hard surface. The fade
    // is per-vertex so there's no hard edge to break the illusion.
    const stageRadius = ARENA_WIDTH * 0.62;
    const stageGeo = new THREE.CircleGeometry(stageRadius, 64);
    const stagePositions = stageGeo.attributes.position!;
    const stageColors = new Float32Array(stagePositions.count * 3);
    for (let i = 0; i < stagePositions.count; i++) {
      const x = stagePositions.getX(i);
      const y = stagePositions.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const t = Math.min(1, dist / stageRadius);
      // Smoothstep-ish falloff: bright center, soft tail to nothing
      const v = (1 - t) * (1 - t) * 0.35;
      stageColors[i * 3] = v * 0.05;
      stageColors[i * 3 + 1] = v;
      stageColors[i * 3 + 2] = v * 0.25;
    }
    stageGeo.setAttribute(
      "color",
      new THREE.BufferAttribute(stageColors, 3),
    );
    const stage = new THREE.Mesh(
      stageGeo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: this.currentGfx.stageOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: true,
      }),
    );
    stage.rotation.x = -Math.PI / 2;
    stage.position.y = -ARENA_HEIGHT / 2 - 0.01;
    this.scene.add(stage);
    this.stageMesh = stage;

    // --- Faint center court line ---
    // Just a vertical reference line so players can judge the midfield.
    // Kept extremely dim so it reads as an energy line, not a hard divider.
    const centerMat = new THREE.MeshBasicMaterial({
      color: 0x0a3d1a,
      transparent: true,
      opacity: 0.55,
      fog: false,
    });
    const centerGeo = new THREE.BoxGeometry(0.04, ARENA_HEIGHT * 0.92, 0.02);
    this.scene.add(new THREE.Mesh(centerGeo, centerMat));
  }

  private buildStarfield(): void {
    // 3D stars distributed in a sphere shell around the arena. The shell
    // is roughly 70..180 units from origin so the closest stars are well
    // outside the play volume (arena radius is ~10) and the farthest are
    // safely inside the camera's far plane (200) and the dense fog cutoff.
    const count = this.isMobile ? 900 : 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Uniform sphere shell sampling.
      const r = 70 + Math.random() * 110;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Color tinting: mostly soft phosphor white-green, occasional cyan,
      // rare amber. Matches the CSS starfield palette so the two layers
      // feel like part of the same universe.
      const tint = Math.random();
      let cr: number;
      let cg: number;
      let cb: number;
      if (tint > 0.94) {
        // amber star (rare)
        cr = 1.0;
        cg = 0.78;
        cb = 0.32;
      } else if (tint > 0.78) {
        // cyan star
        cr = 0.45;
        cg = 0.95;
        cb = 1.0;
      } else if (tint > 0.5) {
        // bright phosphor green
        cr = 0.55;
        cg = 1.0;
        cb = 0.65;
      } else {
        // dim white-green
        const dim = 0.55 + Math.random() * 0.4;
        cr = dim * 0.85;
        cg = dim;
        cb = dim * 0.85;
      }
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: this.currentGfx.starSize,
      vertexColors: true,
      transparent: true,
      opacity: this.currentGfx.starOpacity,
      // Stars don't fog — they're already past the fog dropoff and need
      // to remain visible at all distances.
      fog: false,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.starfield = new THREE.Points(geo, mat);
    this.starMat = mat;
    this.scene.add(this.starfield);
  }

  private buildDust(): void {
    // Slow-drifting space dust filling a wide volume around the arena.
    // Sparse enough not to clutter, plentiful enough to feel like
    // "atmosphere" suggesting the camera is floating in something.
    const count = this.isMobile ? 100 : 220;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * ARENA_WIDTH * 1.9;
      positions[i * 3 + 1] = (Math.random() - 0.5) * ARENA_HEIGHT * 1.7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 32 - 6;

      velocities[i * 3] = (Math.random() - 0.5) * 0.08;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.06 + 0.04;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.04;

      const dim = 0.35 + Math.random() * 0.35;
      colors[i * 3] = dim * 0.45;
      colors[i * 3 + 1] = dim;
      colors[i * 3 + 2] = dim * 0.55;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: this.currentGfx.dustSize,
      vertexColors: true,
      transparent: true,
      opacity: this.currentGfx.dustOpacity,
      fog: true, // dust fades naturally with depth
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.dust = new THREE.Points(geo, mat);
    this.dustMat = mat;
    this.dustPositions = positions;
    this.dustVelocities = velocities;
    this.scene.add(this.dust);
  }

  /**
   * Advance dust positions one timestep with wraparound bounds, then
   * mark the position attribute dirty so three.js re-uploads it.
   */
  private updateDust(dt: number): void {
    if (!this.dust || !this.dustPositions || !this.dustVelocities) return;
    const pos = this.dustPositions;
    const vel = this.dustVelocities;
    const xMax = ARENA_WIDTH * 1.0;
    const yMax = ARENA_HEIGHT * 0.9;
    const zMin = -22;
    const zMax = 12;
    const xSpan = xMax * 2;
    const ySpan = yMax * 2;
    const zSpan = zMax - zMin;
    const count = pos.length / 3;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      let px = (pos[ix] ?? 0) + (vel[ix] ?? 0) * dt;
      let py = (pos[ix + 1] ?? 0) + (vel[ix + 1] ?? 0) * dt;
      let pz = (pos[ix + 2] ?? 0) + (vel[ix + 2] ?? 0) * dt;
      // Wraparound — when a particle exits one edge, it appears on the
      // opposite edge. Nothing pops because dust is sparse and dim.
      if (px > xMax) px -= xSpan;
      else if (px < -xMax) px += xSpan;
      if (py > yMax) py -= ySpan;
      else if (py < -yMax) py += ySpan;
      if (pz > zMax) pz -= zSpan;
      else if (pz < zMin) pz += zSpan;
      pos[ix] = px;
      pos[ix + 1] = py;
      pos[ix + 2] = pz;
    }
    const attr = this.dust.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  private buildPaddlesAndBall(): void {
    const paddleGeo = new THREE.BoxGeometry(
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      PADDLE_DEPTH,
    );

    // Paddles — mostly lit by scene lights, only a very slight self-tint.
    // Left = terminal green, Right = amber. Exact match with the CSS palette.
    // Emissive intensity comes from currentGfx so the dev panel can tune it
    // live, and so a low default here gives the key/ambient lights real
    // authority over how paddles look instead of being swamped by emissive.
    // Base colors are deliberately bright enough that scene lights visibly
    // illuminate the surface. If these are too dark (like 0x0a3d1a), the
    // emissive drowns out all lighting changes and the key/ambient sliders
    // do nothing. Metalness kept very low so nearly all light energy goes
    // into diffuse rather than specular reflection.
    const leftMat = new THREE.MeshStandardMaterial({
      color: 0x2a8a4a,
      emissive: 0x00ff41,
      emissiveIntensity: this.currentGfx.paddleEmissive,
      metalness: 0.1,
      roughness: 0.5,
    });
    const rightMat = new THREE.MeshStandardMaterial({
      color: 0x8a6020,
      emissive: 0xffb000,
      emissiveIntensity: this.currentGfx.paddleEmissive,
      metalness: 0.1,
      roughness: 0.5,
    });
    this.leftPaddleMat = leftMat;
    this.rightPaddleMat = rightMat;

    this.leftPaddle = new THREE.Mesh(paddleGeo, leftMat);
    this.leftPaddle.position.x = -PADDLE_X_OFFSET;
    this.leftPaddle.castShadow = true;
    this.leftPaddle.receiveShadow = true;
    this.scene.add(this.leftPaddle);

    // Bright trim strips on paddle faces — these alone hit the bloom
    // threshold. fog:false keeps them crisp regardless of distance.
    const leftTrim = new THREE.Mesh(
      new THREE.BoxGeometry(PADDLE_WIDTH + 0.02, PADDLE_HEIGHT, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x00ff41, fog: false }),
    );
    leftTrim.position.z = PADDLE_DEPTH / 2 + 0.01;
    this.leftPaddle.add(leftTrim);

    this.rightPaddle = new THREE.Mesh(paddleGeo, rightMat);
    this.rightPaddle.position.x = PADDLE_X_OFFSET;
    this.rightPaddle.castShadow = true;
    this.rightPaddle.receiveShadow = true;
    this.scene.add(this.rightPaddle);

    const rightTrim = new THREE.Mesh(
      new THREE.BoxGeometry(PADDLE_WIDTH + 0.02, PADDLE_HEIGHT, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xffb000, fog: false }),
    );
    rightTrim.position.z = PADDLE_DEPTH / 2 + 0.01;
    this.rightPaddle.add(rightTrim);

    // Ball — mostly lit by the scene, bright emissive core is what blooms.
    // Slight green tint on the base color so it reads as "part of the
    // phosphor world" instead of a floating white dot.
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x99ddbb,
      emissive: 0xd8ffe4,
      emissiveIntensity: this.currentGfx.ballEmissive,
      metalness: 0.1,
      roughness: 0.45,
    });
    this.ball = new THREE.Mesh(ballGeo, ballMat);
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    this.ballMat = ballMat;
  }

  private buildLights(): void {
    // Cool green ambient — matches the starfield hue.
    const ambient = new THREE.AmbientLight(
      0x88bba0,
      this.currentGfx.ambientIntensity,
    );
    this.scene.add(ambient);
    this.ambientLight = ambient;

    // Key light — main source, placed high and to the side so paddles
    // and the ball cast a clearly visible shadow across the floor.
    const key = new THREE.DirectionalLight(
      0xe0ffea,
      this.currentGfx.keyLightIntensity,
    );
    key.position.set(7, 16, 8);
    key.target.position.set(0, 0, 0);
    this.scene.add(key.target);
    key.castShadow = true;
    // 512 on mobile, 1024 on desktop — 2048 was massive overkill for a
    // pong game and shadow sampling was eating the fragment budget.
    const shadowSize = this.isMobile ? 512 : 1024;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    key.shadow.camera.left = -ARENA_WIDTH;
    key.shadow.camera.right = ARENA_WIDTH;
    key.shadow.camera.top = ARENA_HEIGHT;
    key.shadow.camera.bottom = -ARENA_HEIGHT;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    key.shadow.bias = -0.0003;
    key.shadow.radius = this.isMobile ? 2 : 3;
    this.scene.add(key);
    this.keyLight = key;

    // Cool green fill from the opposite side so the dark sides aren't black.
    // Intensity scales with key light so the slider has a dramatic effect.
    const fill = new THREE.DirectionalLight(0x3a7a52, 0.2);
    fill.position.set(-6, 6, 4);
    this.scene.add(fill);
    this.fillLight = fill;

    // Subtle tinted rim lights for a hint of color on the paddle sides.
    // Also scale with key light intensity.
    const leftRim = new THREE.PointLight(0x00ff41, 0.25, 20, 1.8);
    leftRim.position.set(-9, 2, 4);
    this.scene.add(leftRim);
    this.leftRimLight = leftRim;
    const rightRim = new THREE.PointLight(0xffb000, 0.2, 20, 1.8);
    rightRim.position.set(9, 2, 4);
    this.scene.add(rightRim);
    this.rightRimLight = rightRim;
  }

  /**
   * Advance a paddle's vertical velocity one timestep. Input `axis` is
   * -1 (up), 0 (idle) or +1 (down). Accelerates toward max in the
   * requested direction, otherwise applies friction back to 0.
   *
   * Note: positive velocity in this model means paddle moves DOWN (since
   * the update subtracts `vel * dt` from Y). An `axis` of -1 (W / ArrowUp)
   * therefore targets a negative velocity, which moves the paddle up.
   */
  private stepPaddleVelocity(
    currentVel: number,
    axis: number,
    dt: number,
  ): number {
    if (axis !== 0) {
      const targetVel = axis * HUMAN_PADDLE_MAX_SPEED;
      return approach(currentVel, targetVel, HUMAN_PADDLE_ACCEL * dt);
    }
    return approach(currentVel, 0, HUMAN_PADDLE_FRICTION * dt);
  }

  private resetBall(towardLeft: boolean): void {
    this.ball.position.set(0, 0, 0);
    const angle = (Math.random() - 0.5) * (Math.PI / 4); // ±22.5°
    const direction = towardLeft ? -1 : 1;
    this.ballVelocity.set(
      Math.cos(angle) * BALL_INITIAL_SPEED * direction,
      Math.sin(angle) * BALL_INITIAL_SPEED,
      0,
    );
  }

  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Start the game and resolve when one side reaches SCORE_TO_WIN, or
   *  immediately when `abort()` is called. In demo mode, the loop keeps
   *  running until abort(). */
  start(): Promise<GameResult> {
    // Demo mode ignores all human input — Escape/touch/keys should be
    // handled by the attract screen, not by the game itself.
    if (this.mode.kind !== "demo") {
      this.input.attach();
    }
    this.leftScore = 0;
    this.rightScore = 0;
    this.leftPaddleVel = 0;
    this.rightPaddleVel = 0;
    this.leftPaddle.position.y = 0;
    this.rightPaddle.position.y = 0;
    this.onScoreChange(0, 0);
    this.resetBall(Math.random() < 0.5);
    this.startedAt = performance.now();
    this.pausedAccumMs = 0;
    this.pausedAt = 0;
    this.lastTickTime = 0;
    this.running = true;
    this.paused = false;
    this.aborted = false;

    return new Promise<GameResult>((resolve) => {
      this.resolveResult = resolve;
      this.renderer.setAnimationLoop((time) => this.tick(time));
    });
  }

  /** Pause physics and input processing. The scene keeps rendering so
   *  the background doesn't go black while the pause overlay is shown. */
  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.pausedAt = performance.now();
  }

  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    // Track accumulated paused time so the final durationMs only counts
    // real play time, and reset lastTickTime so dt doesn't spike.
    if (this.pausedAt > 0) {
      this.pausedAccumMs += performance.now() - this.pausedAt;
      this.pausedAt = 0;
    }
    this.lastTickTime = 0;
  }

  /** Immediately end the match. The `start()` promise resolves with
   *  `aborted: true` and the current score. No stats should be recorded. */
  abort(): void {
    if (!this.running) return;
    this.aborted = true;
    this.finish();
  }

  private lastTickTime = 0;
  private tick(time: number): void {
    if (!this.running) return;

    // Escape key → bubble up to the app. We do NOT self-pause here —
    // the app decides whether to pause (and will call pause() on us).
    // Demo mode doesn't have input attached, so this is a no-op there.
    if (this.mode.kind !== "demo" && this.input.consumeEscape()) {
      this.onPauseRequested();
    }

    // While paused, just keep rendering the current frame (no physics,
    // no input polling for movement, no dt accumulation).
    if (this.paused) {
      this.composer.render();
      return;
    }

    const dtMs =
      this.lastTickTime === 0 ? 16 : Math.min(50, time - this.lastTickTime);
    this.lastTickTime = time;
    const dt = dtMs / 1000;

    // FPS sampler — instantaneous fps from this frame's dt; rolling avg
    // is computed in getFps().
    if (dt > 0) {
      this.fpsSamples.push(1 / dt);
      if (this.fpsSamples.length > 60) this.fpsSamples.shift();
    }

    this.updatePaddles(dt, time / 1000);
    this.updateBall(dt);
    this.updateDust(dt);
    this.composer.render();
  }

  private updatePaddles(dt: number, nowSeconds: number): void {
    const halfH = ARENA_HEIGHT / 2 - PADDLE_HEIGHT / 2;

    // Left paddle.
    if (this.mode.kind === "demo" && this.aiLeftController) {
      // Demo mode: both paddles are AI-controlled.
      const target = this.aiLeftController.computeTargetY(
        {
          x: this.ball.position.x,
          y: this.ball.position.y,
          vx: this.ballVelocity.x,
          vy: this.ballVelocity.y,
        },
        this.leftPaddle.position.y,
        -PADDLE_X_OFFSET,
        halfH,
        nowSeconds,
      );
      const maxStep = this.aiLeftController.maxSpeedFor(ARENA_WIDTH) * dt;
      const dy = target - this.leftPaddle.position.y;
      const step = THREE.MathUtils.clamp(dy, -maxStep, maxStep);
      this.leftPaddle.position.y = THREE.MathUtils.clamp(
        this.leftPaddle.position.y + step,
        -halfH,
        halfH,
      );
    } else {
      // Human player 1. Touch takes priority over keyboard: on mobile
      // the paddle tracks the finger Y directly (1:1 position control).
      // Keyboard uses a smoothed velocity model so short taps produce
      // small, precise moves instead of lurching.
      const touchY = this.input.getTouchY();
      if (touchY !== null) {
        const targetY = (0.5 - touchY) * ARENA_HEIGHT;
        this.leftPaddle.position.y = THREE.MathUtils.clamp(
          targetY,
          -halfH,
          halfH,
        );
        this.leftPaddleVel = 0;
      } else {
        const p1 = this.input.player1Axis();
        this.leftPaddleVel = this.stepPaddleVelocity(
          this.leftPaddleVel,
          p1,
          dt,
        );
        this.leftPaddle.position.y = THREE.MathUtils.clamp(
          this.leftPaddle.position.y - this.leftPaddleVel * dt,
          -halfH,
          halfH,
        );
        if (
          this.leftPaddle.position.y === halfH ||
          this.leftPaddle.position.y === -halfH
        ) {
          this.leftPaddleVel = 0;
        }
      }
    }

    // Right paddle = human player 2, AI, or demo AI.
    if (this.mode.kind === "local2p") {
      const p2 = this.input.player2Axis();
      this.rightPaddleVel = this.stepPaddleVelocity(
        this.rightPaddleVel,
        p2,
        dt,
      );
      this.rightPaddle.position.y = THREE.MathUtils.clamp(
        this.rightPaddle.position.y - this.rightPaddleVel * dt,
        -halfH,
        halfH,
      );
      if (
        this.rightPaddle.position.y === halfH ||
        this.rightPaddle.position.y === -halfH
      ) {
        this.rightPaddleVel = 0;
      }
    } else if (this.aiController) {
      const target = this.aiController.computeTargetY(
        {
          x: this.ball.position.x,
          y: this.ball.position.y,
          vx: this.ballVelocity.x,
          vy: this.ballVelocity.y,
        },
        this.rightPaddle.position.y,
        PADDLE_X_OFFSET,
        halfH,
        nowSeconds,
      );
      const maxStep = this.aiController.maxSpeedFor(ARENA_WIDTH) * dt;
      const dy = target - this.rightPaddle.position.y;
      const step = THREE.MathUtils.clamp(dy, -maxStep, maxStep);
      this.rightPaddle.position.y = THREE.MathUtils.clamp(
        this.rightPaddle.position.y + step,
        -halfH,
        halfH,
      );
    }
  }

  private updateBall(dt: number): void {
    this.ball.position.x += this.ballVelocity.x * dt;
    this.ball.position.y += this.ballVelocity.y * dt;

    // Top/bottom wall bounce
    const halfH = ARENA_HEIGHT / 2 - BALL_RADIUS;
    if (this.ball.position.y > halfH) {
      this.ball.position.y = halfH;
      this.ballVelocity.y *= -1;
      sfx.wallHit();
    } else if (this.ball.position.y < -halfH) {
      this.ball.position.y = -halfH;
      this.ballVelocity.y *= -1;
      sfx.wallHit();
    }

    // Paddle collisions
    this.handlePaddleCollision(this.leftPaddle, true);
    this.handlePaddleCollision(this.rightPaddle, false);

    // Score
    const halfW = ARENA_WIDTH / 2 + BALL_RADIUS;
    if (this.ball.position.x > halfW) {
      this.leftScore += 1;
      this.onScoreChange(this.leftScore, this.rightScore);
      sfx.score();
      if (this.leftScore >= SCORE_TO_WIN) {
        if (this.mode.kind === "demo") {
          // Demo mode never ends — reset scores and keep rallying.
          this.leftScore = 0;
          this.rightScore = 0;
          this.onScoreChange(0, 0);
        } else {
          return this.finish();
        }
      }
      this.resetBall(false);
    } else if (this.ball.position.x < -halfW) {
      this.rightScore += 1;
      this.onScoreChange(this.leftScore, this.rightScore);
      sfx.score();
      if (this.rightScore >= SCORE_TO_WIN) {
        if (this.mode.kind === "demo") {
          this.leftScore = 0;
          this.rightScore = 0;
          this.onScoreChange(0, 0);
        } else {
          return this.finish();
        }
      }
      this.resetBall(true);
    }
  }

  private handlePaddleCollision(paddle: THREE.Mesh, isLeft: boolean): void {
    const px = paddle.position.x;
    const py = paddle.position.y;
    const minX = px - PADDLE_WIDTH / 2 - BALL_RADIUS;
    const maxX = px + PADDLE_WIDTH / 2 + BALL_RADIUS;
    const minY = py - PADDLE_HEIGHT / 2 - BALL_RADIUS;
    const maxY = py + PADDLE_HEIGHT / 2 + BALL_RADIUS;

    const bx = this.ball.position.x;
    const by = this.ball.position.y;

    if (bx < minX || bx > maxX || by < minY || by > maxY) return;

    // Only reflect if the ball is moving toward the paddle (avoids stuck bounces).
    const movingTowardLeft = this.ballVelocity.x < 0;
    if (isLeft && !movingTowardLeft) return;
    if (!isLeft && movingTowardLeft) return;

    // Hit position determines reflection angle: top of paddle = upward, etc.
    const relative = (by - py) / (PADDLE_HEIGHT / 2);
    const clamped = THREE.MathUtils.clamp(relative, -1, 1);
    const bounceAngle = clamped * (Math.PI / 3); // up to ±60°

    const speed = Math.min(
      Math.hypot(this.ballVelocity.x, this.ballVelocity.y) +
        BALL_SPEED_INCREMENT,
      BALL_MAX_SPEED,
    );
    const direction = isLeft ? 1 : -1;
    this.ballVelocity.x = Math.cos(bounceAngle) * speed * direction;
    this.ballVelocity.y = Math.sin(bounceAngle) * speed;

    // Nudge the ball out of the paddle.
    this.ball.position.x = isLeft ? maxX : minX;

    sfx.paddleHit();
  }

  private finish(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    // If aborted mid-pause, include the ongoing pause duration in the excluded
    // time so the reported durationMs is still only active play.
    const extraPaused =
      this.paused && this.pausedAt > 0
        ? performance.now() - this.pausedAt
        : 0;
    const durationMs = Math.max(
      0,
      performance.now() - this.startedAt - this.pausedAccumMs - extraPaused,
    );
    const playerScore = this.leftScore;
    const aiScore = this.rightScore;
    const outcome: "win" | "loss" =
      playerScore > aiScore ? "win" : "loss";

    // Play the appropriate sting — but only for a natural end in a real
    // match (not demo mode, not a quit-to-menu abort).
    if (!this.aborted && this.mode.kind !== "demo") {
      if (outcome === "win") {
        sfx.win();
      } else {
        sfx.loss();
      }
    }

    this.resolveResult?.({
      playerScore,
      aiScore,
      outcome,
      durationMs,
      aborted: this.aborted,
    });
    this.resolveResult = null;
  }

  /**
   * Apply a partial set of graphics settings to the running scene.
   * Every field is independently optional. Called by the dev panel when
   * a slider moves; can also be called once at startup with the saved
   * overrides.
   */
  applyGfx(partial: Partial<GfxSettings>): void {
    const next: GfxSettings = { ...this.currentGfx, ...partial };
    this.currentGfx = next;

    // Post-processing
    if (this.bloomPass) {
      this.bloomPass.strength = next.bloomStrength;
      this.bloomPass.radius = next.bloomRadius;
      this.bloomPass.threshold = next.bloomThreshold;
    }
    this.renderer.toneMappingExposure = next.toneExposure;

    // Fog
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog && "density" in fog) {
      fog.density = next.fogDensity;
    }

    // Lights — fill + rim scale proportionally with the key light so
    // dragging the slider has a dramatic, visible effect on the whole scene.
    if (this.keyLight) this.keyLight.intensity = next.keyLightIntensity;
    if (this.ambientLight) this.ambientLight.intensity = next.ambientIntensity;
    const keyRatio = next.keyLightIntensity / 1.25; // normalized to default
    if (this.fillLight) this.fillLight.intensity = 0.2 * keyRatio;
    if (this.leftRimLight) this.leftRimLight.intensity = 0.25 * keyRatio;
    if (this.rightRimLight) this.rightRimLight.intensity = 0.2 * keyRatio;

    // Stage glow + invisible shadow plane
    if (this.stageMesh) {
      const m = this.stageMesh.material as THREE.MeshBasicMaterial;
      m.opacity = next.stageOpacity;
    }
    if (this.shadowPlane) {
      const m = this.shadowPlane.material as THREE.ShadowMaterial;
      m.opacity = next.shadowOpacity;
    }

    // Stars / dust
    if (this.starMat) {
      this.starMat.size = next.starSize;
      this.starMat.opacity = next.starOpacity;
    }
    if (this.dustMat) {
      this.dustMat.size = next.dustSize;
      this.dustMat.opacity = next.dustOpacity;
    }

    // Paddle + ball emissive (drives how much the scene lighting matters
    // vs a constant self-glow). Low values = lighting-dominated look;
    // high values = the old pre-refactor "always glowing" look.
    if (this.leftPaddleMat) {
      this.leftPaddleMat.emissiveIntensity = next.paddleEmissive;
    }
    if (this.rightPaddleMat) {
      this.rightPaddleMat.emissiveIntensity = next.paddleEmissive;
    }
    if (this.ballMat) {
      this.ballMat.emissiveIntensity = next.ballEmissive;
    }
  }

  /** Read-only snapshot of the current graphics settings. */
  getGfx(): GfxSettings {
    return { ...this.currentGfx };
  }

  /** Average FPS over the last ~60 frames. Returns 0 before any samples. */
  getFps(): number {
    if (this.fpsSamples.length === 0) return 0;
    let sum = 0;
    for (const s of this.fpsSamples) sum += s;
    return sum / this.fpsSamples.length;
  }

  /** Stop the loop and free GPU/event resources. */
  dispose(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.input.detach();
    window.removeEventListener("resize", this.resizeHandler);
    this.composer.dispose();
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((mi) => mi.dispose());
        else m.dispose();
      }
    });
  }
}
