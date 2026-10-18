import "./i18n";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { isSupabaseConfigured } from "./integrations/supabase/client";
import "./index.css";

// The PWA plugin owns service-worker registration and auto-updates. Do not
// unregister workers here: doing so breaks installability and offline startup.

window.addEventListener("error", (event) => {
  console.error("[GlobalError]", event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[UnhandledRejection]", event.reason);
  event.preventDefault();
});

void import("@capacitor/app")
  .then(({ App: CapApp }) => {
    void CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void CapApp.exitApp();
    });
  })
  .catch(() => {
    // Browser environment.
  });

const MissingConfiguration = () => (
  <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-10 text-foreground">
    <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
      <h1 className="text-xl font-bold">BabyCam.io is not configured</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Supabase environment variables are missing. Set <code>VITE_SUPABASE_PROJECT_ID</code>,{" "}
        <code>VITE_SUPABASE_URL</code>, and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in the
        deployment environment, then rebuild the app.
      </p>
    </div>
  </main>
);

createRoot(document.getElementById("root")!).render(
  isSupabaseConfigured ? <App /> : <MissingConfiguration />,
);
