import { useRef, useState } from "react";
import {
  Monitor,
  Route,
  Scissors,
  CornerUpRight,
  Hash,
  Zap,
  Database,
  BarChart3,
  Network,
  Gauge,
  ListChecks,
  Boxes,
  Bell,
  Inbox,
  Cog,
  Send,
  Link2,
  Download,
  FileCode,
  Filter,
  FileText,
  Share2,
  MessagesSquare,
  Radio,
  Search,
  Film,
  HardDrive,
  Globe,
  X,
  Check,
  RotateCcw,
  Server,
} from "lucide-react";
import type { SDComponentType, SDProblem } from "./problems";
import { validateDesign, type SDNode, type SDEdge, type SDResult } from "./validate";

const NODE_W = 150;
const NODE_H = 62;

const ICONS: Record<string, typeof Server> = {
  client: Monitor,
  api_gateway: Route,
  shortening_service: Scissors,
  redirection_handler: CornerUpRight,
  id_generator: Hash,
  cache: Zap,
  database: Database,
  analytics_service: BarChart3,
  rate_limiter: Gauge,
  rules: ListChecks,
  redis: Zap,
  api_servers: Boxes,
  coordinator: Network,
  services: Boxes,
  notification_service: Bell,
  queue: Inbox,
  workers: Cog,
  providers: Send,
  router: Network,
  cache_nodes: Server,
  storage_nodes: Database,
  seed: Link2,
  url_frontier: Inbox,
  downloader: Download,
  parser: FileCode,
  dedupe: Filter,
  content_storage: Database,
  post_service: FileText,
  fanout_service: Share2,
  chat_servers: MessagesSquare,
  message_store: Database,
  presence_servers: Radio,
  query_service: Search,
  trie_cache: Zap,
  aggregator: BarChart3,
  transcoder: Film,
  object_storage: HardDrive,
  cdn: Globe,
  block_servers: Boxes,
};
const iconFor = (t: SDComponentType) => ICONS[t] ?? Server;

let idSeq = 0;
const newId = () => `n${++idSeq}`;

