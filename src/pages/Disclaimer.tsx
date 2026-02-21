import { useNavigate } from "react-router-dom";
import { ArrowLeft, Video, AlertTriangle } from "lucide-react";

const Disclaimer = () => {
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
        <div className="not-prose mb-6 flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            IMPORTANT: Please read this disclaimer carefully before using BabyCam.io.
          </p>
        </div>

        <h1>Disclaimer</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <h2>Not a Substitute for Supervision</h2>
        <p>
          <strong>BabyCam.io is a monitoring tool and is NOT a substitute for proper in-person supervision of children, infants, or dependents.</strong> Parents and caregivers must always ensure appropriate physical supervision is maintained regardless of the use of this Service.
        </p>

        <h2>No Medical or Safety Guarantees</h2>
        <p>BabyCam.io does not provide medical advice, diagnoses, or safety guarantees. Features such as "cry detection" and "motion alerts" are AI-assisted and may produce false positives or negatives. Never rely solely on these features for the safety of your child.</p>

        <h2>Service Availability</h2>
        <p>Live streaming depends on internet connectivity, device capabilities, and third-party infrastructure (LiveKit). We cannot guarantee 100% uptime. Service interruptions may occur due to network issues, maintenance, or circumstances beyond our control.</p>

        <h2>Third-Party Services</h2>
        <p>BabyCam.io integrates with third-party services including LiveKit (streaming), Stripe, PayPal, PayMongo, and M-Pesa (payments). We are not responsible for the availability, accuracy, or security of these third-party services.</p>

        <h2>User Responsibility</h2>
        <p>You are solely responsible for:</p>
        <ul>
          <li>Ensuring your use of the Service complies with local laws and regulations</li>
          <li>Obtaining consent from all individuals who may be recorded or monitored</li>
          <li>Maintaining the security of your account and shared access codes</li>
          <li>The physical safety and welfare of any individuals being monitored</li>
        </ul>

        <h2>Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, BABYCAM.IO, ITS FOUNDERS, EMPLOYEES, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INJURY, LOSS, CLAIM, OR DAMAGE OF ANY KIND ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.</p>

        <h2>Indemnification</h2>
        <p>You agree to indemnify and hold harmless BabyCam.io from any claims, damages, or expenses arising from your use of the Service or violation of these terms.</p>

        <h2>Contact</h2>
        <p>If you have questions about this disclaimer, contact us at <strong>legal@babycam.io</strong>.</p>
      </main>

      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BabyCam.io™ — All Rights Reserved.
      </footer>
    </div>
  );
};

export default Disclaimer;
