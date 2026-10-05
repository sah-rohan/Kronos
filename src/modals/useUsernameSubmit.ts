import { useState } from "react";
import { isConflict } from "../lib/api";

// Submit state for a LeetCode-username form. `submit` gets the trimmed name; a 409 means someone already linked it.
export function useUsernameSubmit(submit: (username: string) => Promise<void>, failure = "Could not save. Try again.") {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!username.trim()) return;
    setSaving(true);
    setError("");
    try {
      await submit(username.trim());
    } catch (e) {
      setError(isConflict(e) ? "That LeetCode username is already taken." : failure);
      setSaving(false);
    }
  };

  return { username, setUsername, error, saving, save };
}
