import { useState } from "react";
import { api, type TokenFn } from "../lib/api";

export function OnboardingScreen({ token, onDone }: { token: TokenFn; onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!username.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.setProfile(token, username.trim(), "");
      onDone();
    } catch (e) {
      setError(String(e).includes("409") ? "That LeetCode username is already taken." : "Could not save. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-10 shadow-[0_30px_80px_-20px_rgba(7,55,129,0.45)] backdrop-blur-md">
        <div className="font-display text-2xl tracking-tight">Link your LeetCode</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your LeetCode username so an admin can verify it against your account and approve you.
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
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
