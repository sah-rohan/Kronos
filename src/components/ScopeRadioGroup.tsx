import { useRef } from "react";
import {
  LEADERBOARD_SCOPES,
  type LeaderboardScope,
} from "../lib/searchParams";

/**
 * Everyone / Friends segmented control.
 *
 * Audit finding #5: the dashboard's leaderboard card showed a flat top-4 with no
 * indication it was scoped to Everyone, and the toggle only existed inside the
 * detail view. The user should not have to open something to learn what they
 * were already looking at — so this control lives on the card *and* on the
 * `/leaderboard` page, both bound to the same `useLeaderboardScope()` hook and
 * therefore to the same `?scope=` URL param.
 *
 * Implemented as a real radio group rather than two buttons:
 *
 * - `role="radiogroup"` on the container, `role="radio"` + `aria-checked` on each
 *   option, so assistive tech announces "2 of 2, Friends, radio button" instead
 *   of two unrelated buttons.
 * - Roving tabindex: only the checked option is tabbable, so the group is one
 *   stop in the tab order (which is what a radio group should be), and the arrow
 *   keys move between options.
 * - Arrow keys wrap, and Home/End jump to the ends, per the WAI-ARIA radio group
 *   pattern. Moving selects, which is the expected behaviour for radios.
 */
export function ScopeRadioGroup({
  scope,
  onChange,
  size = "sm",
}: {
  scope: LeaderboardScope;
  onChange: (next: LeaderboardScope) => void;
  size?: "sm" | "md";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (delta: number) => {
    const i = LEADERBOARD_SCOPES.indexOf(scope);
    // Wrap around, so the group has no dead ends.
    const next =
      (i + delta + LEADERBOARD_SCOPES.length) % LEADERBOARD_SCOPES.length;
    onChange(LEADERBOARD_SCOPES[next]);
    refs.current[next]?.focus();
  };

  const jumpTo = (index: number) => {
    onChange(LEADERBOARD_SCOPES[index]);
    refs.current[index]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        jumpTo(0);
        break;
      case "End":
        e.preventDefault();
        jumpTo(LEADERBOARD_SCOPES.length - 1);
        break;
      default:
        break;
    }
  };

  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";

  return (
    <div
      role="radiogroup"
      aria-label="Leaderboard scope"
      onKeyDown={onKeyDown}
      className="flex items-center gap-0.5 rounded-full border border-border p-0.5"
    >
      {LEADERBOARD_SCOPES.map((value, i) => {
        const checked = scope === value;
        return (
          <button
            key={value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            // Roving tabindex: the group is a single tab stop.
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(value)}
            className={`rounded-full font-medium capitalize outline-none transition ${pad} ${
              checked
                ? "bg-coral text-coral-foreground"
                : "text-muted-foreground hover:bg-muted"
            } focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
