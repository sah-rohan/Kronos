// Autosave for an in-progress build on the System Design canvas.
import type { SDNode, SDEdge } from "./validate";

const KEY_PREFIX = "kronos.sd.draft.";
const VERSION = 1;

export type SDDraft = { nodes: SDNode[]; edges: SDEdge[] };

type StoredDraft = SDDraft & { v: number; savedAt: number };

const keyFor = (slug: string) => `${KEY_PREFIX}${slug}`;

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function sanitize(raw: unknown): SDDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<StoredDraft>;
  if (d.v !== VERSION) return null;
  if (!Array.isArray(d.nodes) || !Array.isArray(d.edges)) return null;

  const nodes: SDNode[] = [];
  const seen = new Set<string>();
  for (const n of d.nodes) {
    if (!n || typeof n !== "object") continue;
    const { id, type, x, y, config } = n as SDNode;
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    if (typeof type !== "string" || !type) continue;
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) continue;
    const cfg: Record<string, string> = {};
    if (config && typeof config === "object") {
      for (const [k, v] of Object.entries(config)) if (typeof v === "string") cfg[k] = v;
    }
    seen.add(id);
    nodes.push({ id, type, x, y, config: cfg });
  }

  const edges: SDEdge[] = [];
  for (const e of d.edges) {
    if (!e || typeof e !== "object") continue;
    const { from, to } = e as SDEdge;
    if (typeof from !== "string" || typeof to !== "string") continue;
    if (from === to || !seen.has(from) || !seen.has(to)) continue;
    if (edges.some((x) => x.from === from && x.to === to)) continue;
    edges.push({ from, to });
  }

  return { nodes, edges };
}

export function loadDraft(slug: string): SDDraft | null {
  try {
    const raw = localStorage.getItem(keyFor(slug));
    if (!raw) return null;
    const draft = sanitize(JSON.parse(raw));
    return draft && draft.nodes.length > 0 ? draft : null;
  } catch {
    return null;
  }
}

export function saveDraft(slug: string, draft: SDDraft): void {
  try {
    if (draft.nodes.length === 0) {
      clearDraft(slug);
      return;
    }
    const stored: StoredDraft = { v: VERSION, savedAt: Date.now(), ...draft };
    localStorage.setItem(keyFor(slug), JSON.stringify(stored));
  } catch {
    // Autosave is best-effort; a storage failure must not interrupt building.
  }
}

export function clearDraft(slug: string): void {
  try {
    localStorage.removeItem(keyFor(slug));
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}