export function SystemDesignCanvas({
  problem,
  onSolved,
}: {
  problem: SDProblem;
  onSolved: () => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<SDNode[]>([]);
  const [edges, setEdges] = useState<SDEdge[]>([]);
  const [conn, setConn] = useState<{ from: string; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<SDResult | null>(null);
  const drag = useRef<{ id: string; offX: number; offY: number; moved: boolean } | null>(null);

  const defOf = (t: SDComponentType) => problem.palette.find((c) => c.type === t)!;
  const center = (n: SDNode) => ({ x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 });
  // Point on node n's border along the line from (fx,fy) - keeps arrowheads visible.
  const border = (fx: number, fy: number, n: SDNode) => {
    const cx = n.x + NODE_W / 2;
    const cy = n.y + NODE_H / 2;
    const dx = cx - fx;
    const dy = cy - fy;
    if (!dx && !dy) return { x: cx, y: cy };
    const s = Math.min(NODE_W / 2 / Math.abs(dx || 1e-6), NODE_H / 2 / Math.abs(dy || 1e-6));
    return { x: cx - dx * s, y: cy - dy * s };
  };
  const rel = (e: { clientX: number; clientY: number }) => {
    const r = areaRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("sd-type") as SDComponentType;
    if (!type) return;
    const p = rel(e);
    const id = newId();
    setNodes((ns) => [
      ...ns,
      { id, type, x: Math.max(0, p.x - NODE_W / 2), y: Math.max(0, p.y - NODE_H / 2), config: {} },
    ]);
    setSelected(id);
    setResult(null);
  };

  const startMove = (e: React.PointerEvent, n: SDNode) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    const p = rel(e);
    drag.current = { id: n.id, offX: p.x - n.x, offY: p.y - n.y, moved: false };
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      drag.current.moved = true;
      const q = rel(ev);
      const x = Math.max(0, q.x - drag.current.offX);
      const y = Math.max(0, q.y - drag.current.offY);
      setNodes((ns) => ns.map((m) => (m.id === drag.current!.id ? { ...m, x, y } : m)));
    };
    const up = () => {
      if (drag.current && !drag.current.moved) setSelected(drag.current.id);
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startConnect = (e: React.PointerEvent, n: SDNode) => {
    e.stopPropagation();
    const p = rel(e);
    setConn({ from: n.id, x: p.x, y: p.y });
    const move = (ev: PointerEvent) => {
      const q = rel(ev);
      setConn((c) => (c ? { ...c, x: q.x, y: q.y } : c));
    };
    const up = (ev: PointerEvent) => {
      const q = rel(ev);
      const target = nodes.find(
        (m) => m.id !== n.id && q.x >= m.x && q.x <= m.x + NODE_W && q.y >= m.y && q.y <= m.y + NODE_H,
      );
      if (target) {
        setEdges((es) =>
          es.some((x) => x.from === n.id && x.to === target.id) ? es : [...es, { from: n.id, to: target.id }],
        );
        setResult(null);
      }
      setConn(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const removeNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id));
    if (selected === id) setSelected(null);
    setResult(null);
  };

  const setConfig = (id: string, cfgId: string, optId: string) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, config: { ...n.config, [cfgId]: optId } } : n)));
    setResult(null);
  };

  const reset = () => {
    setNodes([]);
    setEdges([]);
    setConn(null);
    setSelected(null);
    setResult(null);
  };

  const check = () => {
    const r = validateDesign(nodes, edges, problem);
    setResult(r);
    if (r.ok) onSolved();
  };

  const selectedNode = nodes.find((n) => n.id === selected) ?? null;
  const selectedDef = selectedNode ? defOf(selectedNode.type) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
      {/* Palette */}
      <div className="flex shrink-0 flex-row flex-wrap gap-2 lg:w-40 lg:flex-col">
        <div className="hidden text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:block">
          Components
        </div>
        {problem.palette.map((c) => {
          const Icon = iconFor(c.type);
          return (
            <div
              key={c.type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("sd-type", c.type)}
              title={c.explain}
              className="flex cursor-grab items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium active:cursor-grabbing"
            >
              <Icon className="h-4 w-4 shrink-0 text-coral" />
              {c.name}
            </div>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div
          ref={areaRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => setSelected(null)}
          className="relative min-h-[340px] flex-1 touch-none overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle,_rgba(125,125,125,0.18)_1px,_transparent_1px)] [background-size:18px_18px]"
        >
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
              Drag components here. Drag the dot to connect them, and click a component to configure it.
            </div>
          )}

          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <marker id="sd-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" className="fill-coral" />
              </marker>
            </defs>
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.id === e.from);
              const b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const ca = center(a);
              const cb = center(b);
              const p = border(cb.x, cb.y, a);
              const q = border(ca.x, ca.y, b);
              return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="stroke-coral" strokeWidth={2} markerEnd="url(#sd-arrow)" />;
            })}
            {conn && (() => {
              const a = nodes.find((n) => n.id === conn.from);
              if (!a) return null;
              const p = center(a);
              return <line x1={p.x} y1={p.y} x2={conn.x} y2={conn.y} className="stroke-coral" strokeWidth={2} strokeDasharray="5 4" />;
            })()}
          </svg>

          {nodes.map((n) => {
            const def = defOf(n.type);
            const Icon = iconFor(n.type);
            const incomplete = def.configs?.some((c) => !n.config[c.id]);
            const isSel = selected === n.id;
            return (
              <div
                key={n.id}
                onPointerDown={(e) => startMove(e, n)}
                onClick={(e) => e.stopPropagation()}
                style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
                className={`absolute flex cursor-move select-none flex-col justify-center rounded-xl border bg-card px-3 shadow-sm ${
                  isSel ? "border-coral ring-2 ring-coral" : "border-border"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-coral" />
                  {def.name}
                  {incomplete && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-[#f4b400]" title="Needs configuring" />}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">{def.blurb}</div>
                <button
                  data-handle="1"
                  onPointerDown={(e) => startConnect(e, n)}
                  title="Drag to connect"
                  className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 cursor-crosshair rounded-full bg-coral"
                />
                <button
                  data-handle="1"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(n.id);
                  }}
                  title="Remove"
                  className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full border border-border bg-card text-muted-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
        </div>

        {result && !result.ok && (
          <div className="max-h-36 overflow-y-auto rounded-2xl border border-coral/40 bg-coral/5 p-3 text-sm">
            <div className="mb-1 font-medium text-coral">Not quite - fix these:</div>
            <ul className="space-y-1.5 text-muted-foreground">
              {result.issues.map((iss, i) => (
                <li key={i}>• {iss.text}</li>
              ))}
            </ul>
          </div>
        )}
        {result?.ok && (
          <div className="rounded-2xl border border-[#3fae6a]/40 bg-[#3fae6a]/10 p-3 text-sm font-medium text-[#3fae6a]">
            Correct - components, connections, and every design decision check out.
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            onClick={check}
            className="inline-flex items-center gap-1.5 rounded-full bg-coral px-5 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95"
          >
            <Check className="h-4 w-4" /> Check design
          </button>
        </div>
      </div>

      {/* Config panel */}
      <div className="shrink-0 rounded-2xl border border-border p-3 lg:w-60">
        {selectedNode && selectedDef ? (
          <div>
            <div className="mb-1 text-sm font-semibold">{selectedDef.name}</div>
            <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">{selectedDef.explain}</p>
            {selectedDef.configs ? (
              <div className="space-y-3">
                {selectedDef.configs.map((cfg) => (
                  <div key={cfg.id}>
                    <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">{cfg.question}</div>
                    <div className="flex flex-col gap-1.5">
                      {cfg.options.map((o) => {
                        const on = selectedNode.config[cfg.id] === o.id;
                        return (
                          <button
                            key={o.id}
                            onClick={() => setConfig(selectedNode.id, cfg.id, o.id)}
                            className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                              on ? "border-coral bg-coral/10 font-medium text-foreground" : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No decisions to configure for this component.</div>
            )}
          </div>
        ) : (
          <div className="grid h-full min-h-[120px] place-items-center px-2 text-center text-xs text-muted-foreground">
            Click a component on the canvas to configure its design decisions.
          </div>
        )}
      </div>
    </div>
  );
}
