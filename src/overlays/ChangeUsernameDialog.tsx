import { useState } from "react";
import { Check } from "lucide-react";
import { Dialog } from "../components/Dialog";
import { useData } from "../data/context";
import { api } from "../lib/api";

export function ChangeUsernameDialog({
  onClose,
  isAdmin = false,
}: {
  onClose: () => void;
  isAdmin?: boolean;
}) {
  const { getToken } = useData();
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!username.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (isAdmin) {
        await api.setProfile(getToken, username.trim(), "");
      } else {
        await api.requestUsername(getToken, username.trim());
      }
      setSent(true);
    } catch (e) {
      setError(
        String(e).includes("409")
          ? "That LeetCode username is already taken."
          : "Could not submit. Try again.",
      );
      setSaving(false);
    }
  };

  if (sent) {
    return (
      <Dialog title={isAdmin ? "Username updated" : "Request sent"} onClose={onClose}>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d5f0db] text-[#2f7d46]">
            <Check className="h-4 w-4" />
          </span>
          {isAdmin ? (
            <span>
              Your LeetCode username is now <b className="text-foreground">{username}</b>. Your solves
              will re-sync to the new account shortly.
            </span>
          ) : (
            <span>
              An admin will review your request to use <b className="text-foreground">{username}</b> and
              switch it once they verify it.
            </span>
          )}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Change LeetCode username" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        {isAdmin
          ? "As an admin you can change your LeetCode username directly."
          : "Usernames are admin-verified to prevent impersonation. Submit a request and an admin will switch it for you."}
      </p>
      <label className="mt-5 block text-xs font-medium text-muted-foreground" htmlFor="new-lc-username">
        New LeetCode username
      </label>
      <input
        id="new-lc-username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="e.g. jordan_dev"
        className="mt-1.5 w-full rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm focus:outline-none"
      />
      {error && <p className="mt-3 text-xs text-coral">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="mt-5 rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
      >
        {saving ? "Saving…" : isAdmin ? "Change username" : "Send request"}
      </button>
    </Dialog>
  );
}
