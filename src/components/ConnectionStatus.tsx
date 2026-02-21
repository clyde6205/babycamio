import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { ConnectionState } from "livekit-client";

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  onDisconnectAlarm?: () => void;
}

/**
 * Persistent connection heartbeat indicator + audible disconnect alarm.
 * Shows LIVE pulse when connected, warning when reconnecting, and
 * triggers an alarm sound + vibration when the stream drops.
 */
const ConnectionStatus = ({ connectionState, onDisconnectAlarm }: ConnectionStatusProps) => {
  const [alarmActive, setAlarmActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const prevStateRef = useRef<ConnectionState>(connectionState);

  useEffect(() => {
    const wasConnected = prevStateRef.current === ConnectionState.Connected;
    const isNowDisconnected =
      connectionState === ConnectionState.Disconnected ||
      connectionState === ConnectionState.Reconnecting;

    if (wasConnected && isNowDisconnected) {
      // Stream dropped — trigger alarm
      setAlarmActive(true);
      onDisconnectAlarm?.();

      // Vibrate pattern (works on Android)
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
      }

      // Audible alarm
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = 880;
        const gain = ctx.createGain();
        gain.gain.value = 0.3;
        // Pulsing alarm
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 4;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.3;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        lfo.start();
        oscRef.current = osc;
        // Auto-stop after 10 seconds
        setTimeout(() => stopAlarm(), 10000);
      } catch {
        /* AudioContext not available */
      }
    }

    if (connectionState === ConnectionState.Connected && alarmActive) {
      stopAlarm();
    }

    prevStateRef.current = connectionState;
  }, [connectionState]);

  const stopAlarm = () => {
    setAlarmActive(false);
    try {
      oscRef.current?.stop();
    } catch {}
    oscRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (navigator.vibrate) navigator.vibrate(0);
  };

  useEffect(() => {
    return () => stopAlarm();
  }, []);

  if (connectionState === ConnectionState.Connected) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-green-500/20 border border-green-500/30 px-2.5 py-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Live</span>
      </div>
    );
  }

  if (connectionState === ConnectionState.Reconnecting) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 px-2.5 py-1 animate-pulse">
        <Wifi className="h-3 w-3 text-yellow-400" />
        <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Reconnecting</span>
      </div>
    );
  }

  if (alarmActive) {
    return (
      <button
        onClick={stopAlarm}
        className="flex items-center gap-1.5 rounded-full bg-red-500/30 border border-red-500/50 px-3 py-1.5 animate-pulse"
      >
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <span className="text-xs font-bold text-red-400">DISCONNECTED — Tap to silence</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/30 px-2.5 py-1">
      <WifiOff className="h-3 w-3 text-red-400" />
      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Offline</span>
    </div>
  );
};

export default ConnectionStatus;
