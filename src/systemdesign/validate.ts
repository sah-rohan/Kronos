import type { SDComponentType, SDProblem } from "./problems";

export type SDNode = {
  id: string;
  type: SDComponentType;
  x: number;
  y: number;
  config: Record<string, string>; // configId -> chosen optionId
};
export type SDEdge = { from: string; to: string };

export type SDIssue = { kind: "missing" | "connection" | "extra" | "config"; text: string };
export type SDResult = { ok: boolean; issues: SDIssue[] };

export function validateDesign(
  nodes: SDNode[],
  edges: SDEdge[],
  problem: SDProblem,
): SDResult {
  const issues: SDIssue[] = [];
  const present = new Set(nodes.map((n) => n.type));
  const typeOf = new Map(nodes.map((n) => [n.id, n.type] as const));
  const name = (t: SDComponentType) => problem.palette.find((c) => c.type === t)?.name ?? t;
  const firstOf = (t: SDComponentType) => nodes.find((n) => n.type === t);

  const wanted = new Set(problem.connections.map(([f, t]) => `${f}>${t}`));

  // 1) Missing required components - phrased as an action on the actual design.
  for (const t of problem.required) {
    if (!present.has(t)) issues.push({ kind: "missing", text: `Add a ${name(t)} - ${problem.missingWhy[t]}` });
  }

  // 2) Required connections you haven't drawn yet (only when both ends exist).
  const hasEdge = (from: SDComponentType, to: SDComponentType) =>
    edges.some((e) => typeOf.get(e.from) === from && typeOf.get(e.to) === to);
  for (const [from, to] of problem.connections) {
    if (present.has(from) && present.has(to) && !hasEdge(from, to)) {
      issues.push({
        kind: "connection",
        text: `Connect ${name(from)} → ${name(to)} - ${problem.connectionWhy[`${from}>${to}`]}`,
      });
    }
  }

  // 3) Connections you DID draw that don't belong - reacts to the actual drawing.
  const flaggedExtra = new Set<string>();
  for (const e of edges) {
    const f = typeOf.get(e.from);
    const t = typeOf.get(e.to);
    if (!f || !t) continue;
    const key = `${f}>${t}`;
    if (!wanted.has(key) && !flaggedExtra.has(key)) {
      flaggedExtra.add(key);
      const reversed = wanted.has(`${t}>${f}`);
      issues.push({
        kind: "extra",
        text: reversed
          ? `Reverse the ${name(f)} → ${name(t)} link - the arrow should point the other way.`
          : `Remove the ${name(f)} → ${name(t)} link - it isn't part of this design.`,
      });
    }
  }

  // 4) Configuration decisions on placed components.
  for (const def of problem.palette) {
    if (!def.configs) continue;
    const node = firstOf(def.type);
    if (!node) continue;
    for (const cfg of def.configs) {
      if (node.config[cfg.id] !== cfg.correct) {
        const chosen = cfg.options.find((o) => o.id === node.config[cfg.id]);
        const prefix = chosen ? `${def.name} is set to "${chosen.label}".` : `${def.name} isn't configured yet.`;
        issues.push({ kind: "config", text: `${prefix} ${cfg.why}` });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
