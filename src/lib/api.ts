import { API_URL } from "./env";

export type TokenFn = () => Promise<string | null>;

const base = (API_URL ?? "").replace(/\/$/, "");

let displayName = "";
export function setDisplayName(name: string) {
  displayName = name ?? "";
}

async function call<T>(path: string, getToken: TokenFn, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const url = new URL(`${base}${path}`);
  if (displayName) url.searchParams.set("name", displayName);
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
  setTheme: (t: TokenFn, theme: string) =>
    call("/me/theme", t, { method: "POST", body: JSON.stringify({ theme }) }),
  progress: (t: TokenFn) => call<ApiProblem[]>("/me/progress", t),
  leaderboard: (t: TokenFn) => call<ApiLeader[]>("/leaderboard", t),
  recent: (t: TokenFn) => call<ApiRecent[]>("/recent", t),
  groupDifficulty: (t: TokenFn) => call<ApiDifficultyTotal[]>("/group/difficulty", t),
  circleDifficulty: (t: TokenFn) => call<ApiDifficultyTotal[]>("/me/circle", t),
  calendar: (t: TokenFn) => call<ApiDay[]>("/me/calendar", t),
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
  friendSolutions: (t: TokenFn, id: string, slug: string) =>
    call<ApiSolution[]>(`/friends/${id}/problem/${slug}`, t),
  adminPending: (t: TokenFn) => call<MeResponse[]>("/admin/pending", t),
  adminUsers: (t: TokenFn) => call<MeResponse[]>("/admin/users", t),
  adminApprove: (t: TokenFn, id: string) =>
    call("/admin/approve", t, { method: "POST", body: JSON.stringify({ id }) }),
  adminSetUsername: (t: TokenFn, id: string, username: string) =>
    call("/admin/username", t, { method: "POST", body: JSON.stringify({ id, username }) }),
  adminRemove: (t: TokenFn, id: string) => call(`/admin/users/${id}`, t, { method: "DELETE" }),
};

export type MeResponse = {
  id: string;
  username: string;
  github: string;
  name: string;
  status: string;
  role: string;
  theme: string;
  season: number; 
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
export type ApiLeader = { name: string; username: string; blind75: number; neetcode150: number; neetcode250: number; all: number };
export type ApiRecent = { n: number; slug: string; name: string; diff: string; who: string[] };
export type ApiDifficultyTotal = { label: string; count: number };
export type ApiDay = { date: string; count: number };
export type ApiFriend = { id: string; name: string; username: string; solved: number };
export type ApiSolution = {
  slug: string;
  lang: string;
  code: string;
  runtimeMs: number;
  runtimePct: number;
  optimal: boolean;
};
