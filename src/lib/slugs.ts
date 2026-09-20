// URL identifiers and the type-safe path builder — no component hand-types a route string.

export const TRACKS = ["blind75", "neetcode150", "neetcode250"] as const;

export type Track = (typeof TRACKS)[number];

export const DEFAULT_TRACK: Track = "neetcode150";

export function isTrack(value: string | undefined): value is Track {
  return value !== undefined && (TRACKS as readonly string[]).includes(value);
}

export function parseTrack(value: string | undefined): Track {
  return isTrack(value) ? value : DEFAULT_TRACK;
}

// Content slugs (System Design, GenAI, Cloud, Networking, Components)

export function toSlug(id: string): string {
  return id.replaceAll("_", "-").toLowerCase();
}

export type SlugMap<T extends string = string> = {
  toId: (slug: string | undefined) => T | undefined;
  toSlug: (id: T) => string;
  slugs: string[];
};

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

// Path builder

export const paths = {
  dashboard: () => "/",

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
