import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Video, Ruler, ArrowRightLeft } from "lucide-react";

type Category = "length" | "weight" | "temperature" | "volume";

const UNITS: Record<Category, { name: string; toBase: (v: number) => number; fromBase: (v: number) => number }[]> = {
  length: [
    { name: "Inches", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
    { name: "Feet", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
    { name: "Yards", toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
    { name: "Centimeters", toBase: (v) => v * 0.01, fromBase: (v) => v / 0.01 },
    { name: "Meters", toBase: (v) => v, fromBase: (v) => v },
    { name: "Millimeters", toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
    { name: "Kilometers", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    { name: "Miles", toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
  ],
  weight: [
    { name: "Ounces", toBase: (v) => v * 28.3495, fromBase: (v) => v / 28.3495 },
    { name: "Pounds", toBase: (v) => v * 453.592, fromBase: (v) => v / 453.592 },
    { name: "Grams", toBase: (v) => v, fromBase: (v) => v },
    { name: "Kilograms", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    { name: "Milligrams", toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
  ],
  temperature: [
    { name: "Fahrenheit", toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
    { name: "Celsius", toBase: (v) => v, fromBase: (v) => v },
    { name: "Kelvin", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
  ],
  volume: [
    { name: "Fluid Ounces", toBase: (v) => v * 29.5735, fromBase: (v) => v / 29.5735 },
    { name: "Cups", toBase: (v) => v * 236.588, fromBase: (v) => v / 236.588 },
    { name: "Pints", toBase: (v) => v * 473.176, fromBase: (v) => v / 473.176 },
    { name: "Gallons", toBase: (v) => v * 3785.41, fromBase: (v) => v / 3785.41 },
    { name: "Milliliters", toBase: (v) => v, fromBase: (v) => v },
    { name: "Liters", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  ],
};

const MeasureTool = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>("length");
  const [fromUnit, setFromUnit] = useState("Inches");
  const [toUnit, setToUnit] = useState("Centimeters");
  const [inputValue, setInputValue] = useState("");

  const convert = (): string => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return "—";

    const units = UNITS[category];
    const from = units.find((u) => u.name === fromUnit);
    const to = units.find((u) => u.name === toUnit);
    if (!from || !to) return "—";

    const base = from.toBase(val);
    const result = to.fromBase(base);
    return result.toFixed(6).replace(/\.?0+$/, "");
  };

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <button onClick={() => navigate("/dashboard")} className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Ruler className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Measure Tool
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Unit Converter</h1>
          <p className="text-sm text-muted-foreground">Convert between inches, centimeters, feet, and more.</p>
        </div>

        {/* Category selector */}
        <div className="flex gap-2 mb-6">
          {(["length", "weight", "temperature", "volume"] as Category[]).map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCategory(cat);
                setFromUnit(UNITS[cat][0].name);
                setToUnit(UNITS[cat][1].name);
                setInputValue("");
              }}
              className="capitalize touch-target flex-1"
            >
              {cat}
            </Button>
          ))}
        </div>

        <Card className="p-5 space-y-4">
          {/* From */}
          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter value"
                className="flex-1 text-lg font-mono"
              />
              <Select value={fromUnit} onValueChange={setFromUnit}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS[category].map((u) => (
                    <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" onClick={swap} className="rounded-full">
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* To */}
          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center rounded-md border bg-muted/50 px-3 text-lg font-mono min-h-[40px]">
                {convert()}
              </div>
              <Select value={toUnit} onValueChange={setToUnit}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS[category].map((u) => (
                    <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Quick reference */}
        <Card className="mt-4 p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-2">Quick Reference</h3>
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <span>1 inch = 2.54 cm</span>
            <span>1 foot = 30.48 cm</span>
            <span>1 yard = 91.44 cm</span>
            <span>1 mile = 1.609 km</span>
            <span>1 lb = 453.6 g</span>
            <span>1 oz = 28.35 g</span>
          </div>
        </Card>
      </main>

      <footer className="border-t px-5 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BabyCam.io™ — All Rights Reserved.
      </footer>
    </div>
  );
};

export default MeasureTool;
