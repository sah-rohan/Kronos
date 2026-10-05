import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { UsernameInput } from "./UsernameForm";
import { useUsernameSubmit } from "./useUsernameSubmit";

// Admins change their username directly; everyone else sends a request an
// admin verifies, to prevent impersonation.
export function ChangeUsernameModal({ onClose, isAdmin = false }: { onClose: () => void; isAdmin?: boolean }) {
  const { getToken } = useData();
  const [sent, setSent] = useState(false);
  const form = useUsernameSubmit(async (username) => {
    await (isAdmin ? api.setProfile(getToken, username, "") : api.requestUsername(getToken, username));
    setSent(true);
  }, "Could not submit. Try again.");

  if (sent) {
    return (
      <Modal title={isAdmin ? "Username updated" : "Request sent"} onClose={onClose} fitContent>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d5f0db] text-[#2f7d46]">
            <Check className="h-4 w-4" />
          </span>
          {isAdmin ? (
            <span>
              Your LeetCode username is now <b className="text-foreground">{form.username}</b>. Your solves will
              re-sync to the new account shortly.
            </span>
          ) : (
            <span>
              An admin will review your request to use <b className="text-foreground">{form.username}</b> and switch it
              once they verify it.
            </span>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Change LeetCode username" onClose={onClose} fitContent>
      <p className="text-sm text-muted-foreground">
        {isAdmin
          ? "As an admin you can change your LeetCode username directly."
          : "Usernames are admin-verified to prevent impersonation. Submit a request and an admin will switch it for you."}
      </p>
      <UsernameInput
        className="mt-5"
        label="New LeetCode username"
        value={form.username}
        onChange={form.setUsername}
        onSubmit={form.save}
        error={form.error}
      />
      <button
        onClick={form.save}
        disabled={form.saving}
        className="mt-5 rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
      >
        {form.saving ? "Saving…" : isAdmin ? "Change username" : "Send request"}
      </button>
    </Modal>
  );
}
