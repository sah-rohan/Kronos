import { useState } from "react";
import { Modal } from "../components/Modal";
import { api, type TokenFn } from "../lib/api";

// Link a LeetCode username from inside the app (the unlock flow). On success it
// reloads the user so the locked cards re-evaluate.
export function LinkLeetCodeModal({
  token,
  onClose,
  onLinked,
}: {
  token: TokenFn;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!username.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.setProfile(token, username.trim(), "");
      onLinked();
      onClose();
    } catch (e) {
      setError(String(e).includes("409") ? "That LeetCode username is already taken." : "Could not save. Try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title="Link your LeetCode" onClose={onClose} fitContent>
      <p className="text-sm text-muted-foreground">
        Enter your LeetCode username so an admin can verify it against your account. Once approved, your progress,
        streaks, friends, and the roadmap leaderboard unlock. Your System Design modules work without it.
      </p>

      <label className="mt-6 block text-xs font-medium text-muted-foreground">LeetCode username</label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="e.g. jordan_dev"
        className="mt-1.5 w-full rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm focus:outline-none"
      />

      {error && <p className="mt-3 text-xs text-coral">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-full bg-coral py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Link username"}
      </button>
    </Modal>
  );
}
