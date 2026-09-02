import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { router } from "./app/router";
import { ErrorBoundary } from "./components/ErrorBoundary";

window.addEventListener("vite:preloadError", (e) => {
  if (!sessionStorage.getItem("chunk-reloaded")) {
    sessionStorage.setItem("chunk-reloaded", "1");
    e.preventDefault();
    window.location.reload();
  }
});

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
