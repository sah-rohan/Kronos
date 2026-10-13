import { useEffect, useLayoutEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, placeholder as hint } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting, type LanguageSupport } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { PadLanguage } from "../lib/api";

const MODES: Record<PadLanguage, () => Promise<LanguageSupport>> = {
  python: () => import("@codemirror/lang-python").then((m) => m.python()),
  java: () => import("@codemirror/lang-java").then((m) => m.java()),
  cpp: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  javascript: () => import("@codemirror/lang-javascript").then((m) => m.javascript()),
  go: () => import("@codemirror/lang-go").then((m) => m.go()),
};

const paper = EditorView.theme({
  "&": { fontSize: "13px", backgroundColor: "transparent", color: "var(--color-foreground)" },
  "&.cm-focused": { outline: "none" },
  ".cm-content": { fontFamily: "var(--font-mono)", lineHeight: "1.7", padding: "12px 0", caretColor: "var(--color-foreground)" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "var(--color-muted-foreground)" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklab, var(--color-accent) 22%, transparent) !important",
  },
  ".cm-placeholder": { color: "var(--color-muted-foreground)" },
});

const ink = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.moduleKeyword], color: "var(--color-accent)", fontWeight: "500" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--color-danger)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--color-muted-foreground)", fontStyle: "italic" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--color-hard)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--color-foreground)", fontWeight: "500" },
]);

export function CodeEditor({
  value,
  language,
  onChange,
  label,
  readOnly = false,
}: {
  value: string;
  language: PadLanguage;
  onChange?: (v: string) => void;
  label: string;
  readOnly?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const mode = useRef(new Compartment());
  const change = useRef(onChange);
  useLayoutEffect(() => {
    change.current = onChange;
  });

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          indentOnInput(),
          indentUnit.of("    "),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          mode.current.of([]),
          syntaxHighlighting(ink),
          paper,
          hint("Write code…"),
          EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) change.current?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // The editor owns its document after mount; later `value` props come from its own edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let live = true;
    MODES[language]().then((m) => live && view.current?.dispatch({ effects: mode.current.reconfigure(m) }));
    return () => {
      live = false;
    };
  }, [language]);

  return <div ref={host} />;
}
