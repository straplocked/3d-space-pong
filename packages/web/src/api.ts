import type {
  SignUpInput,
  SignUpResponse,
  MatchResultInput,
  LeaderboardRow,
  LeaderboardSort,
  Difficulty,
} from "@3d-pong/shared";

const API_BASE = "/api";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  let body: BodyInit | undefined;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, body });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export const api = {
  health: () => request<{ status: string; vibes: string }>("/health"),

  signup: (input: SignUpInput) =>
    request<SignUpResponse>("/signup", { method: "POST", json: input }),

  recordMatch: (input: MatchResultInput) =>
    request<{ matchId: number | null }>("/matches", {
      method: "POST",
      json: input,
    }),

  leaderboard: (opts: {
    sort?: LeaderboardSort;
    difficulty?: Difficulty;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.difficulty) params.set("difficulty", opts.difficulty);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<{
      sort: LeaderboardSort;
      difficulty: Difficulty | null;
      leaderboard: LeaderboardRow[];
    }>(`/leaderboard${qs ? `?${qs}` : ""}`);
  },
};

export { ApiError };
