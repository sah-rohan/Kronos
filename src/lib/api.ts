import { API_URL } from "./env";

export type TokenFn = () => Promise<string | null>;

const base = (API_URL ?? "").replace(/\/$/, "");

let displayName = "";
export function setDisplayName(name: string) {
  displayName = name ?? "";
}

let userEmail = "";
export function setUserEmail(email: string) {
  userEmail = email ?? "";
}

async function call<T>(path: string, getToken: TokenFn, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const url = new URL(`${base}${path}`);
  if (displayName) url.searchParams.set("name", displayName);
  if (userEmail) url.searchParams.set("email", userEmail);
  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token ?? ""}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string, t: TokenFn) => call<T>(path, t);
const post = (path: string, t: TokenFn, body?: object) =>
  call(path, t, { method: "POST", body: body && JSON.stringify(body) });
const del = (path: string, t: TokenFn) => call(path, t, { method: "DELETE" });

const recentQ = (recent: boolean) => (recent ? "?recent=1" : "");
const kindQ = (kind?: SdKind) => (kind ? `?kind=${kind}` : "");

export type SdKind = "design" | "genai";

// A 409 means the LeetCode username is already linked to someone else.
export const isConflict = (e: unknown) => String(e).includes("409");

export const api = {
  me: (t: TokenFn) => get<MeResponse>("/me", t),
  setProfile: (t: TokenFn, username: string, github: string) => post("/me/profile", t, { username, github }),
  syncNow: (t: TokenFn) => post("/me/sync", t),
  visit: (t: TokenFn) => post("/me/visit", t),
  sdSolved: (t: TokenFn) => get<string[]>("/me/sd", t),
  sdSolve: (t: TokenFn, slug: string) => post(`/me/sd/${slug}`, t),
  sdLeaderboard: (t: TokenFn, kind?: SdKind) => get<SdLeader[]>(`/sd/leaderboard${kindQ(kind)}`, t),
  sdActivity: (t: TokenFn, kind?: SdKind) => get<SdActivity[]>(`/sd/activity${kindQ(kind)}`, t),
  mySdActivity: (t: TokenFn) => get<SdActivity[]>("/me/sd/activity", t),
  requestUsername: (t: TokenFn, username: string) => post("/me/username-request", t, { username }),
  setTheme: (t: TokenFn, theme: string) => post("/me/theme", t, { theme }),
  progress: (t: TokenFn) => get<ApiProblem[]>("/me/progress", t),
  leaderboard: (t: TokenFn) => get<ApiLeader[]>("/leaderboard", t),
  recent: (t: TokenFn) => get<ApiRecent[]>("/recent", t),
  groupDifficulty: (t: TokenFn) => get<ApiDifficultyTotal[]>("/group/difficulty", t),
  circleDifficulty: (t: TokenFn) => get<ApiDifficultyTotal[]>("/me/circle", t),
  calendar: (t: TokenFn) => get<ApiDay[]>("/me/calendar", t),
  calendarProblems: (t: TokenFn) => get<ApiCalendarProblem[]>("/me/calendar/problems", t),
  mySolutions: (t: TokenFn, slug: string, recent = false) =>
    get<ApiSolution[]>(`/me/problem/${slug}${recentQ(recent)}`, t),
  friends: (t: TokenFn) => get<ApiFriend[]>("/friends", t),
  directory: (t: TokenFn) => get<ApiFriend[]>("/users", t),
  friendRequests: (t: TokenFn) => get<ApiFriend[]>("/friends/requests", t),
  acceptRequest: (t: TokenFn, id: string) => post("/friends/requests/accept", t, { id }),
  declineRequest: (t: TokenFn, id: string) => post("/friends/requests/decline", t, { id }),
  addFriend: (t: TokenFn, username: string) => post("/friends", t, { username }),
  removeFriend: (t: TokenFn, id: string) => del(`/friends/${id}`, t),
  friendProgress: (t: TokenFn, id: string) => get<ApiProblem[]>(`/friends/${id}/progress`, t),
  friendCalendar: (t: TokenFn, id: string) => get<ApiDay[]>(`/friends/${id}/calendar`, t),
  friendCalendarProblems: (t: TokenFn, id: string) => get<ApiCalendarProblem[]>(`/friends/${id}/calendar/problems`, t),
  friendSolutions: (t: TokenFn, id: string, slug: string, recent = false) =>
    get<ApiSolution[]>(`/friends/${id}/problem/${slug}${recentQ(recent)}`, t),
  adminPending: (t: TokenFn) => get<MeResponse[]>("/admin/pending", t),
  adminUsers: (t: TokenFn) => get<MeResponse[]>("/admin/users", t),
  adminAnalytics: (t: TokenFn) => get<Analytics>("/admin/analytics", t),
  adminApprove: (t: TokenFn, id: string) => post("/admin/approve", t, { id }),
  adminSetUsername: (t: TokenFn, id: string, username: string) => post("/admin/username", t, { id, username }),
  adminRemove: (t: TokenFn, id: string) => del(`/admin/users/${id}`, t),
  adminReject: (t: TokenFn, id: string) => del(`/admin/users/${id}/purge`, t),
  adminLeetcodeSession: (t: TokenFn) => get<LeetcodeSession>("/admin/leetcode-session", t),
  adminSetLeetcodeSession: (t: TokenFn, token: string, expiresAt: string) =>
    post("/admin/leetcode-session", t, { token, expiresAt }),
};

export type LeetcodeSession = { expiresAt: string; hasToken: boolean };

export type MeResponse = {
  id: string;
  username: string;
  github: string;
  name: string;
  email?: string;
  status: string;
  role: string;
  theme: string;
  season: number;
  requestedUsername?: string;
};
export type ApiProblem = {
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  done: boolean;
  optimal: boolean;
  blind75: boolean;
  neetcode150: boolean;
  neetcode250: boolean;
};
export type ApiLeader = { name: string; username: string; blind75: number; neetcode150: number; neetcode250: number; all: number; easy: number; medium: number; hard: number };
export type ApiRecent = { n: number; slug: string; name: string; diff: string; who: string[]; at: string };
export type ApiCalendarProblem = { date: string; slug: string; title: string; difficulty: string };
export type ApiDifficultyTotal = { label: string; count: number };
export type ApiDay = { date: string; count: number };
export type SdLeader = { name: string; username: string; count: number };
export type SdActivity = { name: string; username: string; slug: string; at: string };
export type Analytics = {
  users: number;
  pending: number;
  solves: number;
  solves7d: number;
  active7d: number;
  views: number;
  views7d: number;
  perDay: ApiDay[];
};
export type ApiFriend = { id: string; name: string; username: string; solved: number };
export type ApiSolution = {
  slug: string;
  lang: string;
  code: string;
  runtimeMs: number;
  runtimePct: number;
  optimal: boolean;
};
