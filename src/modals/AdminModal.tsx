import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";
import { api, type MeResponse } from "../lib/api";

export function AdminModal({ onClose }: { onClose: () => void }) {
  const { getToken } = useData();
  const [pending, setPending] = useState<MeResponse[] | null>(null);
  const [members, setMembers] = useState<MeResponse[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => {
    api.adminPending(getToken).then(setPending).catch(() => setPending([]));
    api.adminUsers(getToken).then((u) => setMembers(u.filter((m) => m.status === "approved"))).catch(() => setMembers([]));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (id: string) => {
    await api.adminApprove(getToken, id);
    load();
  };
  const remove = async (id: string) => {
    await api.adminRemove(getToken, id);
    setConfirmId(null);
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
            {removeBtn(u.id)}
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
              <div className="truncate text-xs text-muted-foreground">LeetCode @{u.username || "—"}</div>
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
