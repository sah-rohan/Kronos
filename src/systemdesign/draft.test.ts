import { beforeEach, describe, expect, it } from "vitest";
import { clearDraft, loadDraft, saveDraft } from "./draft";
import type { SDNode } from "./validate";

// The canvas has no test environment of its own, but the promise the error screen
// makes - "your progress is saved" - lives entirely in this module, so the
// round-trip and the defensive parsing are worth pinning down.

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  // Minimal localStorage stand-in; vitest runs these files in Node.
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
});

const node = (id: string, x = 10, y = 20): SDNode => ({
  id,
  type: "client",
  x,
  y,
  config: { db: "sql" },
});

describe("system design drafts", () => {
  it("round-trips an unfinished design", () => {
    saveDraft("design-url-shortener", {
      nodes: [node("n1"), node("n2", 300, 400)],
      edges: [{ from: "n1", to: "n2" }],
    });
    const back = loadDraft("design-url-shortener");
    expect(back?.nodes).toHaveLength(2);
    expect(back?.nodes[1]).toEqual(node("n2", 300, 400));
    expect(back?.edges).toEqual([{ from: "n1", to: "n2" }]);
  });

  it("keeps drafts for different problems apart", () => {
    saveDraft("a", { nodes: [node("n1")], edges: [] });
    saveDraft("b", { nodes: [node("n1"), node("n2")], edges: [] });
    expect(loadDraft("a")?.nodes).toHaveLength(1);
    expect(loadDraft("b")?.nodes).toHaveLength(2);
  });

  it("treats an empty design as no draft and clears storage", () => {
    saveDraft("a", { nodes: [node("n1")], edges: [] });
    saveDraft("a", { nodes: [], edges: [] });
    expect(loadDraft("a")).toBeNull();
    expect(store.size).toBe(0);
  });

  it("clearDraft removes it", () => {
    saveDraft("a", { nodes: [node("n1")], edges: [] });
    clearDraft("a");
    expect(loadDraft("a")).toBeNull();
  });

  it("returns null instead of throwing on corrupt storage", () => {
    store.set("kronos.sd.draft.a", "{not json");
    expect(loadDraft("a")).toBeNull();
  });

  it("drops a draft written by a different version", () => {
    store.set("kronos.sd.draft.a", JSON.stringify({ v: 99, nodes: [node("n1")], edges: [] }));
    expect(loadDraft("a")).toBeNull();
  });

  it("drops nodes with non-finite coordinates rather than reviving NaN positions", () => {
    store.set(
      "kronos.sd.draft.a",
      JSON.stringify({ v: 1, nodes: [node("n1"), { ...node("n2"), x: null }], edges: [] }),
    );
    expect(loadDraft("a")?.nodes.map((n) => n.id)).toEqual(["n1"]);
  });

  it("drops edges whose endpoints did not survive", () => {
    store.set(
      "kronos.sd.draft.a",
      JSON.stringify({
        v: 1,
        nodes: [node("n1")],
        edges: [
          { from: "n1", to: "gone" },
          { from: "n1", to: "n1" },
        ],
      }),
    );
    expect(loadDraft("a")?.edges).toEqual([]);
  });
});
