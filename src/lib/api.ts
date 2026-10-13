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
const send = <T>(method: string, path: string, t: TokenFn, body?: object) =>
  call<T>(path, t, { method, body: body && JSON.stringify(body) });

const recentQ = (recent: boolean) => (recent ? "?recent=1" : "");
const jobQ = (jobId: string) => (jobId ? `?jobId=${jobId}` : "");
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
  resumes: (t: TokenFn) => get<ApiResume[]>("/me/resumes", t),
  resume: (t: TokenFn, id: string) => get<ApiResume>(`/me/resumes/${id}`, t),
  saveResume: (t: TokenFn, r: { id?: string; label: string; content: string }) =>
    call<{ id: string }>("/me/resumes", t, { method: "POST", body: JSON.stringify(r) }),
  setPrimaryResume: (t: TokenFn, id: string) => post(`/me/resumes/${id}/primary`, t),
  deleteResume: (t: TokenFn, id: string) => del(`/me/resumes/${id}`, t),
  jobs: (t: TokenFn) => get<ApiJob[]>("/me/jobs", t),
  job: (t: TokenFn, id: string) => get<ApiJob>(`/me/jobs/${id}`, t),
  saveJob: (t: TokenFn, j: Partial<ApiJob>) =>
    call<{ id: string }>("/me/jobs", t, { method: "POST", body: JSON.stringify(j) }),
  deleteJob: (t: TokenFn, id: string) => del(`/me/jobs/${id}`, t),
  coachAvailable: (t: TokenFn) => get<{ available: boolean }>("/me/coach", t),
  coachHistory: (t: TokenFn, jobId = "") => get<CoachTurn[]>(`/me/coach/history${jobQ(jobId)}`, t),
  coachClear: (t: TokenFn, jobId = "") => del(`/me/coach/history${jobQ(jobId)}`, t),
  coachChat: (t: TokenFn, message: string, jobId = "") =>
    call<CoachReply>("/me/coach/chat", t, { method: "POST", body: JSON.stringify({ message, jobId }) }),
  coachContext: (t: TokenFn, message: string, jobId = "") =>
    call<CoachReply>("/me/coach/context", t, { method: "POST", body: JSON.stringify({ message, jobId }) }),
  interviews: (t: TokenFn) => get<InterviewList>("/me/interviews", t),
  interview: (t: TokenFn, id: string) => get<Interview>(`/me/interviews/${id}`, t),
  interviewProgress: (t: TokenFn) => get<CodingProgress>("/me/interviews/progress", t),
  startInterview: (t: TokenFn, body: StartInterview) => send<Interview>("POST", "/me/interviews", t, body),
  saveCode: (t: TokenFn, id: string, body: { code: string; language: CodeLanguage; version: number }) =>
    send<{ version: number }>("PUT", `/me/interviews/${id}/code`, t, body),
  sendTurn: (t: TokenFn, id: string, message: string, version: number) =>
    send<Interview>("POST", `/me/interviews/${id}/turns`, t, { message, version }),
  observe: (t: TokenFn, id: string, version: number) => send<Interview>("POST", `/me/interviews/${id}/observe`, t, { version }),
  endInterview: (t: TokenFn, id: string) => send<Interview>("POST", `/me/interviews/${id}/end`, t),
  followup: (t: TokenFn, id: string, message: string) => send<Interview>("POST", `/me/interviews/${id}/followups`, t, { message }),
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

export type ApiResume = {
  id: string;
  label: string;
  content?: string;
  primary: boolean;
  chars: number;
  updatedAt: string;
};
export type JobStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected";
export const JOB_STATUSES: JobStatus[] = ["saved", "applied", "interviewing", "offer", "rejected"];
export type ApiJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  url: string;
  description?: string;
  status: JobStatus;
  updatedAt: string;
};
export type CoachTurn = { role: "user" | "assistant"; content: string; at: string };
// The counts travel with the reply so the UI can say what the model was given:
// how many solves, how many of the member's own solutions, which resume and role.
export type CoachReply = {
  reply: string;
  solved: number;
  code: number;
  resume: string;
  job: string;
};

export type InterviewKind = "resume" | "coding" | "behavioral" | "design";
export type CodeLanguage = "python" | "java" | "cpp" | "javascript" | "go";
export type Mark = "weak" | "solid" | "strong";
export type LiveMark = Mark | "unseen";
export type Verdict = "no_hire" | "lean_no_hire" | "lean_hire" | "hire" | "strong_hire";
export type InterviewStatus = "active" | "grading" | "graded" | "failed";
export type Signal = { mark: LiveMark; note: string };
export type Signals = Record<string, Signal>;
export type InterviewTurn = { role: "user" | "assistant"; content: string; code?: string; at: string; unprompted?: boolean; signals?: Signals };
export type InterviewSummary = {
  id: string;
  kind: InterviewKind;
  bar: "top" | "standard";
  title: string;
  status: InterviewStatus;
  verdict?: Verdict;
  startedAt: string;
};
export type Debrief = {
  verdict: Verdict;
  summary: string;
  rubric: { area: string; mark: Mark; evidence: string; ref?: string }[];
  moment: { said: string; stronger: string };
  next: string[];
  correctness?: { verdict: "likely_correct" | "likely_wrong" | "unclear"; issues: string[] };
  complexity?: { stated: string; actual: string; agrees: boolean };
  change?: string;
};
export type Interview = InterviewSummary & {
  difficulty: string;
  target: string;
  subject: string;
  minutes: number;
  elapsedSeconds: number;
  endedAt?: string;
  turns: InterviewTurn[];
  followups: InterviewTurn[];
  debrief?: Debrief;
  language?: CodeLanguage;
  problem?: { statement: string; examples: string[]; constraints: string[] };
  code: string;
  codeVersion: number;
  signals?: Signals;
};
export type InterviewList = { available: boolean; interviews: InterviewSummary[] };
export type StartInterview = {
  kind: InterviewKind;
  bar: "top" | "standard";
  difficulty: string;
  target: string;
  slug?: string;
  language?: CodeLanguage;
};
export type CodingProgress = {
  focus: string;
  areas: { area: string; trend: "" | "improving" | "steady" | "slipping"; points: { interviewId: string; title: string; mark: Mark; at: string }[] }[];
};
