/**
 * Dev-only canned API responses.
 *
 * Turn on with `VITE_FIXTURES=1` in `.env.local`, then `npm run dev`. Every
 * request from `src/lib/api.ts` is answered from here instead of the network, so
 * the dashboard fills with coherent data and cold loads are instant.
 *
 * NEVER SHIPS. `api.ts` guards the call with `import.meta.env.DEV && useFixtures`,
 * and Vite replaces `import.meta.env.DEV` with `false` when building for
 * production — so the branch is dead code, the dynamic `import()` below is never
 * reachable, and Rollup drops this module from the bundle entirely. There is a
 * check for that in the notes at the bottom of docs/REVIEW.md.
 *
 * Design rules for the data:
 *
 * - **Anchored to today, not to a fixed date.** Streaks, calendars and the
 *   activity feed are generated relative to the current local day, so the
 *   fixtures never go stale and the streak card always has something to show.
 * - **Internally consistent.** The leaderboard totals, the per-difficulty
 *   breakdown and the `/me/circle` combined figure are all derived from the same
 *   generated problem set, so the derived Friends series (`circle − mine`) comes
 *   out sensible instead of clamping to zero.
 * - **Matches the real shapes.** Everything is typed against the `Api*` types in
 *   `src/lib/api.ts`, so a fixture that drifts from the real contract is a
 *   compile error rather than a runtime surprise.
 */
import { dateKey } from "../lib/calendar";
import type {
  Analytics,
  ApiCalendarProblem,
  ApiDay,
  ApiDifficultyTotal,
  ApiFriend,
  ApiLeader,
  ApiProblem,
  ApiRecent,
  ApiSolution,
  LeetcodeSession,
  MeResponse,
  SdActivity,
  SdLeader,
} from "../lib/api";

/** The signed-in dev user. Matches DEFAULT_SHELL.userName in app/shell.ts. */
const ME = "Jordan Dev";
const ME_HANDLE = "jordan_dev";

