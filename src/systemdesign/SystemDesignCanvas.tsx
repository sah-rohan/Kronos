import { useEffect, useRef, useState } from "react";
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
  Split,
  Sparkles,
  Image,
  Type,
  Scale,
  Layers,
  Maximize2,
  Ban,
  ShieldCheck,
  X,
  Check,
  ArrowRight,
  RotateCcw,
  Server,
} from "lucide-react";
import type { SDComponentType, SDProblem } from "./problems";
import { validateDesign, type SDNode, type SDEdge, type SDResult } from "./validate";
import { clearDraft, loadDraft, saveDraft } from "./draft";

const NODE_W = 150;
const NODE_H = 62;
const WORKSPACE_W = 1800;
const WORKSPACE_H = 1200;
const DRAG_THRESHOLD = 3;
const AUTOSAVE_MS = 400;

const MIN_SCALE = 0.35;
const MAX_SCALE = 2;
const ZOOM_SENSITIVITY = 0.0015;

const clamp = (v: number, max: number) => {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, v));
};
const clampX = (x: number) => clamp(x, WORKSPACE_W - NODE_W);
const clampY = (y: number) => clamp(y, WORKSPACE_H - NODE_H);

const between = (v: number, lo: number, hi: number) =>
  Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;

type View = { x: number; y: number; scale: number };

// Keep the workspace covering the viewport when it is larger than it, and inside
// the viewport when zoomed out small enough to fit - so panning can never lose it.
const clampPan = (x: number, y: number, scale: number, vw: number, vh: number) => {
  const w = WORKSPACE_W * scale;
  const h = WORKSPACE_H * scale;
  return {
    x: between(x, Math.min(0, vw - w), Math.max(0, vw - w)),
    y: between(y, Math.min(0, vh - h), Math.max(0, vh - h)),
  };
};

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
  load_balancer: Split,
  graph_db: Share2,
  post_cache: Zap,
  llm: Sparkles,
  trigger: Gauge,
  postproc: Filter,
  output: Send,
  encoder: Boxes,
  decoder: Boxes,
  prediction_head: Hash,
  safety_filter: ShieldCheck,
  safety_eval: ShieldCheck,
  prompt_enhancer: FileText,
  session: Database,
  docs: FileText,
  embedder: Hash,
  vector_index: Database,
  retriever: Search,
  image_encoder: Image,
  text_encoder: Type,
  image_gen: Sparkles,
  generator: Sparkles,
  discriminator: Scale,
  vae_encoder: Boxes,
  vae_decoder: Boxes,
  quantizer: Hash,
  diffusion: Layers,
  video_diffusion: Layers,
  super_resolution: Maximize2,
  trainer: Cog,
  compression: Filter,
  visual_decoder: Film,
  rejection: Ban,
  query_expansion: Maximize2,
};
const iconFor = (t: SDComponentType) => ICONS[t] ?? Server;

// An edge is identified by its endpoints, not by its index in the array: an
// index would silently point at a different arrow as soon as one is deleted.
const edgeKey = (e: SDEdge) => `${e.from}>${e.to}`;

