import type { SDComponentType, SDProblem } from "./problems";

const NODE_W = 150;
const NODE_H = 56;
const VB_W = 600;
const VB_H = 680;

function borderPoint(fromX: number, fromY: number, bx: number, by: number) {
  const cx = bx + NODE_W / 2;
  const cy = by + NODE_H / 2;
  const dx = cx - fromX;
  const dy = cy - fromY;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const s = Math.min(NODE_W / 2 / Math.abs(dx || 1e-6), NODE_H / 2 / Math.abs(dy || 1e-6));
  return { x: cx - dx * s, y: cy - dy * s };
}

export function SystemDiagram({
  problem,
  revealed,
  current,
  step,
}: {
  problem: SDProblem;
  revealed: Set<SDComponentType>;
  current?: SDComponentType;
  step?: number;
}) {
  const c = (t: SDComponentType) => ({
    cx: problem.layout[t].x + NODE_W / 2,
    cy: problem.layout[t].y + NODE_H / 2,
  });
  const stepped = step !== undefined;

  const boxes = problem.palette.map((comp) => {
    const { x, y } = problem.layout[comp.type];
    return { x, y };
  });
  const boxHit = (lx: number, ly: number, hw: number) =>
    boxes.find(
      (b) =>
        lx + hw > b.x - 6 &&
        lx - hw < b.x + NODE_W + 6 &&
        ly + 11 > b.y - 4 &&
        ly - 11 < b.y + NODE_H + 4,
    );

  const allEdges = [
    ...problem.connections.map((c) => ({ c, dashed: false })),
    ...(stepped ? (problem.returns ?? []).map((c) => ({ c, dashed: true })) : []),
  ];
  const steppedRevealed = new Set<SDComponentType>();
  if (stepped) {
    for (let i = 0; i <= step! && i < allEdges.length; i++) {
      steppedRevealed.add(allEdges[i].c[0]);
      steppedRevealed.add(allEdges[i].c[1]);
    }
    if (allEdges.length > 0) steppedRevealed.add(allEdges[0].c[0]);
  }
  const edges = allEdges.map(({ c: [from, to], dashed }, i) => {
    const on = stepped ? i <= step! : revealed.has(from) && revealed.has(to);
    const touchesCurrent = stepped ? i === step : current === from || current === to;
    const a = c(from);
    const b = c(to);
    const start = borderPoint(b.cx, b.cy, problem.layout[from].x, problem.layout[from].y);
    const end = borderPoint(a.cx, a.cy, problem.layout[to].x, problem.layout[to].y);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dy / len;
    const ny = -dx / len;
    const bow = Math.max(30, Math.min(len * 0.26, 92));
    const cxp = (start.x + end.x) / 2 + nx * bow;
    const cyp = (start.y + end.y) / 2 + ny * bow;
    const label = problem.edgeLabels?.[`${from}>${to}`];
    const half = (label?.length ?? 0) * 3.6 + 6;
    let mx = 0.25 * start.x + 0.5 * cxp + 0.25 * end.x;
    let my = 0.25 * start.y + 0.5 * cyp + 0.25 * end.y;
    if (label) {
      for (let step = 0; step < 20; step++) {
        const hit = boxHit(mx, my, half);
        if (!hit) break;
        const bcx = hit.x + NODE_W / 2;
        const bcy = hit.y + NODE_H / 2;
        const vx = mx - bcx;
        const vy = my - bcy;
        const vl = Math.hypot(vx, vy) || 1;
        mx += (vx / vl) * 10;
        my += (vy / vl) * 10;
      }
    }
    mx = Math.min(VB_W - half, Math.max(half, mx));
    my = Math.min(VB_H - 12, Math.max(12, my));
    return { i, on, touchesCurrent, start, end, cxp, cyp, label, half, mx, my, dashed };
  });

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full">
      <defs>
        <marker id="sd-arrow-d" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="fill-coral" />
        </marker>
        <marker id="sd-arrow-s" markerWidth="8" markerHeight="8" refX="1.5" refY="4" orient="auto">
          <path d="M8,0 L0,4 L8,8 Z" className="fill-coral" />
        </marker>
        <marker id="sd-arrow-r" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#2563eb" />
        </marker>
      </defs>

      {/* Layer 1: curves */}
      {edges.map((e) => (
        <path
          key={`p${e.i}`}
          d={`M ${e.start.x} ${e.start.y} Q ${e.cxp} ${e.cyp} ${e.end.x} ${e.end.y}`}
          fill="none"
          className={e.on ? (e.dashed ? "stroke-[#2563eb]" : "stroke-coral") : "stroke-border"}
          strokeWidth={e.on && e.touchesCurrent ? 2.5 : e.on ? 1.5 : 1}
          strokeDasharray={e.dashed ? "6 4" : undefined}
          markerEnd={e.on ? (e.dashed ? "url(#sd-arrow-r)" : "url(#sd-arrow-d)") : undefined}
          opacity={e.on ? 1 : 0.35}
        />
      ))}

      {/* Layer 2: node boxes */}
      {problem.palette.map((comp) => {
        const on = stepped ? steppedRevealed.has(comp.type) : revealed.has(comp.type);
        const stepTarget = stepped && step! >= 0 && step! < allEdges.length ? allEdges[step!].c[1] : undefined;
        const isCurrent = stepped ? comp.type === stepTarget : current === comp.type;
        const { x, y } = problem.layout[comp.type];
        return (
          <g key={comp.type} opacity={on ? 1 : 0.4}>
            {isCurrent && (
              <rect x={x - 4} y={y - 4} width={NODE_W + 8} height={NODE_H + 8} rx={15} className="fill-coral" opacity={0.12} />
            )}
            <rect
              x={x}
              y={y}
              width={NODE_W}
              height={NODE_H}
              rx={12}
              className={on ? "fill-background stroke-coral" : "fill-background stroke-border"}
              strokeWidth={isCurrent ? 3 : on ? 2 : 1.5}
            />
            <text
              x={x + NODE_W / 2}
              y={y + NODE_H / 2 + 5}
              textAnchor="middle"
              className="fill-foreground text-[14px] font-semibold"
            >
              {comp.name}
            </text>
          </g>
        );
      })}

      {edges.map((e) =>
        (stepped ? e.i === step : e.on) && e.label ? (
          <g key={`l${e.i}`}>
            <rect x={e.mx - e.half} y={e.my - 9} width={e.half * 2} height={18} rx={5} className="fill-background" />
            <text x={e.mx} y={e.my + 4} textAnchor="middle" className="fill-muted-foreground text-[11px]">
              {e.label}
            </text>
          </g>
        ) : null,
      )}
    </svg>
  );
}
