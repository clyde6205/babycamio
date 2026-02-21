import "./i18n";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Global error handlers ──────────────────────────────────
// Catch unhandled JS errors (network failures, script errors, etc.)
window.addEventListener("error", (event) => {
  console.error("[GlobalError]", event.error ?? event.message);
});

// Catch unhandled promise rejections (failed fetches, async errors, etc.)
window.addEventListener("unhandledrejection", (event) => {
  console.error("[UnhandledRejection]", event.reason);
  // Prevent the browser from logging a second noisy line
  event.preventDefault();
});

// ── Android back-button handling via Capacitor ─────────────
try {
  import("@capacitor/app").then(({ App: CapApp }) => {
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  }).catch(() => { /* Not running in Capacitor */ });
} catch { /* Browser environment */ }

createRoot(document.getElementById("root")!).render(<App />);
