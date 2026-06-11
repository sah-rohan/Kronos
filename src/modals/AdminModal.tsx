import { useEffect, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";
import { api, type Analytics, type MeResponse } from "../lib/api";

export function AdminModal({ onClose }: { onClose: () => void }) {
  const { getToken } = useData();
  const [pending, setPending] = useState<MeResponse[] | null>(null);
  const [members, setMembers] = useState<MeResponse[]>([]);
  const [requests, setRequests] = useState<MeResponse[]>([]);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const load = () => {
    api.adminPending(getToken).then(setPending).catch(() => setPending([]));
    api.adminAnalytics(getToken).then(setStats).catch(() => setStats(null));
    api
      .adminUsers(getToken)
      .then((u) => {
        setMembers(u.filter((m) => m.status === "approved"));
        setRequests(u.filter((m) => (m.requestedUsername ?? "").trim() !== ""));
      })
      .catch(() => {
        setMembers([]);
        setRequests([]);
      });
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (id: string) => {
    await api.adminApprove(getToken, id);
    load();
  };
  const applyUsername = async (id: string, username: string) => {
    if (!username.trim()) return;
    await api.adminSetUsername(getToken, id, username.trim());
    setEditId(null);
    load();
  };
  const remove = async (id: string) => {
    await api.adminRemove(getToken, id);
    setConfirmId(null);
    load();
  };
  const reject = async (id: string) => {
    await api.adminReject(getToken, id);
    setRejectId(null);
    load();
  };

  const removeBtn = (id: string) =>
    confirmId === id ? (
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => remove(id)}
          className="rounded-full bg-coral px-3 py-1.5 text-xs font-medium text-coral-foreground transition hover:opacity-95"
        >
          Remove
        </button>
        <button
          onClick={() => setConfirmId(null)}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    ) : (
      <button
        onClick={() => setConfirmId(id)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
        title="Remove user"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );

  return (
    <Modal title="Manage members" onClose={onClose}>
      {stats && (
        <>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overview</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Members", value: stats.users },
              { label: "Active 7d", value: stats.active7d },
              { label: "Solves 7d", value: stats.solves7d },
              { label: "Total solves", value: stats.solves },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border px-3 py-2.5">
                <div className="text-xl font-semibold tabular-nums">{s.value}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          {(() => {
            const max = Math.max(1, ...stats.perDay.map((d) => d.count));
            return (
              <div className="mt-3 rounded-2xl border border-border px-4 py-3">
                <div className="mb-2 text-[11px] text-muted-foreground">Solves · last 14 days</div>
                <div className="flex h-16 items-end gap-1">
                  {stats.perDay.map((d) => (
                    <div key={d.date} className="flex-1" title={`${d.date}: ${d.count}`}>
                      <div
                        className="w-full rounded-t bg-coral"
                        style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 3 : 0 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="mt-7" />
        </>
      )}
      {requests.length > 0 && (
        <>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Username change requests
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify the new LeetCode account belongs to them before applying.
          </p>
          <ul className="mt-3 space-y-3">
            {requests.map((u) => (
              <li key={`req-${u.id}`} className="flex items-center gap-3 rounded-2xl border border-coral/40 bg-coral/5 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    @{u.username || "—"} → <b className="text-foreground">@{u.requestedUsername}</b>
                  </div>
                </div>
                <button
                  onClick={() => applyUsername(u.id, (u.requestedUsername ?? "").trim())}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#d5f0db] px-3 py-1.5 text-xs font-medium text-[#2f7d46] transition hover:opacity-90"
                >
                  <Check className="h-3.5 w-3.5" /> Apply
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-7" />
        </>
      )}
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending approval</div>
      <p className="mt-1 text-sm text-muted-foreground">
        New sign-ups wait here until you verify their LeetCode username.
      </p>
      <ul className="mt-3 space-y-3">
        {(pending ?? []).map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{u.name}</div>
              <div className="truncate text-xs text-muted-foreground">LeetCode @{u.username || "—"}</div>
            </div>
            <button
              onClick={() => approve(u.id)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#d5f0db] px-3 py-1.5 text-xs font-medium text-[#2f7d46] transition hover:opacity-90"
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
            {rejectId === u.id ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => reject(u.id)}
                  className="rounded-full bg-coral px-3 py-1.5 text-xs font-medium text-coral-foreground transition hover:opacity-95"
                >
                  Reject
                </button>
                <button
                  onClick={() => setRejectId(null)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setRejectId(u.id)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
                title="Reject & delete (lets them re-register)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
        {pending !== null && pending.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No one is waiting for approval.
          </li>
        )}
      </ul>

      <div className="mt-7 text-xs font-medium uppercase tracking-wide text-muted-foreground">Members</div>
      <ul className="mt-3 space-y-3">
        {members.map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {u.name}
                {u.role === "admin" && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">admin</span>}
              </div>
              {editId === u.id ? (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">@</span>
                  <input
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyUsername(u.id, editVal)}
                    placeholder="leetcode username"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-xs outline-none focus:border-coral"
                  />
                  <button
                    onClick={() => applyUsername(u.id, editVal)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d5f0db] text-[#2f7d46]"
                    title="Save"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditId(u.id);
                    setEditVal(u.username || "");
                  }}
                  className="group mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
                  title="Change LeetCode username"
                >
                  LeetCode @{u.username || "—"}
                  <Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                </button>
              )}
            </div>
            {u.role === "admin" ? (
              <span className="shrink-0 text-[11px] text-muted-foreground">you</span>
            ) : (
              removeBtn(u.id)
            )}
          </li>
        ))}
        {members.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No members yet.
          </li>
        )}
      </ul>
    </Modal>
  );
}
