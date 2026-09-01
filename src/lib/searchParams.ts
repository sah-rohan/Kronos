/**
 * Search-param hooks: the URL is the single source of truth for filters, scope,
 * sort and pagination.
 *
 * House rules, enforced here so no component has to remember them:
 *
 * - **No component reads `useSearchParams()` directly.** Each param family gets
 *   one hook that owns parsing, validation and the default.
 * - **Defaults are omitted from the URL, never written to it.** `?scope=everyone`
 *   is the default, so it must serialize to a clean `/leaderboard`. Writing
 *   defaults out generates junk history entries and two URLs for one screen.
 * - **Writes use the functional updater form** so setting one param never
 *   clobbers a sibling param set by a different hook on the same screen.
 * - **Filter changes use `replace: true`.** Changing a filter is not a
 *   history-worthy navigation; ten keystrokes in a search box should not cost
 *   ten presses of the back button. Moving between screens pushes; refining
 *   what is on a screen replaces.
 * - **Malformed values coerce to the default** rather than throwing. A URL is
 *   user input and someone will hand-edit it.
 */
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/** Reads a param, coercing anything not in `allowed` to `fallback`. */
function parseEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return raw !== null && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

/**
 * Returns a setter that writes one param, deleting it when it equals the
 * default. `replace` defaults to true for the filter-refinement case.
 */
function useParamSetter() {
  const [, setSearchParams] = useSearchParams();
  return useCallback(
    (key: string, value: string | null, defaultValue: string | null) => {
      setSearchParams(
        (prev) => {
          // Copy so we never mutate the live params object.
          const next = new URLSearchParams(prev);
          if (value === null || value === defaultValue || value === "") {
            next.delete(key);
          } else {
            next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
}

/* -------------------------------------------------------------------------- */
/* Leaderboard scope — audit finding #5                                        */
/* -------------------------------------------------------------------------- */

export const LEADERBOARD_SCOPES = ["everyone", "friends"] as const;
export type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number];
export const DEFAULT_SCOPE: LeaderboardScope = "everyone";

/**
 * `?scope=everyone|friends`, default `everyone`.
 *
 * This replaces the old localStorage-backed `lib/leaderboardScope.ts`. Scope is
 * view state, and view state that lives in localStorage cannot be linked, cannot
 * be shared, and silently disagrees with what another surface is showing — which
 * is exactly the bug the old `lb-type` key caused between the leaderboard card
 * and the leaderboard modal.
 */
export function useLeaderboardScope(): [
  LeaderboardScope,
  (next: LeaderboardScope) => void,
] {
  const [searchParams] = useSearchParams();
  const setParam = useParamSetter();
  const scope = parseEnum(
    searchParams.get("scope"),
    LEADERBOARD_SCOPES,
    DEFAULT_SCOPE,
  );
  const setScope = useCallback(
    (next: LeaderboardScope) => setParam("scope", next, DEFAULT_SCOPE),
    [setParam],
  );
  return [scope, setScope];
}

/* -------------------------------------------------------------------------- */
/* Dashboard board selector                                                    */
/* -------------------------------------------------------------------------- */

export const BOARDS = [
  "blind75",
  "neetcode150",
  "neetcode250",
  "sd",
  "genai",
] as const;
export type Board = (typeof BOARDS)[number];
export const DEFAULT_BOARD: Board = "neetcode150";

/**
 * `?board=` on the dashboard: which roadmap (or System Design ranking) the
 * My Progress and Leaderboard cards are both showing.
 *
 * Phase 0 found three competing sources of truth for this — `App`'s `board`
 * state, `App`'s `roadmap` state, and a `lb-type` localStorage key read by the
 * leaderboard modal — which let the card and the modal opened from that card
 * disagree about what they were showing. One search param replaces all three.
 */
export function useDashboardBoard(): [Board, (next: Board) => void] {
  const [searchParams] = useSearchParams();
  const setParam = useParamSetter();
  const board = parseEnum(searchParams.get("board"), BOARDS, DEFAULT_BOARD);
  const setBoard = useCallback(
    (next: Board) => setParam("board", next, DEFAULT_BOARD),
    [setParam],
  );
  return [board, setBoard];
}

/* -------------------------------------------------------------------------- */
/* Problem tracker filters                                                     */
/* -------------------------------------------------------------------------- */

export const TRACK_STATUSES = ["all", "solved", "unsolved"] as const;
export type TrackStatus = (typeof TRACK_STATUSES)[number];
export const DEFAULT_STATUS: TrackStatus = "all";

export const TRACK_SORTS = ["catalog", "title", "difficulty"] as const;
export type TrackSort = (typeof TRACK_SORTS)[number];
export const DEFAULT_SORT: TrackSort = "catalog";

export type TrackFilters = {
  /** Category slug to narrow to, or `null` for every topic. */
  topic: string | null;
  status: TrackStatus;
  sort: TrackSort;
  /** Free-text search. Not in the route table but same rules apply. */
  query: string;
  setTopic: (next: string | null) => void;
  setStatus: (next: TrackStatus) => void;
  setSort: (next: TrackSort) => void;
  setQuery: (next: string) => void;
  /** True when anything is narrowing the list — drives the "Clear" affordance. */
  isFiltered: boolean;
  clear: () => void;
};

/** `?topic=<slug>&status=solved|unsolved|all&sort=catalog|title|difficulty&q=` */
export function useTrackFilters(): TrackFilters {
  const [searchParams, setSearchParams] = useSearchParams();
  const setParam = useParamSetter();

  const topic = searchParams.get("topic") || null;
  const status = parseEnum(searchParams.get("status"), TRACK_STATUSES, DEFAULT_STATUS);
  const sort = parseEnum(searchParams.get("sort"), TRACK_SORTS, DEFAULT_SORT);
  const query = searchParams.get("q") ?? "";

  const setTopic = useCallback(
    (next: string | null) => setParam("topic", next, null),
    [setParam],
  );
  const setStatus = useCallback(
    (next: TrackStatus) => setParam("status", next, DEFAULT_STATUS),
    [setParam],
  );
  const setSort = useCallback(
    (next: TrackSort) => setParam("sort", next, DEFAULT_SORT),
    [setParam],
  );
  const setQuery = useCallback(
    (next: string) => setParam("q", next, ""),
    [setParam],
  );

  const clear = useCallback(() => {
    // Drop every filter key at once but keep anything else on the URL.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const key of ["topic", "status", "sort", "q"]) next.delete(key);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return useMemo(
    () => ({
      topic,
      status,
      sort,
      query,
      setTopic,
      setStatus,
      setSort,
      setQuery,
      isFiltered:
        topic !== null ||
        status !== DEFAULT_STATUS ||
        sort !== DEFAULT_SORT ||
        query !== "",
      clear,
    }),
    [topic, status, sort, query, setTopic, setStatus, setSort, setQuery, clear],
  );
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

export const DEFAULT_PAGE = 1;

/**
 * `?page=<n>`, 1-based, default 1 (so page 1 is a clean URL).
 *
 * Anything unparseable, zero, negative or fractional coerces to page 1.
 */
export function usePageParam(): [number, (next: number) => void] {
  const [searchParams] = useSearchParams();
  const setParam = useParamSetter();

  const raw = searchParams.get("page");
  const parsed = raw === null ? NaN : Number(raw);
  const page =
    Number.isInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_PAGE;

  const setPage = useCallback(
    (next: number) => {
      const clamped = Number.isInteger(next) && next >= 1 ? next : DEFAULT_PAGE;
      setParam("page", String(clamped), String(DEFAULT_PAGE));
    },
    [setParam],
  );

  return [page, setPage];
}
