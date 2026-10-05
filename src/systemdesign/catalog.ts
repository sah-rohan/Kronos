import { SD_PROBLEMS, type SDProblem } from "./problems";
import { GENAI_PROBLEMS } from "./genai";

export type ModuleTrack = "sd" | "genai";

export const TRACK_LABEL: Record<ModuleTrack, string> = { sd: "System Design", genai: "AI System Design" };

export const modulesFor = (track: ModuleTrack) => (track === "genai" ? GENAI_PROBLEMS : SD_PROBLEMS);

export const ALL_MODULES: SDProblem[] = [...SD_PROBLEMS, ...GENAI_PROBLEMS];

const BY_SLUG = new Map(ALL_MODULES.map((p) => [p.slug, p]));
const GENAI_SLUGS = new Set(GENAI_PROBLEMS.map((p) => p.slug));

export const moduleBySlug = (slug: string) => BY_SLUG.get(slug);
export const trackOf = (slug: string): ModuleTrack => (GENAI_SLUGS.has(slug) ? "genai" : "sd");

// Primer slides, the flow walkthrough, then one slide per component.
export const stepCount = (p: SDProblem) => p.slides.length + 1 + p.palette.length;
