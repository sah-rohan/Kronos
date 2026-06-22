import { useState } from "react";
import { X } from "lucide-react";
import { CLOUD_DOCS } from "./cloud";

export function CloudModal({ onClose }: { onClose: () => void }) {
  const [activeId, setActiveId] = useState(CLOUD_DOCS[0].id);
  const active = CLOUD_DOCS.find((c) => c.id === activeId)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-sky-foreground/25 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-surface relative flex h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-border shadow-[0_30px_80px_-20px_rgba(7,55,129,0.55)]">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-border p-6 pb-4 sm:px-8">
          <div className="text-xs font-medium uppercase tracking-wide text-coral">Cloud Engineering</div>
          <div className="font-display text-2xl tracking-tight">AWS &amp; Azure</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Core cloud building blocks, how they work, and the equivalent service on each cloud.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Sidebar */}
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border p-3 sm:w-56 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
            {CLOUD_DOCS.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  c.id === activeId ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="modal-scroll min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="font-display text-2xl tracking-tight">{active.name}</div>
            <p className="mt-1 text-sm text-muted-foreground">{active.tagline}</p>

            <div className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">What it is</div>
            <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted-foreground">
              {active.what.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">How it works</div>
            <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-muted-foreground">
              {active.how.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                  <span>
                    <span className="font-medium text-foreground">{h.term}.</span> {h.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#ff9900]">On AWS</div>
                <div className="space-y-2">
                  {active.aws.map((s) => (
                    <div key={s.name} className="rounded-2xl border border-border px-4 py-2.5">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-[13px] text-muted-foreground">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#0078d4]">On Azure</div>
                <div className="space-y-2">
                  {active.azure.map((s) => (
                    <div key={s.name} className="rounded-2xl border border-border px-4 py-2.5">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-[13px] text-muted-foreground">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
