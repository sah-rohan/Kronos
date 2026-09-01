# Kronos — what changed

**Baseline:** React 19 / Vite 7 / Tailwind v4, **no router**, 14 modals rendered
as conditionals inside `App.tsx`. **New deps:** `react-router-dom`, `vitest`.
Nothing else — no state library, no `tailwind.config.js`; tokens stay in the
`@theme` block of `src/index.css`.

---

## The five audit findings

| # | Before | After | Start reading at |
| --- | --- | --- | --- |
| **1** Nothing linkable, bookmarkable, or back-button-able | 13 `useState` calls in `App.tsx` encoded *where you were* | Data router; every screen is a URL, every filter a search param | `src/app/router.tsx`, `src/lib/slugs.ts` |
| **2** Three different ways to say "open this" | `<div onClick>` cards (mouse-only), a bare `<li onClick>`, a text link; `stopPropagation` + `closest("ul")` hacks to keep nested controls alive | One `EntryPoint` primitive — stretched-link pattern, persistent chevron, real `<a>`/`<button>` | `src/components/EntryPoint.tsx` |
| **3** Friends chart unreadable | Bubbles colored by **sort rank**, sized by diameter, small values exactly occluding each other, double tooltip | Grouped bars; difficulty→token is one source, asserted by a test; redundant hue+lightness+text encoding; values also exposed as a visually-hidden table | `src/components/DifficultyBars.tsx`, `src/lib/difficulty.ts` |
| **4** Calendar highlighted the wrong day | No today marker existed at all — the brightest cell was just the most-solves day; separately, the card built its grid in **UTC** and the overlay in **local**, so the two disagreed | One `useToday()`, all comparisons on a local `YYYY-MM-DD` key, four named states + legend, `aria-current="date"` and a ring so today isn't color-only | `src/lib/calendar.ts`, `src/lib/dayStyles.ts` |
| **5** Leaderboard scope hidden until you opened something | Scope lived in `kronos.lb.scope`; board had **three** sources of truth (`board` state, `roadmap` state, `lb-type` localStorage) — so the card and the modal opened *from that card* could disagree | `?board=` / `?scope=` on the URL; both localStorage keys deleted | `src/lib/searchParams.ts` |

---

## Modals → routes

11 files in `src/modals/` and 4 modal shells in `src/systemdesign/` are **deleted**,
not hidden.

| Was | Is now |
| --- | --- |
| `ProgressModal` | `/progress/:track` — `?topic= ?status= ?sort= ?q=` |
| `LeaderboardModal` (list) | `/leaderboard` — `?board= ?scope= ?q=` |
| `LeaderboardModal` (member panel) + `FriendProgressModal` | `/u/:handle` — one screen; it was previously two ways to the same thing |
| `RecentActivityModal` (You / Friends tabs) | `/activity` and `/u/:handle/activity` — the person picker disappears into the path |
| `FriendsModal` | `/friends` — `?tab= ?q=` |
| `SystemDesignModal` | `/system-design/:moduleSlug`, `/genai-system-design/:moduleSlug` — `?stage= ?slide=` |
| `CloudModal`, `NetworkingModal` | `/cloud`, `/networking` + `/:topicSlug` — neither modal had an index before |
| `ComponentsModal` | a section of `/system-design`, addressed by `?topic=` |

**Stayed overlays**, now on native `<dialog>` + `showModal()` (`src/components/Dialog.tsx`):
change-username, link-LeetCode, admin, solution detail, calendar. Escape, focus
trap, focus restore and body-scroll lock did not exist **anywhere** in the old
app — verified by grep: no `role="dialog"`, no keydown listener, no portal.

The background-location (Gmail-style) pattern was deliberately **not** used:
every screen here is either a real page or a genuinely transient overlay.

---

## Rules the code enforces

- **Path = identity, query = filters.** Defaults are omitted, never written, so
  plain `/leaderboard` *is* the Everyone board.
- **Filter changes `replace`, screen changes push** — ten keystrokes in a search
  box cost zero back-button presses.
- **Malformed values coerce to the default.** A URL is user input; `?slide=` is
  clamped to the module's slide count, `?page=` past the end clamps to the last.
- **No component hand-types a path** — everything goes through `paths` in
  `slugs.ts`, and every `useParams()` read is validated (no non-null assertions).
- **`slugs.ts` imports no content modules**, or ~3000 lines of static data would
  come back into the shell bundle and defeat route-level `lazy()`.
- **The LeetCode lock is a route guard** (`RequireLeetCode`), not just a blur.
  `LockOverlay` could never stop someone typing `/progress/neetcode150`.
- **Comparison can't shame you** (`src/lib/momentum.ts`): `weeklyDelta()` returns
  a labelled object, never a signed integer, so no red minus sign can grow later.
  `momentum.test.ts` pins it — no label may start with `-`, and the copy may not
  contain a digit, so a gap size cannot leak in.

---

## Also worth knowing

- **`/u/:handle` is composed from existing endpoints — no API was added.** Two
  fields genuinely don't exist and are filed rather than faked: a user's current
  "track" (shown as real per-roadmap counts instead of a guess), and a
  non-friend's streak (says so, rather than rendering a fake zero).
- **Deviations, stated plainly:** the calendar has no `/calendar` route because
  the route table defines none, so it stayed an overlay — the one screen whose
  view state isn't in the URL. `fmtShortDate` was fixed outside its phase: it
  returned `""` for any full ISO timestamp, so **every activity row rendered a
  blank date**.
- **Everything else open is in `FOLLOWUPS.md`**, grouped by the phase that raised
  it — including the derived Friends series and the `/recent`-bounded weekly delta.

---

## Diagnostics

| | Before | After |
| --- | --- | --- |
| `tsc -b` | clean | clean |
| `npm run lint` | **7 errors** | clean |
| `npm test` | no tests, no runner | **56 tests, 4 files** |
| Code splitting | none | route-level `lazy()` on every page but the dashboard; `highlight.js` in its own chunk |

Verified in a browser on the **no-auth branch** (`VITE_CLERK_PUBLISHABLE_KEY`
absent) — cold deep links, the snake_case→kebab slug map, unknown slugs landing
on not-found inside the shell, back-button state restored from the URL. **Not
verified:** the Clerk branch (no key available) and the Docker/nginx deep-link
check (daemon not running); commands for both are in FOLLOWUPS.md B-6 and B-9.

## Running it locally

```
# .env.local (git-ignored)
VITE_FIXTURES=1
```

`npm run dev` then shows a populated, internally consistent dashboard — you,
three friends with deliberately different streak shapes, and one non-friend so
the "streaks are shared between friends" path is reachable. The old empty
dashboard and its ~15s cold load were a stale `VITE_API_URL` pointing at a mock
server that isn't in this repo, not an app bug.

Fixtures cannot ship: the guard in `src/lib/api.ts` is behind
`import.meta.env.DEV`, which Vite replaces with `false` in a production build, so
Rollup drops the branch *and* its dynamic `import()`. Re-check with:

```
npm run build && grep -rl "fixtureFor\|f-mira\|FRIEND_RATES" dist/assets/ || echo clean
```

Knobs (`src/dev/fixtures.ts`, typed against the real `Api*` types so drift is a
compile error): `CATALOG`, `MY_PROGRESS`, `STREAK_LENGTH`, `SOLVED_ANCHORS`,
`buildCalendar(...)`, `ME_RESPONSE.role`. Note `DEMO_FUTURE_DAYS` — it lets
solve-days fall after today so the **Solved** swatch stays visible in the first
week of a month; set it `false` for a strictly plausible calendar.