const seedSeq = (ns: SDNode[]) =>
  ns.reduce((max, n) => {
    const m = /^n(\d+)$/.exec(n.id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

export function SystemDesignCanvas({
  problem,
  onSolved,
}: {
  problem: SDProblem;
  onSolved: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Pan/zoom of the workspace inside its viewport. viewRef is the synchronous
  // source of truth: pointer and wheel handlers need the value they just wrote,
  // before React has re-rendered.
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const viewRef = useRef(view);
  const applyView = (next: View) => {
    viewRef.current = next;
    setView(next);
  };
  const [panning, setPanning] = useState(false);

  const [initialDraft] = useState(() => loadDraft(problem.slug));
  const [nodes, setNodes] = useState<SDNode[]>(() => initialDraft?.nodes ?? []);
  const [edges, setEdges] = useState<SDEdge[]>(() => initialDraft?.edges ?? []);
  const [restored, setRestored] = useState(() => initialDraft?.nodes.length ?? 0);

  const [conn, setConn] = useState<{ from: string; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [result, setResult] = useState<SDResult | null>(null);

  const seq = useRef(seedSeq(initialDraft?.nodes ?? []));
  const newId = () => `n${++seq.current}`;

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const latest = useRef({ nodes, edges });
  useEffect(() => {
    latest.current = { nodes, edges };
  }, [nodes, edges]);

  const finished = useRef(false);

  useEffect(() => {
    if (finished.current) return;
    const t = window.setTimeout(() => saveDraft(problem.slug, { nodes, edges }), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [problem.slug, nodes, edges]);

  useEffect(() => {
    const flush = () => {
      if (!finished.current) saveDraft(problem.slug, latest.current);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [problem.slug]);

  const defOf = (t: SDComponentType) =>
    problem.palette.find((c) => c.type === t) ?? { type: t, name: t, blurb: "", explain: "" };
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

  // Pointer position in workspace coordinates, undoing the current pan and zoom,
  // or null when there is no live surface to measure against.
  const rel = (e: { clientX: number; clientY: number }) => {
    const el = viewportRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (e.clientX - r.left - v.x) / v.scale, y: (e.clientY - r.top - v.y) / v.scale };
  };

  const gesture = useRef<(() => void) | null>(null);

  // Callbacks get workspace coords and the raw event: panning needs screen-space
  // deltas, since the workspace coords it would otherwise read move with the pan.
  const beginGesture = (
    onMove: (p: { x: number; y: number } | null, ev: PointerEvent) => void,
    onEnd: (p: { x: number; y: number } | null, ev: PointerEvent | null) => void,
  ) => {
    gesture.current?.();

    const dispose = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", abort);
      if (gesture.current === dispose) gesture.current = null;
    };
    const move = (ev: PointerEvent) => onMove(rel(ev), ev);
    const finish = (ev: PointerEvent) => {
      const p = rel(ev);
      dispose();
      onEnd(p, ev);
    };
    const abort = () => {
      dispose();
      onEnd(null, null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", abort);
    gesture.current = dispose;
  };

  useEffect(() => () => gesture.current?.(), []);

  const resetView = () => applyView({ x: 0, y: 0, scale: 1 });

  // Right-drag (or middle-drag, or a touch drag on empty space) looks around the
  // workspace. The viewport clips instead of scrolling, so this is the only way
  // to reach the parts of the grid that are off screen.
  const startPan = (e: React.PointerEvent) => {
    const el = viewportRef.current;
    if (!el) return;
    const origin = viewRef.current;
    const sx = e.clientX;
    const sy = e.clientY;
    setPanning(true);

    beginGesture(
      (_p, ev) => {
        const v = viewRef.current;
        const next = clampPan(
          origin.x + (ev.clientX - sx),
          origin.y + (ev.clientY - sy),
          v.scale,
          el.clientWidth,
          el.clientHeight,
        );
        applyView({ ...next, scale: v.scale });
      },
      () => setPanning(false),
    );
  };

  const onSurfacePointerDown = (e: React.PointerEvent) => {
    const isPanButton = e.button === 1 || e.button === 2;
    const isTouchOnEmpty =
      e.pointerType === "touch" && !(e.target as Element).closest?.("[data-node]");
    if (!isPanButton && !isTouchOnEmpty) return;
    e.preventDefault();
    startPan(e);
  };

  // Wheel zoom, anchored on the pointer so the spot under the cursor stays put.
  // Attached natively because React's onWheel is passive, where preventDefault
  // (needed to stop the page scrolling instead) is ignored.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const v = viewRef.current;
      const scale = between(v.scale * Math.exp(-ev.deltaY * ZOOM_SENSITIVITY), MIN_SCALE, MAX_SCALE);
      if (scale === v.scale) return;
      const r = el.getBoundingClientRect();
      const px = ev.clientX - r.left;
      const py = ev.clientY - r.top;
      const k = scale / v.scale;
      const next = clampPan(
        px - (px - v.x) * k,
        py - (py - v.y) * k,
        scale,
        el.clientWidth,
        el.clientHeight,
      );
      viewRef.current = { ...next, scale };
      setView(viewRef.current);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("sd-type") as SDComponentType;
    if (!type) return;
    const p = rel(e);
    if (!p) return;
    const id = newId();
    setNodes((ns) => [
      ...ns,
      { id, type, x: clampX(p.x - NODE_W / 2), y: clampY(p.y - NODE_H / 2), config: {} },
    ]);
    setSelected(id);
    setSelectedEdge(null);
    setResult(null);
    setRestored(0);
  };

  const startMove = (e: React.PointerEvent, n: SDNode) => {
    // Only the left button moves a node; the others belong to panning.
    if (e.button !== 0) return;
    if ((e.target as Element).closest?.("[data-handle]")) return;
    const start = rel(e);
    if (!start) return;

    const id = n.id;
    const offX = start.x - n.x;
    const offY = start.y - n.y;
    let moved = false;

    beginGesture(
      (p) => {
        if (!p) return;
        if (!moved && Math.abs(p.x - start.x) + Math.abs(p.y - start.y) < DRAG_THRESHOLD) return;
        moved = true;
        const x = clampX(p.x - offX);
        const y = clampY(p.y - offY);
        setNodes((ns) => ns.map((m) => (m.id === id ? { ...m, x, y } : m)));
        setRestored(0);
      },
      () => {
        if (!moved) {
          setSelected(id);
          setSelectedEdge(null);
        }
      },
    );
  };

  const startConnect = (e: React.PointerEvent, n: SDNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const p = rel(e);
    if (!p) return;
    const from = n.id;
    setConn({ from, x: p.x, y: p.y });

    beginGesture(
      (q) => setConn((c) => (c && q ? { ...c, x: q.x, y: q.y } : c)),
      (q) => {
        setConn(null);
        if (!q) return;
        const target = nodesRef.current.find(
          (m) =>
            m.id !== from && q.x >= m.x && q.x <= m.x + NODE_W && q.y >= m.y && q.y <= m.y + NODE_H,
        );
        if (!target) return;
        setEdges((es) =>
          es.some((x) => x.from === from && x.to === target.id)
            ? es
            : [...es, { from, to: target.id }],
        );
        setResult(null);
        setRestored(0);
      },
    );
  };

  const removeNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id));
    if (selected === id) setSelected(null);
    setSelectedEdge(null);
    setResult(null);
    setRestored(0);
  };

  const removeEdge = (key: string) => {
    setEdges((es) => es.filter((e) => edgeKey(e) !== key));
    setSelectedEdge(null);
    setResult(null);
    setRestored(0);
  };

  // Delete/Backspace removes the selected link too, so a mis-drawn arrow can go
  // without having to hit the small badge on it. The state setters are stable,
  // so the removal is inlined here rather than calling removeEdge and having to
  // re-subscribe the listener on every render.
  useEffect(() => {
    if (!selectedEdge) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Delete" && ev.key !== "Backspace") return;
      const el = ev.target as HTMLElement | null;
      if (el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? "")) return;
      ev.preventDefault();
      setEdges((es) => es.filter((e) => edgeKey(e) !== selectedEdge));
      setSelectedEdge(null);
      setResult(null);
      setRestored(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEdge]);

  const setConfig = (id: string, cfgId: string, optId: string) => {
    setNodes((ns) =>
      ns.map((n) => (n.id === id ? { ...n, config: { ...n.config, [cfgId]: optId } } : n)),
    );
    setResult(null);
    setRestored(0);
  };

  const reset = () => {
    gesture.current?.();
    resetView();
    setNodes([]);
    setEdges([]);
    setConn(null);
    setSelected(null);
    setSelectedEdge(null);
    setResult(null);
    setRestored(0);
    clearDraft(problem.slug);
  };

  // Checking only reports. A correct design stays on the canvas, verified, so
  // the user can look their own build over before committing to finishing.
  const check = () => setResult(validateDesign(nodes, edges, problem));

  const complete = () => {
    finished.current = true;
    clearDraft(problem.slug);
    onSolved();
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div
          ref={viewportRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => {
            setSelected(null);
            setSelectedEdge(null);
          }}
          onPointerDown={onSurfacePointerDown}
          // Right-drag pans, so the browser menu has to stay out of the way.
          onContextMenu={(e) => e.preventDefault()}
          className={`relative h-[64dvh] min-h-[380px] touch-none overflow-hidden rounded-2xl border border-border ${
            panning ? "cursor-grabbing" : "cursor-pointer"
          }`}
        >
          <div
            style={{
              width: WORKSPACE_W,
              height: WORKSPACE_H,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
            className="relative bg-[radial-gradient(circle,_rgba(125,125,125,0.18)_1px,_transparent_1px)] [background-size:18px_18px]"
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              <defs>
                <marker id="sd-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" className="fill-coral" />
                </marker>
                <marker id="sd-arrow-selected" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" className="fill-foreground" />
                </marker>
              </defs>
              {edges.map((e) => {
                const a = nodes.find((n) => n.id === e.from);
                const b = nodes.find((n) => n.id === e.to);
                if (!a || !b) return null;
                const ca = center(a);
                const cb = center(b);
                const p = border(cb.x, cb.y, a);
                const q = border(ca.x, ca.y, b);
                const key = edgeKey(e);
                const isSel = selectedEdge === key;
                const mx = (p.x + q.x) / 2;
                const my = (p.y + q.y) / 2;
                return (
                  <g key={key}>
                    {/* The visible arrow is 2px wide - far too thin to click. This
                        invisible stroke widens the hit target without changing how
                        the link is drawn. The enclosing svg opts out of pointer
                        events, so each interactive piece opts itself back in. */}
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={q.x}
                      y2={q.y}
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelected(null);
                        setSelectedEdge(isSel ? null : key);
                      }}
                    >
                      <title>Click this link to delete it</title>
                    </line>
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={q.x}
                      y2={q.y}
                      className={isSel ? "stroke-foreground" : "stroke-coral"}
                      strokeWidth={isSel ? 3 : 2}
                      markerEnd={`url(#${isSel ? "sd-arrow-selected" : "sd-arrow"})`}
                    />
                    {isSel && (
                      <g
                        style={{ pointerEvents: "auto", cursor: "pointer" }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          removeEdge(key);
                        }}
                      >
                        <title>Delete this link</title>
                        <circle
                          cx={mx}
                          cy={my}
                          r={10}
                          className="fill-background stroke-foreground"
                          strokeWidth={1.5}
                        />
                        <path
                          d={`M${mx - 3.5},${my - 3.5} L${mx + 3.5},${my + 3.5} M${mx + 3.5},${my - 3.5} L${mx - 3.5},${my + 3.5}`}
                          className="stroke-foreground"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                        />
                      </g>
                    )}
                  </g>
                );
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
                  data-node="1"
                  onPointerDown={(e) => startMove(e, n)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
                  className={`absolute flex cursor-move touch-none select-none flex-col justify-center rounded-xl border bg-card px-3 shadow-sm ${
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
                    className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 cursor-crosshair touch-none rounded-full bg-coral"
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

          {/* Sibling of the workspace rather than a child of it: the workspace is
              1800x1200 and pans under the viewport, so centring inside it would
              park this text off screen. Centred on the viewport it always sits in
              the middle of what the user can actually see. */}
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
              <div className="max-w-md">
                Drag components here. Drag the dot to connect them, and click a component to
                configure it.
                <br />
                Click an arrow to delete it. Right-drag to look around, and scroll to zoom.
              </div>
            </div>
          )}

          {(view.scale !== 1 || view.x !== 0 || view.y !== 0) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetView();
              }}
              title="Reset the view"
              className="absolute bottom-3 right-3 cursor-pointer rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur transition hover:bg-muted"
            >
              {Math.round(view.scale * 100)}% · Reset view
            </button>
          )}
        </div>

        {restored > 0 && (
          <div className="rounded-2xl border border-border bg-background/40 px-3 py-2 text-[13px] text-muted-foreground">
            Restored your unfinished design ({restored} component{restored === 1 ? "" : "s"}). It
            autosaves as you build, so a reload or an error won't lose it.
          </div>
        )}

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
          <div className="flex items-center gap-2 rounded-2xl border border-[#3fae6a]/40 bg-[#3fae6a]/10 p-3 text-sm font-medium text-[#3fae6a]">
            <Check className="h-4 w-4 shrink-0" />
            Correct - components, connections, and every design decision check out. Your build is
            above; finish the lesson once you have looked it over.
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          {result?.ok ? (
            <button
              onClick={complete}
              className="inline-flex items-center gap-1.5 rounded-full bg-coral px-5 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95"
            >
              Complete lesson <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={check}
              className="inline-flex items-center gap-1.5 rounded-full bg-coral px-5 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95"
            >
              <Check className="h-4 w-4" /> Check design
            </button>
          )}
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
