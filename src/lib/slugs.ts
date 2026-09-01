/**
 * URL identifiers and the type-safe path builder.
 *
 * Two rules this file exists to enforce:
 *
 * 1. No component ever hand-types a route string. Import `paths` and call it.
 *    Renaming a route then means editing one file, and TypeScript finds every
 *    caller for you.
 * 2. Every `useParams()` read is validated before use. Route params are
 *    `string | undefined` at the type level, so an unvalidated read is a lie
 *    that shows up as a blank screen. Validate, then redirect on a miss.
 *
 * Deliberately dependency-free: this module must NOT import the System Design /
 * Cloud / Networking content files. They are ~3000 lines of static data that
 * route-level `lazy()` is supposed to keep out of the shell bundle, and a single
 * import here would pull all of it back in. Content routes build their own
 * bidirectional slug map from their own data with `createSlugMap()` below.
 */

/* -------------------------------------------------------------------------- */
/* Problem tracker tracks                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The selectable roadmaps. This mirrors `ROADMAPS` in `lib/roadmaps.ts` — the
 * three the user can actually pick. `ProblemList` additionally has `"all"`,
 * but that is an internal bucket (`inList`, `solvedByList.all`) and is not a
 * navigable track, so it is intentionally not a valid `:track` param.
 */
export const TRACKS = ["blind75", "neetcode150", "neetcode250"] as const;

export type Track = (typeof TRACKS)[number];

export const DEFAULT_TRACK: Track = "neetcode150";

/** Narrows an unvalidated route param to a `Track`. */
export function isTrack(value: string | undefined): value is Track {
  return value !== undefined && (TRACKS as readonly string[]).includes(value);
}

/**
 * Parses a `:track` param, falling back to the default rather than throwing.
 * Callers that want to 404 instead should use `isTrack` directly.
 */
export function parseTrack(value: string | undefined): Track {
  return isTrack(value) ? value : DEFAULT_TRACK;
}

/* -------------------------------------------------------------------------- */
/* Content slugs (System Design, GenAI, Cloud, Networking, Components)         */
/* -------------------------------------------------------------------------- */

/**
 * Internal content ids are inconsistent: `systemdesign/problems.ts` and
 * `networking.ts` already use kebab-case (`design-url-shortener`,
 * `internet-basics`), but `cloud.ts` and `components.ts` use snake_case
 * (`object_storage`, `well_architected`). Snake_case is not acceptable in a URL
 * under the "lowercase-kebab" rule, so the URL form is always kebab.
 *
 * Underscore -> hyphen is lossy in reverse on its own (`object-storage` could
 * have come from either spelling), which is why the reverse direction needs the
 * id list. Hence `createSlugMap`, not a bare string function.
 */
export function toSlug(id: string): string {
  return id.replaceAll("_", "-").toLowerCase();
}

export type SlugMap<T extends string = string> = {
  /** URL slug -> internal id. `undefined` when the slug is unknown. */
  toId: (slug: string | undefined) => T | undefined;
  /** Internal id -> URL slug. */
  toSlug: (id: T) => string;
  /** Every valid URL slug, in the order the ids were supplied. */
  slugs: string[];
};

/**
 * Builds a bidirectional id <-> slug map from a content module's own id list.
 * Call this at module scope in a lazy-loaded page so the cost lands in that
 * route's chunk, not in the shell.
 *
 * Throws on a duplicate slug, which can only happen if two ids differ solely by
 * `_` vs `-`. That would be an ambiguous URL, so failing loudly at import time
 * is better than silently resolving to whichever came first.
 */
export function createSlugMap<T extends string>(ids: readonly T[]): SlugMap<T> {
  const idBySlug = new Map<string, T>();
  for (const id of ids) {
    const slug = toSlug(id);
    if (idBySlug.has(slug)) {
      throw new Error(
        `Ambiguous content slug "${slug}": both "${idBySlug.get(slug)}" and "${id}" map to it.`,
      );
    }
    idBySlug.set(slug, id);
  }
  return {
    toId: (slug) => (slug === undefined ? undefined : idBySlug.get(slug)),
    toSlug,
    slugs: [...idBySlug.keys()],
  };
}

/* -------------------------------------------------------------------------- */
/* Path builder                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Every route string in the app. `Link to={paths.progress("blind75")}` instead
 * of `Link to="/progress/blind75"`.
 *
 * Handles and content slugs are encoded because they come from user data or
 * content ids; tracks are a closed literal union and need no encoding.
 */
export const paths = {
  dashboard: () => "/",

  /** Bare `/progress` redirects to the active track — see the route table. */
  progressRoot: () => "/progress",
  progress: (track: Track) => `/progress/${track}`,

  leaderboard: () => "/leaderboard",

  user: (handle: string) => `/u/${encodeURIComponent(handle)}`,
  userActivity: (handle: string) => `/u/${encodeURIComponent(handle)}/activity`,

  activity: () => "/activity",
  friends: () => "/friends",

  systemDesign: () => "/system-design",
  systemDesignComponents: () => "/system-design#main-components",
  systemDesignModule: (slug: string) => `/system-design/${encodeURIComponent(slug)}`,

  genai: () => "/genai-system-design",
  genaiModule: (slug: string) => `/genai-system-design/${encodeURIComponent(slug)}`,

  cloud: () => "/cloud",
  cloudTopic: (slug: string) => `/cloud/${encodeURIComponent(slug)}`,

  networking: () => "/networking",
  networkingTopic: (slug: string) => `/networking/${encodeURIComponent(slug)}`,
} as const;
