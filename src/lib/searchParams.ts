// The URL is the source of truth for filters, scope, sort and pagination.
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

function parseEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return raw !== null && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

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

export const LEADERBOARD_SCOPES = ["everyone", "friends"] as const;
export type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number];
export const DEFAULT_SCOPE: LeaderboardScope = "everyone";

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

export const BOARDS = [
  "blind75",
  "neetcode150",
  "neetcode250",
  "sd",
  "genai",
] as const;
export type Board = (typeof BOARDS)[number];
export const DEFAULT_BOARD: Board = "neetcode150";

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

export const TRACK_STATUSES = ["all", "solved", "unsolved"] as const;
export type TrackStatus = (typeof TRACK_STATUSES)[number];
export const DEFAULT_STATUS: TrackStatus = "all";

export const TRACK_SORTS = ["catalog", "title", "difficulty"] as const;
export type TrackSort = (typeof TRACK_SORTS)[number];
export const DEFAULT_SORT: TrackSort = "catalog";

export type TrackFilters = {
  topic: string | null;
  status: TrackStatus;
  sort: TrackSort;
  query: string;
  setTopic: (next: string | null) => void;
  setStatus: (next: TrackStatus) => void;
  setSort: (next: TrackSort) => void;
  setQuery: (next: string) => void;
  isFiltered: boolean;
  clear: () => void;
};

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

export const DEFAULT_PAGE = 1;

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
