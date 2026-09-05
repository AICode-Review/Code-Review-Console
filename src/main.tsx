import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalErrorWatcher } from "./components/GlobalErrorWatcher";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    {/* Outside ErrorBoundary on purpose — it catches what a component-tree boundary
        structurally can't (event-handler throws, unhandled promise rejections), so it
        needs to keep working even while ErrorBoundary is showing its own fallback. */}
    <GlobalErrorWatcher />
    <ErrorBoundary scope="app">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
