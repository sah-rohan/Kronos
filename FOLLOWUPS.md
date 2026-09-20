# Follow-ups

Things noticed but deliberately not implemented, so they stay visible instead of
turning into silent scope creep.

## System Design canvas

- **Drafts are per-browser only.** `src/systemdesign/draft.ts` autosaves an
  unfinished design to `localStorage`, matching how `progress.ts` already stores
  completion. That means a draft does not follow a signed-in user to another
  device. The backend has `POST /me/sd/:slug` for *solved* only; persisting
  drafts server-side would need a new endpoint and a decision about how often to
  sync.
- **No fit-to-content control.** The workspace is a fixed 1800x1200 panned with
  a right-drag and zoomed with the wheel, clamped to 35%-200%. There is a
  "Reset view" pill, but no "fit everything on screen" action that computes the
  bounding box of all placed nodes - worth adding if designs get large.
- **Trackpad pinch-zoom is not handled separately.** Pinch gestures arrive as
  wheel events with `ctrlKey` set; they currently zoom at the same rate as a
  wheel notch, which can feel fast on a trackpad.
- **Edges cannot be deleted directly.** The only way to remove a wrong
  connection is to delete one of the nodes it attaches to (which drops all of
  that node's edges) or to hit Reset. Clicking an edge to select and delete it
  would be a real improvement to the build loop.
