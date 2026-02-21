import { useNavigate } from "react-router-dom";
import { ArrowLeft, Video } from "lucide-react";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Baby<span className="text-primary">Cam</span>.io
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 prose prose-sm dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using BabyCam.io ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>BabyCam.io provides live video monitoring services using enterprise-grade streaming technology. The Service allows users to set up cameras and share access with authorized viewers.</p>

        <h2>3. User Accounts</h2>
        <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use this Service.</p>

        <h2>4. Privacy & Data</h2>
        <p>Video streams are transmitted using end-to-end encrypted connections. We do not store or record your video streams unless explicitly enabled by you. See our <button onClick={() => navigate("/privacy")} className="text-primary underline">Privacy Policy</button> for details.</p>

        <h2>5. Acceptable Use</h2>
        <p>You agree to use the Service only for lawful monitoring purposes (e.g., baby monitoring, home security). You must not use the Service to surveil individuals without their knowledge or consent where prohibited by law.</p>

        <h2>6. Subscription & Payments</h2>
        <p>Free accounts include limited features with ad support. Pro subscriptions are billed monthly at the listed rate. You may cancel at any time; access continues until the end of the billing period.</p>

        <h2>7. Disclaimer of Warranties</h2>
        <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. We do not guarantee uninterrupted or error-free service. BabyCam.io is not a substitute for in-person supervision of children.</p>

        <h2>8. Limitation of Liability</h2>
        <p>IN NO EVENT SHALL BABYCAM.IO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.</p>

        <h2>9. Changes to Terms</h2>
        <p>We may update these terms at any time. Continued use after changes constitutes acceptance of the new terms.</p>

        <h2>10. Contact</h2>
        <p>Questions about these terms? Contact us at <strong>legal@babycam.io</strong>.</p>
      </main>

      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BabyCam.io™ — All Rights Reserved.
      </footer>
    </div>
  );
};

export default Terms;
