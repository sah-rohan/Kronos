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

export const api = {
  me: (t: TokenFn) => call<MeResponse>("/me", t),
  setProfile: (t: TokenFn, username: string, github: string) =>
    call("/me/profile", t, { method: "POST", body: JSON.stringify({ username, github }) }),
  syncNow: (t: TokenFn) => call("/me/sync", t, { method: "POST" }),
  visit: (t: TokenFn) => call("/me/visit", t, { method: "POST" }),
  sdSolved: (t: TokenFn) => call<string[]>("/me/sd", t),
  sdSolve: (t: TokenFn, slug: string) => call(`/me/sd/${slug}`, t, { method: "POST" }),
  sdLeaderboard: (t: TokenFn, kind?: "design" | "genai") =>
    call<SdLeader[]>(`/sd/leaderboard${kind ? `?kind=${kind}` : ""}`, t),
  sdActivity: (t: TokenFn, kind?: "design" | "genai") =>
    call<SdActivity[]>(`/sd/activity${kind ? `?kind=${kind}` : ""}`, t),
  mySdActivity: (t: TokenFn) => call<SdActivity[]>("/me/sd/activity", t),
  requestUsername: (t: TokenFn, username: string) =>
    call("/me/username-request", t, { method: "POST", body: JSON.stringify({ username }) }),
  setTheme: (t: TokenFn, theme: string) =>
    call("/me/theme", t, { method: "POST", body: JSON.stringify({ theme }) }),
  progress: (t: TokenFn) => call<ApiProblem[]>("/me/progress", t),
  leaderboard: (t: TokenFn) => call<ApiLeader[]>("/leaderboard", t),
  recent: (t: TokenFn) => call<ApiRecent[]>("/recent", t),
  groupDifficulty: (t: TokenFn) => call<ApiDifficultyTotal[]>("/group/difficulty", t),
  circleDifficulty: (t: TokenFn) => call<ApiDifficultyTotal[]>("/me/circle", t),
  calendar: (t: TokenFn) => call<ApiDay[]>("/me/calendar", t),
  calendarProblems: (t: TokenFn) => call<ApiCalendarProblem[]>("/me/calendar/problems", t),
  mySolutions: (t: TokenFn, slug: string, recent = false) =>
    call<ApiSolution[]>(`/me/problem/${slug}${recent ? "?recent=1" : ""}`, t),
  friends: (t: TokenFn) => call<ApiFriend[]>("/friends", t),
  directory: (t: TokenFn) => call<ApiFriend[]>("/users", t),
  friendRequests: (t: TokenFn) => call<ApiFriend[]>("/friends/requests", t),
  acceptRequest: (t: TokenFn, id: string) =>
    call("/friends/requests/accept", t, { method: "POST", body: JSON.stringify({ id }) }),
  declineRequest: (t: TokenFn, id: string) =>
    call("/friends/requests/decline", t, { method: "POST", body: JSON.stringify({ id }) }),
  addFriend: (t: TokenFn, username: string) =>
    call("/friends", t, { method: "POST", body: JSON.stringify({ username }) }),
  removeFriend: (t: TokenFn, id: string) => call(`/friends/${id}`, t, { method: "DELETE" }),
  friendProgress: (t: TokenFn, id: string) => call<ApiProblem[]>(`/friends/${id}/progress`, t),
  friendCalendar: (t: TokenFn, id: string) => call<ApiDay[]>(`/friends/${id}/calendar`, t),
  friendCalendarProblems: (t: TokenFn, id: string) =>
    call<ApiCalendarProblem[]>(`/friends/${id}/calendar/problems`, t),
  friendSolutions: (t: TokenFn, id: string, slug: string, recent = false) =>
    call<ApiSolution[]>(`/friends/${id}/problem/${slug}${recent ? "?recent=1" : ""}`, t),
  adminPending: (t: TokenFn) => call<MeResponse[]>("/admin/pending", t),
  adminUsers: (t: TokenFn) => call<MeResponse[]>("/admin/users", t),
  adminAnalytics: (t: TokenFn) => call<Analytics>("/admin/analytics", t),
  adminApprove: (t: TokenFn, id: string) =>
    call("/admin/approve", t, { method: "POST", body: JSON.stringify({ id }) }),
  adminSetUsername: (t: TokenFn, id: string, username: string) =>
    call("/admin/username", t, { method: "POST", body: JSON.stringify({ id, username }) }),
  adminRemove: (t: TokenFn, id: string) => call(`/admin/users/${id}`, t, { method: "DELETE" }),
  adminReject: (t: TokenFn, id: string) => call(`/admin/users/${id}/purge`, t, { method: "DELETE" }),
  adminLeetcodeSession: (t: TokenFn) => call<LeetcodeSession>("/admin/leetcode-session", t),
  adminSetLeetcodeSession: (t: TokenFn, token: string, expiresAt: string) =>
    call("/admin/leetcode-session", t, { method: "POST", body: JSON.stringify({ token, expiresAt }) }),
  jobAlerts: (t: TokenFn) => call<JobAlert[]>("/jobs", t),
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

export type JobAlert = {
  id: string;
  source: "speedyapply" | "simplify-swe" | "simplify-pm";
  company: string;
  role: string;
  location: string;
  applyUrl: string;
  datePosted: string;
  isOpen: boolean;
  fetchedAt: string;
};

