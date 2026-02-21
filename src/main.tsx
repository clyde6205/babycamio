import "./i18n";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Android back button handling via Capacitor
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
