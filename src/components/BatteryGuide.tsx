import { Battery, BatteryCharging, Smartphone, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

const BatteryGuide = () => {
  const tips = [
    { icon: "🔌", title: "Keep Plugged In", desc: "Always keep the camera phone connected to a charger" },
    { icon: "🔅", title: "Lower Brightness", desc: "Turn screen brightness to minimum or use a black wallpaper" },
    { icon: "✈️", title: "Disable Unused Radios", desc: "Turn off Bluetooth and NFC if not needed" },
    { icon: "🔋", title: "Battery Saver Off", desc: "Disable battery optimization for BabyCam to prevent interruptions" },
    { icon: "📱", title: "Lock Screen Streaming", desc: "BabyCam continues streaming even when the screen is off" },
    { icon: "🌡️", title: "Avoid Overheating", desc: "Keep the phone in a well-ventilated area. Remove the case if it gets warm" },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <BatteryCharging className="h-5 w-5 text-green-400" />
        <h3 className="font-semibold">Battery Optimization Guide</h3>
      </div>
      <div className="space-y-3">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-lg">{tip.icon}</span>
            <div>
              <p className="text-sm font-medium">{tip.title}</p>
              <p className="text-xs text-muted-foreground">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BatteryGuide;
