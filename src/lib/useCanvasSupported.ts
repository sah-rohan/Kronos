import { useSyncExternalStore } from "react";

// The design canvas relies on HTML5 drag-and-drop, which touch browsers don't
// fire, and it needs more room than a phone screen gives it.
const QUERY = "(pointer: coarse), (max-width: 767px)";

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

export function useCanvasSupported() {
  return useSyncExternalStore(subscribe, () => !window.matchMedia(QUERY).matches);
}
