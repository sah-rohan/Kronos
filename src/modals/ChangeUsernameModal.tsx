import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "../components/Modal";

export function ChangeUsernameModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Modal title="Request sent" onClose={onClose}>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d5f0db] text-[#2f7d46]">
            <Check className="h-4 w-4" />
          </span>
          An admin will review your request to use <b className="text-foreground">{username}</b> and
          switch it once they verify it.
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Change LeetCode username" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Usernames are admin-verified to prevent impersonation. Submit a request and an
        admin will switch it for you.
      </p>
      <label className="mt-5 block text-xs font-medium text-muted-foreground">New LeetCode username</label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="e.g. jordan_dev"
        className="mt-1.5 w-full rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm focus:outline-none"
      />
      <button
        onClick={() => username.trim() && setSent(true)}
        className="mt-5 rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95"
      >
        Send request
      </button>
    </Modal>
  );
}
