// The LeetCode-username field shared by the link and change-username dialogs.
export function UsernameInput({
  value,
  onChange,
  onSubmit,
  label,
  error,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  label: string;
  error: string;
  className?: string;
}) {
  return (
    <>
      <label className={`block text-xs font-medium text-muted-foreground ${className}`}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="e.g. jordan_dev"
        className="mt-1.5 w-full rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm focus:outline-none"
      />
      {error && <p className="mt-3 text-xs text-coral">{error}</p>}
    </>
  );
}
