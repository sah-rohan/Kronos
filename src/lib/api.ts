import { API_URL } from "./env";

export type TokenFn = () => Promise<string | null>;

const base = (API_URL ?? "").replace(/\/$/, "");

async function call<T>(path: string, getToken: TokenFn, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${base}${path}`, {
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
  progress: (t: TokenFn) => call<ApiProblem[]>("/me/progress", t),
  leaderboard: (t: TokenFn) => call<ApiLeader[]>("/leaderboard", t),
  recent: (t: TokenFn) => call<ApiRecent[]>("/recent", t),
  friends: (t: TokenFn) => call<ApiFriend[]>("/friends", t),
  addFriend: (t: TokenFn, username: string) =>
    call("/friends", t, { method: "POST", body: JSON.stringify({ username }) }),
  removeFriend: (t: TokenFn, id: string) => call(`/friends/${id}`, t, { method: "DELETE" }),
  friendProgress: (t: TokenFn, id: string) => call<ApiProblem[]>(`/friends/${id}/progress`, t),
  friendSolutions: (t: TokenFn, id: string, slug: string) =>
    call<ApiSolution[]>(`/friends/${id}/problem/${slug}`, t),
  adminPending: (t: TokenFn) => call<MeResponse[]>("/admin/pending", t),
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
};
export type ApiProblem = {
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  done: boolean;
  optimal: boolean;
};
export type ApiLeader = { rank: number; name: string; username: string; solved: number };
export type ApiRecent = { n: number; name: string; diff: string; who: string[] };
export type ApiFriend = { id: string; name: string; username: string; solved: number };
export type ApiSolution = {
  slug: string;
  lang: string;
  code: string;
  runtimeMs: number;
  runtimePct: number;
  optimal: boolean;
};
