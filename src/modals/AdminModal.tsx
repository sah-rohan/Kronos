import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";
import { api, type MeResponse } from "../lib/api";

export function AdminModal({ onClose }: { onClose: () => void }) {
  const { getToken } = useData();
  const [pending, setPending] = useState<MeResponse[] | null>(null);

  const load = () => api.adminPending(getToken).then(setPending).catch(() => setPending([]));
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
    load();
  };

  return (
    <Modal title="Approve members" onClose={onClose} maxW="max-w-2xl">
      <p className="text-sm text-muted-foreground">
        New sign-ups wait here until you verify their LeetCode username and approve them.
      </p>
      <ul className="mt-5 space-y-3">
        {(pending ?? []).map((u) => (
          <li key={u.id} className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{u.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                LeetCode @{u.username || "—"} · GitHub @{u.github || "—"}
              </div>
            </div>
            <button
              onClick={() => approve(u.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#d5f0db] px-3 py-1.5 text-xs font-medium text-[#2f7d46] transition hover:opacity-90"
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
            <button
              onClick={() => remove(u.id)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {pending !== null && pending.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No one is waiting for approval.
          </li>
        )}
      </ul>
    </Modal>
  );
}
