import { useEffect, useRef } from "react";

const openLayers: symbol[] = [];

export function useEscape(onClose: () => void) {
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });
  useEffect(() => {
    const id = Symbol();
    openLayers.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openLayers[openLayers.length - 1] === id) latest.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openLayers.splice(openLayers.indexOf(id), 1);
    };
  }, []);
}
