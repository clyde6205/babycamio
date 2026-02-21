import { useNavigate } from "react-router-dom";
import { ArrowLeft, Video } from "lucide-react";

const Privacy = () => {
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
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Information We Collect</h2>
        <p>We collect your email address, display name, and device information when you create an account. We do not access, store, or process the content of your video streams.</p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To manage your account and subscription</li>
          <li>To send important service notifications</li>
          <li>To improve the Service quality and performance</li>
        </ul>

        <h2>3. Video Stream Data</h2>
        <p>All video and audio streams are peer-to-peer encrypted. BabyCam.io acts as a signaling intermediary only. Stream content is never recorded, analyzed, or stored on our servers unless you enable cloud recording (Pro feature).</p>

        <h2>4. Payment Information</h2>
        <p>Payment processing is handled by third-party providers (Stripe, PayPal, PayMongo, M-Pesa). We do not store credit card numbers or bank details. We only store transaction references and subscription status.</p>

        <h2>5. Data Sharing</h2>
        <p>We do not sell, trade, or rent your personal information. We may share data only when required by law or to protect our rights.</p>

        <h2>6. Data Security</h2>
        <p>We use industry-standard encryption (TLS 1.3) and secure authentication tokens. API keys are stored encrypted. Access to user data is restricted to authorized personnel only.</p>

        <h2>7. Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data at any time. Contact us at <strong>privacy@babycam.io</strong> to exercise these rights.</p>

        <h2>8. Cookies</h2>
        <p>We use essential cookies for authentication and session management only. We do not use tracking or advertising cookies on paid plans.</p>

        <h2>9. Children's Privacy</h2>
        <p>This Service is intended for parents and guardians monitoring their own children. We do not knowingly collect data from children under 13.</p>

        <h2>10. Changes</h2>
        <p>We may update this policy periodically. We will notify you of significant changes via email or in-app notification.</p>
      </main>

      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BabyCam.io™ — All Rights Reserved.
      </footer>
    </div>
  );
};

export default Privacy;
