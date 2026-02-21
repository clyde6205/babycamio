import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RTL_LANGUAGES } from "@/i18n";

// Lazy-load all pages for smaller initial bundle on low-end devices
const Landing = lazy(() => import("./pages/Landing"));
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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce refetching on low-end devices
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
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

const App = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language?.split("-")[0];
    const isRtl = RTL_LANGUAGES.includes(lang);
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [i18n.language]);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Dashboard />} />
            <Route path="/signup" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<AdminConsole />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/tools/measure" element={<MeasureTool />} />
            <Route path="/tools/level" element={<LevelTool />} />
            <Route path="/ai" element={<AIAssistant />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/sleep" element={<SleepAnalytics />} />
            <Route path="/family" element={<FamilyCircle />} />
            <Route path="/referral" element={<ReferralPage />} />
            <Route path="/camera/:roomName" element={<CameraView />} />
            <Route path="/viewer/:roomName" element={<ViewerView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
