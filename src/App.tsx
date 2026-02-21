import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RTL_LANGUAGES } from "@/i18n";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CameraView from "./pages/CameraView";
import ViewerView from "./pages/ViewerView";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import AdminConsole from "./pages/AdminConsole";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Disclaimer from "./pages/Disclaimer";
import MeasureTool from "./pages/MeasureTool";
import LevelTool from "./pages/LevelTool";
import AIAssistant from "./pages/AIAssistant";
import Recordings from "./pages/Recordings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          <Route path="/camera/:roomName" element={<CameraView />} />
          <Route path="/viewer/:roomName" element={<ViewerView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
