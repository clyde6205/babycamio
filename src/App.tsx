import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RTL_LANGUAGES } from "@/i18n";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppGate from "@/components/AppGate";

// Lazy-load all pages for smaller initial bundle on low-end devices
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CameraView = lazy(() => import("./pages/CameraView"));
const ViewerView = lazy(() => import("./pages/ViewerView"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminConsole = lazy(() => import("./pages/AdminConsole"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const MeasureTool = lazy(() => import("./pages/MeasureTool"));
const LevelTool = lazy(() => import("./pages/LevelTool"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Recordings = lazy(() => import("./pages/Recordings"));
const SleepAnalytics = lazy(() => import("./pages/SleepAnalytics"));
const FamilyCircle = lazy(() => import("./pages/FamilyCircle"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const BabyCareLog = lazy(() => import("./pages/BabyCareLog"));
const Milestones = lazy(() => import("./pages/Milestones"));
const CaregiverMode = lazy(() => import("./pages/CaregiverMode"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const ExternalCameras = lazy(() => import("./pages/ExternalCameras"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Invite = lazy(() => import("./pages/Invite"));
const Troubleshoot = lazy(() => import("./pages/Troubleshoot"));
const InviteCamera = lazy(() => import("./pages/InviteCamera"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Minimal loading fallback — no heavy spinners
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

/** Wrap a lazy page with its own error boundary so one page crash doesn't kill the app */
const SafePage = ({ children, scope }: { children: React.ReactNode; scope: string }) => (
  <ErrorBoundary scope={scope}>{children}</ErrorBoundary>
);

const App = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language?.split("-")[0];
    const isRtl = RTL_LANGUAGES.includes(lang);
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [i18n.language]);

  return (
  <ErrorBoundary scope="App">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <AppGate>
            <Routes>
              <Route path="/" element={<SafePage scope="Landing"><Landing /></SafePage>} />
              <Route path="/login" element={<SafePage scope="Auth"><Auth mode="login" /></SafePage>} />
              <Route path="/signup" element={<SafePage scope="Auth"><Auth mode="signup" /></SafePage>} />
              <Route path="/dashboard" element={<SafePage scope="Dashboard"><Dashboard /></SafePage>} />
              <Route path="/pricing" element={<SafePage scope="Pricing"><Pricing /></SafePage>} />
              <Route path="/settings" element={<SafePage scope="Settings"><Settings /></SafePage>} />
              <Route path="/admin" element={<SafePage scope="Admin"><AdminConsole /></SafePage>} />
              <Route path="/terms" element={<SafePage scope="Terms"><Terms /></SafePage>} />
              <Route path="/privacy" element={<SafePage scope="Privacy"><Privacy /></SafePage>} />
              <Route path="/disclaimer" element={<SafePage scope="Disclaimer"><Disclaimer /></SafePage>} />
              <Route path="/tools/measure" element={<SafePage scope="Measure"><MeasureTool /></SafePage>} />
              <Route path="/tools/level" element={<SafePage scope="Level"><LevelTool /></SafePage>} />
              <Route path="/troubleshoot" element={<SafePage scope="Troubleshoot"><Troubleshoot /></SafePage>} />
              <Route path="/ai" element={<SafePage scope="AI"><AIAssistant /></SafePage>} />
              <Route path="/recordings" element={<SafePage scope="Recordings"><Recordings /></SafePage>} />
              <Route path="/sleep" element={<SafePage scope="Sleep"><SleepAnalytics /></SafePage>} />
              <Route path="/family" element={<SafePage scope="Family"><FamilyCircle /></SafePage>} />
              <Route path="/referral" element={<SafePage scope="Referral"><ReferralPage /></SafePage>} />
              <Route path="/care-log" element={<SafePage scope="CareLog"><BabyCareLog /></SafePage>} />
              <Route path="/milestones" element={<SafePage scope="Milestones"><Milestones /></SafePage>} />
              <Route path="/caregiver" element={<SafePage scope="Caregiver"><CaregiverMode /></SafePage>} />
              <Route path="/install" element={<SafePage scope="Install"><InstallApp /></SafePage>} />
              <Route path="/invite/:code" element={<SafePage scope="Invite"><Invite /></SafePage>} />
              <Route path="/camera/:roomName" element={<SafePage scope="Camera"><CameraView /></SafePage>} />
              <Route path="/viewer/:roomName" element={<SafePage scope="Viewer"><ViewerView /></SafePage>} />
              <Route path="/diagnostics" element={<SafePage scope="Diagnostics"><Diagnostics /></SafePage>} />
              <Route path="/external-cameras" element={<SafePage scope="ExternalCameras"><ExternalCameras /></SafePage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AppGate>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
