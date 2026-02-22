import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Wifi, WifiOff, Signal, Globe, Server, Clock, RefreshCw,
  CheckCircle2, XCircle, Loader2, Activity, Shield, Zap,
} from "lucide-react";

type TestStatus = "idle" | "running" | "pass" | "fail";

interface DiagResult {
  label: string;
  value: string;
  status: TestStatus;
  detail?: string;
}

const getConnectionInfo = () => {
  const nav = navigator as any;
  const conn = nav.connection;
  return {
    online: navigator.onLine,
    type: conn?.type || "unknown",
    effectiveType: conn?.effectiveType || "unknown",
    downlink: conn?.downlink ?? "N/A",
    rtt: conn?.rtt ?? "N/A",
    saveData: conn?.saveData ?? false,
  };
};

const StatusIcon = ({ status }: { status: TestStatus }) => {
  switch (status) {
    case "running": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "pass": return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "fail": return <XCircle className="h-4 w-4 text-destructive" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const Diagnostics = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagResult[]>([]);
  const [iceCandidates, setIceCandidates] = useState<string[]>([]);
  const [turnStatus, setTurnStatus] = useState<TestStatus>("idle");
  const [turnDetail, setTurnDetail] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const updateResult = useCallback((label: string, update: Partial<DiagResult>) => {
    setResults(prev => prev.map(r => r.label === label ? { ...r, ...update } : r));
  }, []);

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    setIceCandidates([]);
    setTurnStatus("running");
    setTurnDetail("");

    const connInfo = getConnectionInfo();

    const initial: DiagResult[] = [
      { label: "Network Status", value: connInfo.online ? "Online" : "Offline", status: connInfo.online ? "pass" : "fail" },
      { label: "Connection Type", value: connInfo.type, status: "pass" },
      { label: "Effective Type", value: connInfo.effectiveType, status: connInfo.effectiveType === "4g" ? "pass" : connInfo.effectiveType === "3g" ? "pass" : "fail" },
      { label: "Downlink (Mbps)", value: String(connInfo.downlink), status: typeof connInfo.downlink === "number" && connInfo.downlink >= 1 ? "pass" : "fail" },
      { label: "RTT (ms)", value: String(connInfo.rtt), status: typeof connInfo.rtt === "number" && connInfo.rtt <= 200 ? "pass" : "fail" },
      { label: "Data Saver", value: connInfo.saveData ? "Enabled" : "Disabled", status: connInfo.saveData ? "fail" : "pass", detail: connInfo.saveData ? "Data saver may limit streaming quality" : "" },
      { label: "Edge Function", value: "Testing…", status: "running" },
      { label: "LiveKit Token", value: "Testing…", status: "running" },
      { label: "WebSocket", value: "Testing…", status: "running" },
      { label: "Latency (Edge)", value: "Testing…", status: "running" },
    ];
    setResults(initial);

    // Test 1: Edge function reachability + latency
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const edgeUrl = `https://${projectId}.supabase.co/functions/v1/livekit-token`;
    let livekitUrl = "";
    let latencyMs = 0;

    try {
      const start = performance.now();
      const res = await fetch(edgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ roomName: "diag-test", participantName: "diag", isPublisher: false }),
      });
      latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json();
        livekitUrl = data.url || "";
        updateResult("Edge Function", { value: `Reachable (${res.status})`, status: "pass" });
        updateResult("LiveKit Token", { value: `Generated ✓`, status: "pass", detail: `Token length: ${data.token?.length || 0}` });
        updateResult("Latency (Edge)", { value: `${latencyMs}ms`, status: latencyMs < 2000 ? "pass" : "fail", detail: latencyMs > 3000 ? "High latency — may affect connection" : "" });
      } else {
        const body = await res.json().catch(() => ({}));
        updateResult("Edge Function", { value: `Error ${res.status}`, status: "fail", detail: body.error || "" });
        updateResult("LiveKit Token", { value: "Failed", status: "fail" });
        updateResult("Latency (Edge)", { value: `${latencyMs}ms`, status: "fail" });
      }
    } catch (err: any) {
      updateResult("Edge Function", { value: "Unreachable", status: "fail", detail: err.message });
      updateResult("LiveKit Token", { value: "Failed", status: "fail" });
      updateResult("Latency (Edge)", { value: "N/A", status: "fail" });
    }

    // Test 2: WebSocket connectivity to LiveKit
    if (livekitUrl) {
      try {
        const wsStart = performance.now();
        const ws = new WebSocket(livekitUrl);
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => { ws.close(); reject(new Error("Timeout")); }, 10000);
          ws.onopen = () => { clearTimeout(timeout); const wsLatency = Math.round(performance.now() - wsStart); updateResult("WebSocket", { value: `Connected (${wsLatency}ms)`, status: "pass" }); ws.close(); resolve(); };
          ws.onerror = () => { clearTimeout(timeout); reject(new Error("WebSocket failed")); };
        });
      } catch (err: any) {
        updateResult("WebSocket", { value: "Failed", status: "fail", detail: err.message + " — may be blocked by firewall/proxy" });
      }
    } else {
      updateResult("WebSocket", { value: "Skipped", status: "fail", detail: "No LiveKit URL available" });
    }

    // Test 3: ICE candidate gathering + TURN detection
    try {
      if (pcRef.current) { pcRef.current.close(); }
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
        iceCandidatePoolSize: 4,
      });
      pcRef.current = pc;

      const candidates: string[] = [];
      let hasHost = false;
      let hasSrflx = false;
      let hasRelay = false;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const c = e.candidate;
          const type = c.type || "unknown";
          const protocol = c.protocol || "";
          const line = `${type} | ${protocol} | ${c.address || "hidden"} | port ${c.port || "?"}`;
          candidates.push(line);
          setIceCandidates([...candidates]);

          if (type === "host") hasHost = true;
          if (type === "srflx") hasSrflx = true;
          if (type === "relay") hasRelay = true;
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") {
          setIceCandidates([...candidates]);
          if (hasRelay) {
            setTurnStatus("pass");
            setTurnDetail("TURN relay available — works behind firewalls");
          } else if (hasSrflx) {
            setTurnStatus("pass");
            setTurnDetail("STUN reflexive available — direct connections work. TURN relay not tested (LiveKit provides its own TURN).");
          } else if (hasHost) {
            setTurnStatus("pass");
            setTurnDetail("Host candidates only — local network. LiveKit's built-in TURN will handle remote connections.");
          } else {
            setTurnStatus("fail");
            setTurnDetail("No ICE candidates gathered — network may be heavily restricted");
          }
        }
      };

      // Create a dummy data channel to trigger ICE gathering
      pc.createDataChannel("diag");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Timeout after 10s
      setTimeout(() => {
        if (pc.iceGatheringState !== "complete") {
          setTurnStatus(candidates.length > 0 ? "pass" : "fail");
          setTurnDetail(candidates.length > 0
            ? `Gathered ${candidates.length} candidates (gathering still in progress)`
            : "ICE gathering timed out — network may block WebRTC"
          );
          pc.close();
        }
      }, 10000);
    } catch (err: any) {
      setTurnStatus("fail");
      setTurnDetail(`ICE test failed: ${err.message}`);
    }

    setIsRunning(false);
  }, [updateResult]);

  // Cleanup
  useEffect(() => {
    return () => { if (pcRef.current) pcRef.current.close(); };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <button onClick={() => navigate("/dashboard")} className="touch-target">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Connection Diagnostics</h1>
          <p className="text-xs text-muted-foreground">Debug worldwide connectivity</p>
        </div>
        <Button size="sm" onClick={runDiagnostics} disabled={isRunning}>
          {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isRunning ? "Running…" : "Run Tests"}
        </Button>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Quick network overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wifi className="h-5 w-5 text-primary" /> Network Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">Press "Run Tests" to start diagnostics</p>
            ) : (
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.label} className="flex items-start justify-between rounded-lg border border-border p-3">
                    <div className="flex items-start gap-2">
                      <StatusIcon status={r.status} />
                      <div>
                        <p className="text-sm font-medium">{r.label}</p>
                        {r.detail && <p className="text-xs text-muted-foreground">{r.detail}</p>}
                      </div>
                    </div>
                    <Badge variant={r.status === "pass" ? "default" : r.status === "fail" ? "destructive" : "secondary"} className="ml-2 shrink-0">
                      {r.value}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ICE Candidates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-primary" /> ICE Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {iceCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run tests to gather ICE candidates</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-auto">
                {iceCandidates.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded bg-muted/50 px-3 py-1.5 font-mono text-xs">
                    <Signal className="h-3 w-3 shrink-0 text-muted-foreground" />
                    {c}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* TURN Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-primary" /> TURN / Relay Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <StatusIcon status={turnStatus} />
              <div>
                <p className="text-sm font-medium">
                  {turnStatus === "idle" && "Not tested yet"}
                  {turnStatus === "running" && "Gathering candidates…"}
                  {turnStatus === "pass" && "Connectivity OK"}
                  {turnStatus === "fail" && "Connectivity Issue"}
                </p>
                {turnDetail && <p className="text-xs text-muted-foreground mt-1">{turnDetail}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-primary" /> What This Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>Network Status</strong> — Wi-Fi, cellular, Bluetooth, or Ethernet detection</p>
            <p><strong>Edge Function</strong> — Can your device reach the token server</p>
            <p><strong>LiveKit Token</strong> — Can tokens be generated for room access</p>
            <p><strong>WebSocket</strong> — Can your device open a WebSocket to LiveKit's servers</p>
            <p><strong>ICE Candidates</strong> — What connection paths are available (host, STUN, TURN)</p>
            <p><strong>TURN</strong> — Whether relay connections work (needed behind firewalls/VPNs)</p>
            <p><strong>Latency</strong> — Round-trip time to the backend</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Diagnostics;
