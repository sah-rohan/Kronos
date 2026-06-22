import { useEffect, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";
import { api, type Analytics, type LeetcodeSession, type MeResponse } from "../lib/api";
import { daysUntil } from "../lib/date";

// ISO timestamp -> value for <input type="datetime-local">, shown in UTC
// (LeetCode session cookies expire in UTC, so we keep the whole field in UTC).
function toUtcInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

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
  const [session, setSession] = useState<LeetcodeSession | null>(null);
  const [tokenVal, setTokenVal] = useState("");
  const [expiryVal, setExpiryVal] = useState("");
  const [savingSession, setSavingSession] = useState(false);
  const [sessionMsg, setSessionMsg] = useState("");

  const load = () => {
    api.adminPending(getToken).then(setPending).catch(() => setPending([]));
    api.adminAnalytics(getToken).then(setStats).catch(() => setStats(null));
    api
      .adminLeetcodeSession(getToken)
      .then((s) => {
        setSession(s);
        setExpiryVal(toUtcInput(s.expiresAt));
      })
      .catch(() => setSession(null));
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

  const saveSession = async () => {
    setSavingSession(true);
    setSessionMsg("");
    try {
      // expiryVal is a UTC datetime-local string; append Z so it's parsed as UTC.
      const iso = expiryVal ? new Date(`${expiryVal}:00Z`).toISOString() : "";
      await api.adminSetLeetcodeSession(getToken, tokenVal.trim(), iso);
      setTokenVal("");
      setSessionMsg("Saved.");
      load();
    } catch {
      setSessionMsg("Could not save. Try again.");
    } finally {
      setSavingSession(false);
    }
  };

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
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Views", value: stats.views },
              { label: "Views 7d", value: stats.views7d },
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

      {(() => {
        const days = daysUntil(session?.expiresAt);
        const warn = days !== null && days <= 7;
        return (
          <>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">LeetCode session</div>
            <p className="mt-1 text-sm text-muted-foreground">
              The session token used to sync solves from LeetCode. Paste a fresh token and its expiry; it's stored
              encrypted (SSM SecureString) and never shown again.
            </p>
            {session && (
              <div
                className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                  warn ? "border-coral/50 bg-coral/5 text-coral" : "border-border text-muted-foreground"
                }`}
              >
                {session.hasToken ? "Token set." : "No token set yet."}{" "}
                {session.expiresAt
                  ? days !== null && days < 0
                    ? `Expired ${-days} day${-days === 1 ? "" : "s"} ago - sync is broken until you replace it.`
                    : `Expires in ${days} day${days === 1 ? "" : "s"} (${new Date(session.expiresAt).toLocaleString()}).`
                  : "No expiry recorded."}
              </div>
            )}
            <label className="mt-3 block text-xs font-medium text-muted-foreground">New session token</label>
            <input
              type="password"
              value={tokenVal}
              onChange={(e) => setTokenVal(e.target.value)}
              placeholder="Paste LEETCODE_SESSION token"
              className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none transition focus:border-coral"
            />
            <label className="mt-3 block text-xs font-medium text-muted-foreground">
              Expires at (UTC) - LeetCode session cookies expire in UTC
            </label>
            <input
              type="datetime-local"
              value={expiryVal}
              onChange={(e) => setExpiryVal(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none transition focus:border-coral"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={saveSession}
                disabled={savingSession || (!tokenVal.trim() && !expiryVal)}
                className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
              >
                {savingSession ? "Saving…" : "Save session"}
              </button>
              {sessionMsg && <span className="text-xs text-muted-foreground">{sessionMsg}</span>}
            </div>
            <div className="mt-7" />
          </>
        );
      })()}

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
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Legacy pending</div>
      <p className="mt-1 text-sm text-muted-foreground">
        New members are approved automatically now - everyone can use the System Design modules. LeetCode features
        unlock once they link a username. These are older sign-ups not yet migrated.
      </p>
      <ul className="mt-3 space-y-3">
        {(pending ?? []).map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{u.name}</div>
              {u.email && <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>}
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
              {u.email && <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>}
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
