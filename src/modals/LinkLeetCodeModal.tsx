import { Modal } from "../components/Modal";
import { api, type TokenFn } from "../lib/api";
import { UsernameInput } from "./UsernameForm";
import { useUsernameSubmit } from "./useUsernameSubmit";

// Link a LeetCode username from inside the app (the unlock flow). On success it
// reloads the user so the locked cards re-evaluate.
export function LinkLeetCodeModal({ token, onClose, onLinked }: { token: TokenFn; onClose: () => void; onLinked: () => void }) {
  const form = useUsernameSubmit(async (username) => {
    await api.setProfile(token, username, "");
    onLinked();
    onClose();
  });

  return (
    <Modal title="Link your LeetCode" onClose={onClose} fitContent>
      <p className="text-sm text-muted-foreground">
        Enter your LeetCode username so an admin can verify it against your account. Once approved, your progress,
        streaks, friends, and the roadmap leaderboard unlock. Your System Design modules work without it.
      </p>

      <UsernameInput
        className="mt-6"
        label="LeetCode username"
        value={form.username}
        onChange={form.setUsername}
        onSubmit={form.save}
        error={form.error}
      />

      <button
        onClick={form.save}
        disabled={form.saving}
        className="mt-6 w-full rounded-full bg-coral py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
      >
        {form.saving ? "Saving…" : "Link username"}
      </button>
    </Modal>
  );
}
