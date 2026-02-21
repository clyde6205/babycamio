import { useState, useRef, useEffect } from "react";
import { Music, Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Room } from "livekit-client";

const SOUNDS = [
  { id: "white-noise", name: "White Noise", emoji: "🌊" },
  { id: "rain", name: "Rain", emoji: "🌧️" },
  { id: "heartbeat", name: "Heartbeat", emoji: "💓" },
  { id: "shush", name: "Shushing", emoji: "🤫" },
  { id: "fan", name: "Fan", emoji: "🌀" },
  { id: "ocean", name: "Ocean Waves", emoji: "🏖️" },
];

interface LullabyPlayerProps {
  room: Room | null;
  isConnected: boolean;
}

const LullabyPlayer = ({ room, isConnected }: LullabyPlayerProps) => {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const generateNoise = (type: string) => {
    stopSound();
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = volume / 100;
    gainRef.current = gain;
    gain.connect(ctx.destination);

    if (type === "white-noise" || type === "fan") {
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      if (type === "fan") {
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 400;
        source.connect(filter);
        filter.connect(gain);
      } else {
        source.connect(gain);
      }
      source.start();
      sourceRef.current = source;
    } else if (type === "heartbeat") {
      const osc = ctx.createOscillator();
      osc.frequency.value = 60;
      osc.type = "sine";
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 1.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      osc.start();
      lfo.start();
      sourceRef.current = osc;
    } else if (type === "rain" || type === "ocean") {
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (0.3 + 0.7 * Math.sin(i / ctx.sampleRate * 0.3));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = type === "rain" ? 2000 : 600;
      source.connect(filter);
      filter.connect(gain);
      source.start();
      sourceRef.current = source;
    } else if (type === "shush") {
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const envelope = 0.5 + 0.5 * Math.sin(t * Math.PI * 0.8);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 3000;
      filter.Q.value = 0.5;
      source.connect(filter);
      filter.connect(gain);
      source.start();
      sourceRef.current = source;
    }

    setPlaying(type);

    // Send command to camera side via data channel
    if (room && isConnected) {
      const msg = JSON.stringify({ type: "lullaby", action: "play", sound: type, volume });
      room.localParticipant.publishData(new TextEncoder().encode(msg), { reliable: true });
    }
  };

  const stopSound = () => {
    try {
      sourceRef.current?.stop?.();
    } catch {}
    sourceRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setPlaying(null);

    if (room && isConnected) {
      const msg = JSON.stringify({ type: "lullaby", action: "stop" });
      room.localParticipant.publishData(new TextEncoder().encode(msg), { reliable: true });
    }
  };

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume / 100;
  }, [volume]);

  useEffect(() => {
    return () => { stopSound(); };
  }, []);

  return (
    <div className="w-full">
      <button onClick={() => setExpanded(!expanded)} className="touch-target flex flex-col items-center gap-1.5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${playing ? "bg-purple-500/80 animate-pulse" : "bg-white/15"}`}>
          <Music className="h-5 w-5" />
        </div>
        <span className="text-[10px] opacity-60">{playing ? "Playing" : "Lullaby"}</span>
      </button>

      {expanded && (
        <div className="absolute bottom-28 left-4 right-4 rounded-2xl bg-black/95 backdrop-blur-xl border border-white/10 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">🎵 Soothing Sounds</h3>
            {playing && (
              <Button size="sm" variant="ghost" onClick={stopSound} className="h-7 text-xs text-red-400">
                <Pause className="h-3 w-3 mr-1" /> Stop
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {SOUNDS.map((sound) => (
              <button
                key={sound.id}
                onClick={() => playing === sound.id ? stopSound() : generateNoise(sound.id)}
                className={`rounded-xl px-3 py-2.5 text-center transition-all ${
                  playing === sound.id ? "bg-purple-500/30 border border-purple-500/50" : "bg-white/5 border border-white/10"
                }`}
              >
                <span className="text-lg">{sound.emoji}</span>
                <p className="text-[10px] mt-0.5">{sound.name}</p>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 opacity-50" />
            <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={100} step={1} className="flex-1" />
            <span className="text-xs opacity-50 w-8 text-right">{volume}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LullabyPlayer;
