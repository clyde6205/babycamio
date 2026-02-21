import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Video, Shield, Bell, Camera, ArrowRight, CheckCircle2, Baby } from "lucide-react";

const STEPS = [
  {
    icon: Baby,
    title: "Welcome to BabyCam.io",
    desc: "The world's most advanced baby monitoring app. Keep your little one safe from anywhere.",
    color: "text-primary",
  },
  {
    icon: Camera,
    title: "Set Up Your Camera",
    desc: "Place your phone near your baby's crib. We'll use the camera to stream live video to your other devices.",
    color: "text-green-400",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    desc: "All streams are end-to-end encrypted. Only people you invite can watch. No data stored on our servers.",
    color: "text-blue-400",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Get instant notifications when motion or crying is detected. AI-powered cry detection keeps you informed.",
    color: "text-orange-400",
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else {
      localStorage.setItem("babycam_onboarded", "true");
      onComplete();
    }
  };

  const skip = () => {
    localStorage.setItem("babycam_onboarded", "true");
    onComplete();
  };

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-6">
      {/* Progress dots */}
      <div className="flex gap-2 mb-12">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-muted"}`} />
        ))}
      </div>

      <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-primary/10 mb-8">
        <Icon className={`h-14 w-14 ${current.color}`} />
      </div>

      <h1 className="text-2xl font-bold text-center mb-3">{current.title}</h1>
      <p className="text-center text-muted-foreground max-w-sm mb-12">{current.desc}</p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" onClick={next} className="touch-target w-full">
          {step === STEPS.length - 1 ? (
            <><CheckCircle2 className="mr-2 h-5 w-5" /> Get Started</>
          ) : (
            <><ArrowRight className="mr-2 h-5 w-5" /> Continue</>
          )}
        </Button>
        {step < STEPS.length - 1 && (
          <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
            Skip tutorial
          </Button>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