/* -------------------------------------------------------------------------- */
/* Date helpers — everything is relative to "now"                              */
/* -------------------------------------------------------------------------- */

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** An ISO timestamp at midday, n days back — the shape `at` fields use. */
function at(n: number): string {
  const d = daysAgo(n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/* -------------------------------------------------------------------------- */
/* The problem catalog                                                         */
/* -------------------------------------------------------------------------- */

type Seed = [category: string, title: string, diff: "Easy" | "Medium" | "Hard"];

const CATALOG: Seed[] = [
  ["Arrays & Hashing", "Contains Duplicate", "Easy"],
  ["Arrays & Hashing", "Valid Anagram", "Easy"],
  ["Arrays & Hashing", "Two Sum", "Easy"],
  ["Arrays & Hashing", "Group Anagrams", "Medium"],
  ["Arrays & Hashing", "Top K Frequent Elements", "Medium"],
  ["Arrays & Hashing", "Longest Consecutive Sequence", "Medium"],
  ["Two Pointers", "Valid Palindrome", "Easy"],
  ["Two Pointers", "Two Sum II", "Medium"],
  ["Two Pointers", "3Sum", "Medium"],
  ["Two Pointers", "Trapping Rain Water", "Hard"],
  ["Sliding Window", "Best Time to Buy and Sell Stock", "Easy"],
  ["Sliding Window", "Longest Substring Without Repeating Characters", "Medium"],
  ["Sliding Window", "Minimum Window Substring", "Hard"],
  ["Stack", "Valid Parentheses", "Easy"],
  ["Stack", "Min Stack", "Medium"],
  ["Stack", "Largest Rectangle in Histogram", "Hard"],
  ["Binary Search", "Binary Search", "Easy"],
  ["Binary Search", "Search a 2D Matrix", "Medium"],
  ["Binary Search", "Median of Two Sorted Arrays", "Hard"],
  ["Linked List", "Reverse Linked List", "Easy"],
  ["Linked List", "Merge Two Sorted Lists", "Easy"],
  ["Linked List", "LRU Cache", "Medium"],
  ["Linked List", "Merge K Sorted Lists", "Hard"],
  ["Trees", "Invert Binary Tree", "Easy"],
  ["Trees", "Maximum Depth of Binary Tree", "Easy"],
  ["Trees", "Validate Binary Search Tree", "Medium"],
  ["Trees", "Binary Tree Maximum Path Sum", "Hard"],
  ["Graphs", "Number of Islands", "Medium"],
  ["Graphs", "Course Schedule", "Medium"],
  ["Graphs", "Word Ladder", "Hard"],
  ["Dynamic Programming", "Climbing Stairs", "Easy"],
  ["Dynamic Programming", "House Robber", "Medium"],
  ["Dynamic Programming", "Coin Change", "Medium"],
  ["Dynamic Programming", "Edit Distance", "Medium"],
  ["Dynamic Programming", "Burst Balloons", "Hard"],
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Builds a problem list with a deterministic solved pattern.
 *
 * `solveRate` is applied per difficulty so the breakdown looks like a real
 * person's — lots of Easy, fewer Medium, a handful of Hard — rather than a flat
 * percentage across the board.
 */
function buildProgress(rates: { Easy: number; Medium: number; Hard: number }): ApiProblem[] {
  const seen: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
  return CATALOG.map(([category, title, difficulty]) => {
    const i = seen[difficulty]++;
    // Deterministic: solve the first N of each difficulty.
    const total = CATALOG.filter((c) => c[2] === difficulty).length;
    const done = i < Math.round(total * rates[difficulty]);
    return {
      slug: slugify(title),
      title,
      difficulty,
      category,
      done,
      // Every third solved problem is flagged optimal, for the OptimalTag.
      optimal: done && i % 3 === 0,
      blind75: true,
      neetcode150: true,
      neetcode250: true,
    };
  });
}

const MY_PROGRESS = buildProgress({ Easy: 0.8, Medium: 0.5, Hard: 0.25 });

function countByDifficulty(rows: ApiProblem[]) {
  const c = { easy: 0, medium: 0, hard: 0 };
  for (const p of rows) {
    if (!p.done) continue;
    if (p.difficulty === "Easy") c.easy++;
    else if (p.difficulty === "Medium") c.medium++;
    else c.hard++;
  }
  return c;
}

const MINE = countByDifficulty(MY_PROGRESS);
const MY_TOTAL = MINE.easy + MINE.medium + MINE.hard;

/* -------------------------------------------------------------------------- */
/* People                                                                      */
/* -------------------------------------------------------------------------- */

const FRIENDS: ApiFriend[] = [
  { id: "f-mira", name: "Mira Chen", username: "mirac", solved: 24 },
  { id: "f-ari", name: "Ari Patel", username: "arip", solved: 11 },
  { id: "f-sam", name: "Sam Ortega", username: "sortega", solved: 6 },
];

/** Per-friend solve rates, so each profile looks different from the others. */
const FRIEND_RATES: Record<string, { Easy: number; Medium: number; Hard: number }> = {
  "f-mira": { Easy: 1, Medium: 0.75, Hard: 0.5 },
  "f-ari": { Easy: 0.6, Medium: 0.25, Hard: 0 },
  "f-sam": { Easy: 0.4, Medium: 0.1, Hard: 0 },
};

const LEADERS: ApiLeader[] = [
  (() => {
    const c = countByDifficulty(buildProgress(FRIEND_RATES["f-mira"]));
    const n = c.easy + c.medium + c.hard;
    return {
      name: "Mira Chen",
      username: "mirac",
      blind75: n,
      neetcode150: n,
      neetcode250: n,
      all: n,
      ...c,
    };
  })(),
  {
    name: ME,
    username: ME_HANDLE,
    blind75: MY_TOTAL,
    neetcode150: MY_TOTAL,
    neetcode250: MY_TOTAL,
    all: MY_TOTAL,
    ...MINE,
  },
  (() => {
    const c = countByDifficulty(buildProgress(FRIEND_RATES["f-ari"]));
    const n = c.easy + c.medium + c.hard;
    return {
      name: "Ari Patel",
      username: "arip",
      blind75: n,
      neetcode150: n,
      neetcode250: n,
      all: n,
      ...c,
    };
  })(),
  (() => {
    const c = countByDifficulty(buildProgress(FRIEND_RATES["f-sam"]));
    const n = c.easy + c.medium + c.hard;
    return {
      name: "Sam Ortega",
      username: "sortega",
      blind75: n,
      neetcode150: n,
      neetcode250: n,
      all: n,
      ...c,
    };
  })(),
  // Someone on the leaderboard who is NOT a friend, so the profile's
  // "streaks are shared between friends" path is reachable in dev.
  {
    name: "Lena Park",
    username: "lenap",
    blind75: 9,
    neetcode150: 9,
    neetcode250: 9,
    all: 9,
    easy: 6,
    medium: 3,
    hard: 0,
  },
];

/* -------------------------------------------------------------------------- */
/* Activity + calendars                                                        */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Calendars — built so every legend state is demonstrable                     */
/* -------------------------------------------------------------------------- */

/**
 * The calendar fixtures exist to exercise all four day states the legend
 * describes: **Today**, **Streak day**, **Solved**, **No solves**.
 *
 * Writing them as a flat list of "n days ago" (which is what this used to be)
 * has a nasty edge: near the start of a month every entry lands in the
 * *previous* month, so the dashboard streak card — which always renders the
 * current month — shows nothing but Today and a field of empty cells. On the 1st
 * of a month the current month has exactly one past day, so "Streak day" and
 * "Solved" are not renderable there at all, no matter what the data says.
 *
 * So these are generated per calendar month instead:
 *
 * - a streak of `STREAK_LENGTH` days ending today (it crosses the month
 *   boundary naturally, which is itself worth testing);
 * - non-streak solve days on fixed day-of-month anchors, so every month in the
 *   navigable range has a realistic mix;
 * - everything else left empty.
 *
 * See DEMO_FUTURE_DAYS below for the one deliberate compromise.
 */

/** Days in the current streak, counting back from today. */
const STREAK_LENGTH = 5;

/** Day-of-month positions for non-streak solve days. Spread, not clustered. */
const SOLVED_ANCHORS = [3, 8, 13, 19, 25];

/**
 * When today falls in the first days of a month there are no earlier days left
 * to mark as "Solved", so the current month's grid would only ever show Today
 * and empty cells. These forward-dated entries keep the Solved swatch
 * demonstrable on the dashboard on those days.
 *
 * They are the one knowingly unrealistic thing in these fixtures — you cannot
 * have solved something tomorrow. Set to `false` for a strictly plausible
 * calendar; you will then need to open the calendar overlay and step back a
 * month to see the Solved state during the first week of a month.
 */
const DEMO_FUTURE_DAYS = true;

const MONTH_MS_ANCHOR = new Date();

/** Every (year, month) pair the calendar overlay can navigate to, plus today's. */
function navigableMonths(): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  // CAL_START/CAL_END in src/data/calendar.ts bound the overlay; seed a year
  // back from today as well so the range is covered whenever those move.
  const now = MONTH_MS_ANCHOR;
  for (let back = 12; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

/** Deterministic 1-4 solve count, so a month has visible variation. */
function countFor(year: number, month: number, day: number): number {
  return (((year * 12 + month) * 31 + day * 7) % 4) + 1;
}

/**
 * Builds a calendar.
 *
 * @param streakLength  days ending today; 0 for someone with no streak
 * @param streakOffset  0 = streak includes today, 1 = it ended yesterday
 * @param density       fraction of SOLVED_ANCHORS used, so friends differ
 */
function buildCalendar(
  streakLength: number,
  streakOffset = 0,
  density = 1,
): ApiDay[] {
  const byDate = new Map<string, number>();
  const now = MONTH_MS_ANCHOR;
  const todayDay = now.getDate();

  // --- non-streak solve days, across every navigable month ---
  const anchors = SOLVED_ANCHORS.slice(
    0,
    Math.max(1, Math.round(SOLVED_ANCHORS.length * density)),
  );
  for (const { year, month } of navigableMonths()) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    for (const day of anchors) {
      if (day > daysInMonth) continue;
      // In the current month, only anchors already in the past are plausible.
      if (isCurrentMonth && day >= todayDay && !DEMO_FUTURE_DAYS) continue;
      byDate.set(dateKey(new Date(year, month, day)), countFor(year, month, day));
    }
  }

  // --- the streak, last so it wins over any anchor it overlaps ---
  for (let i = 0; i < streakLength; i++) {
    const d = daysAgo(i + streakOffset);
    byDate.set(dateKey(d), ((i * 2) % 3) + 1);
  }

  // A streak that "ended yesterday" must have nothing today, or it is not ended.
  if (streakOffset > 0) byDate.delete(dateKey(new Date()));

  return [...byDate.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** You: a live streak ending today. */
const MY_DAYS: ApiDay[] = buildCalendar(STREAK_LENGTH);

const FRIEND_DAYS: Record<string, ApiDay[]> = {
  // Mira: longer live streak, dense history.
  "f-mira": buildCalendar(8),
  // Ari: streak ran through yesterday but nothing today — exercises the
  // "a day with no solves does not break yesterday's streak" rule.
  "f-ari": buildCalendar(3, 1, 0.6),
  // Sam: no streak at all, sparse solves.
  "f-sam": buildCalendar(0, 0, 0.4),
};

const solvedTitles = MY_PROGRESS.filter((p) => p.done).map((p) => p);

const RECENT: ApiRecent[] = [
  { n: 1, ...ref(0), who: [ME], at: at(0) },
  { n: 2, ...ref(1), who: [ME, "Mira Chen"], at: at(0) },
  { n: 3, ...ref(2), who: ["Mira Chen"], at: at(1) },
  { n: 4, ...ref(3), who: [ME], at: at(1) },
  { n: 5, ...ref(4), who: ["Mira Chen", "Ari Patel"], at: at(2) },
  { n: 6, ...ref(5), who: [ME], at: at(2) },
  { n: 7, ...ref(6), who: ["Mira Chen"], at: at(3) },
  { n: 8, ...ref(7), who: ["Ari Patel"], at: at(4) },
  { n: 9, ...ref(8), who: [ME], at: at(6) },
  { n: 10, ...ref(9), who: ["Sam Ortega"], at: at(11) },
  { n: 11, ...ref(10), who: [ME, "Mira Chen"], at: at(13) },
];

function ref(i: number): { slug: string; name: string; diff: string } {
  const p = solvedTitles[i % solvedTitles.length];
  return { slug: p.slug, name: p.title, diff: p.difficulty };
}

function calendarProblems(days: ApiDay[]): ApiCalendarProblem[] {
  const out: ApiCalendarProblem[] = [];
  let i = 0;
  for (const d of days) {
    for (let k = 0; k < d.count; k++) {
      const p = solvedTitles[i++ % solvedTitles.length];
      out.push({ date: d.date, slug: p.slug, title: p.title, difficulty: p.difficulty });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* System Design                                                               */
/* -------------------------------------------------------------------------- */

const SD_SOLVED = ["design-url-shortener", "design-rate-limiter", "genai-rag"];

const SD_LEADERS: SdLeader[] = [
  { name: "Mira Chen", username: "mirac", count: 5 },
  { name: ME, username: ME_HANDLE, count: SD_SOLVED.length },
  { name: "Ari Patel", username: "arip", count: 1 },
];

const SD_ACTIVITY: SdActivity[] = [
  { name: ME, username: ME_HANDLE, slug: "design-url-shortener", at: at(1) },
  { name: ME, username: ME_HANDLE, slug: "design-rate-limiter", at: at(4) },
  { name: ME, username: ME_HANDLE, slug: "genai-rag", at: at(8) },
];

const SOLUTIONS: ApiSolution[] = [
  {
    slug: "two-sum",
    lang: "python3",
    runtimeMs: 52,
    runtimePct: 94,
    optimal: true,
    code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, n in enumerate(nums):
            if target - n in seen:
                return [seen[target - n], i]
            seen[n] = i
        return []`,
  },
  {
    slug: "two-sum",
    lang: "java",
    runtimeMs: 3,
    runtimePct: 88,
    optimal: false,
    code: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[] { j, i };
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}`,
  },
];

/* -------------------------------------------------------------------------- */
/* The router                                                                  */
/* -------------------------------------------------------------------------- */

const ME_RESPONSE: MeResponse = {
  id: "u-jordan",
  username: ME_HANDLE,
  github: "",
  name: ME,
  email: "jordan@example.dev",
  status: "active",
  // Flip to "admin" to exercise the Manage members dialog and the session alert.
  role: "user",
  theme: "auto",
  // Season start, ~90 days ago, so streaks are not clipped by the floor.
  season: Math.floor(daysAgo(90).getTime() / 1000),
};

/** Combined "you + friends" difficulty totals, kept consistent with the rest. */
function circleTotals(): ApiDifficultyTotal[] {
  const totals = { easy: MINE.easy, medium: MINE.medium, hard: MINE.hard };
  for (const f of FRIENDS) {
    const c = countByDifficulty(buildProgress(FRIEND_RATES[f.id]));
    totals.easy += c.easy;
    totals.medium += c.medium;
    totals.hard += c.hard;
  }
  return [
    { label: "Easy", count: totals.easy },
    { label: "Medium", count: totals.medium },
    { label: "Hard", count: totals.hard },
  ];
}

function friendIdFrom(path: string): string | undefined {
  return path.match(/^\/friends\/([^/]+)/)?.[1];
}

/**
 * Answers one request. Order matters — more specific patterns first.
 *
 * Unrecognised paths return `[]` rather than throwing, so adding a new endpoint
 * to `api.ts` degrades to "empty" in fixture mode instead of crashing the app.
 */
export function fixtureFor(path: string, init?: RequestInit): unknown {
  const method = (init?.method ?? "GET").toUpperCase();

  // Writes succeed and change nothing. Fixture data is immutable by design: a
  // reload always returns you to a known state.
  if (method !== "GET") return {};

  // --- friends/:id/* ---
  if (/^\/friends\/[^/]+\/progress/.test(path)) {
    const id = friendIdFrom(path);
    return buildProgress(FRIEND_RATES[id ?? ""] ?? { Easy: 0.3, Medium: 0.1, Hard: 0 });
  }
  if (/^\/friends\/[^/]+\/calendar\/problems/.test(path)) {
    return calendarProblems(FRIEND_DAYS[friendIdFrom(path) ?? ""] ?? []);
  }
  if (/^\/friends\/[^/]+\/calendar/.test(path)) {
    return FRIEND_DAYS[friendIdFrom(path) ?? ""] ?? [];
  }
  if (/^\/friends\/[^/]+\/problem\//.test(path)) return SOLUTIONS;
  if (path.startsWith("/friends/requests")) return [];
  if (path === "/friends") return FRIENDS;

  // --- me/* ---
  if (path === "/me") return ME_RESPONSE;
  if (path === "/me/progress") return MY_PROGRESS;
  if (path === "/me/calendar/problems") return calendarProblems(MY_DAYS);
  if (path === "/me/calendar") return MY_DAYS;
  if (path === "/me/circle") return circleTotals();
  if (path === "/me/sd/activity") return SD_ACTIVITY;
  if (path === "/me/sd") return SD_SOLVED;
  if (path.startsWith("/me/problem/")) return SOLUTIONS;

  // --- collections ---
  if (path === "/leaderboard") return LEADERS;
  if (path === "/recent") return RECENT;
  if (path === "/users") {
    // Directory = everyone on the leaderboard, in ApiFriend shape.
    return LEADERS.map<ApiFriend>((l, i) => ({
      id: `u-${l.username}`,
      name: l.name,
      username: l.username,
      solved: l.all,
      ...(i === 0 ? {} : {}),
    }));
  }
  if (path === "/group/difficulty") return circleTotals();
  if (path.startsWith("/sd/leaderboard")) return SD_LEADERS;
  if (path.startsWith("/sd/activity")) return SD_ACTIVITY;

  // --- admin ---
  if (path === "/admin/pending") return [];
  if (path === "/admin/users") return [ME_RESPONSE];
  if (path === "/admin/analytics") {
    const analytics: Analytics = {
      users: LEADERS.length,
      pending: 0,
      solves: MY_TOTAL * 4,
      solves7d: 11,
      active7d: 3,
      views: 420,
      views7d: 63,
      perDay: MY_DAYS,
    };
    return analytics;
  }
  if (path === "/admin/leetcode-session") {
    const session: LeetcodeSession = {
      expiresAt: new Date(daysAgo(-21).getTime()).toISOString(),
      hasToken: true,
    };
    return session;
  }

  return [];
}
