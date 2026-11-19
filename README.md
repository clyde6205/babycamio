# BabyCam.io

Private baby-camera monitoring built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase, LiveKit, and Capacitor.

## What the app does

- Camera owners create private rooms and broadcast from a phone or browser.
- Viewers watch through unguessable room-UUID links; no viewer account is required.
- Owners can invite viewers by email, share QR codes, use talkback, play lullabies, record clips, and monitor camera health.
- Supabase stores account, room, recording, invitation, subscription, and settings data behind row-level security.
- LiveKit tokens are issued only after the edge function verifies room ownership, shared access, or a private viewer UUID.

## Local development

Requirements:

- Node.js 20+
- npm
- A Supabase project
- LiveKit Cloud credentials (or a compatible LiveKit server)

```bash
npm ci
cp .env.example .env
npm run dev
```

Fill `.env` with your local values:

```bash
VITE_SUPABASE_PROJECT_ID=your-project-ref
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
```

Never commit `.env` or service-role keys. The publishable key is safe for the browser; the service-role key is not.

## Database setup

Apply every SQL file in `supabase/migrations` in filename order. The latest migrations enforce owner-only access to camera data and expose two narrow RPCs:

- `validate_invitation(token)` returns an invitation's room UUID only for a valid token.
- `get_camera_health(room_id)` returns only operational health for a private room UUID.

Anonymous users cannot read the rooms, recordings, sleep events, heartbeat, profile, invitation, payment, or subscription tables directly.

## Edge functions

Deploy the functions in `supabase/functions` with the Supabase CLI or dashboard.

Required for streaming:

```bash
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

Required for verified Stripe webhooks:

```bash
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

Required for BitPay:

```bash
BITPAY_API_TOKEN=...
```

The BitPay webhook treats IPNs only as notifications and retrieves the invoice from BitPay's API with this token before processing payment status. Do not trust IPN payload fields as payment evidence.

Optional checkout origin controls:

```bash
APP_BASE_URL=https://babycam.io
ALLOWED_CHECKOUT_ORIGINS=https://babycam.io,https://www.babycam.io
```

Optional scheduled camera-health checks:

```bash
HEALTH_CHECK_SECRET=use-a-long-random-secret
```

Call `check-camera-health` as a scheduled POST with either the service-role bearer token or `x-health-check-secret`. PayMongo, PayPal, and M-Pesa remain disabled until their provider-specific pricing/capture/webhook configuration is completed.

## Production build

```bash
npm ci
npm run build
```

The build output is written to `dist/`.

## Android app

Capacitor packages the local `dist` build; the app no longer depends on an external preview URL.

```bash
npm run build
npx cap sync android
npx cap open android
```

Build and sign the Android app from Android Studio. Do not commit keystores, `local.properties`, or generated Android build output.

## Security notes

- Viewer links use room UUIDs, not guessable room slugs.
- Publishing requires an authenticated room owner.
- Viewer tokens can subscribe, send data, and publish microphone audio for talkback, but cannot publish camera/screen sources.
- Stripe, PayMongo, and BitPay webhook handlers reject unsigned or unconfigured requests.
- Checkout success/cancel URLs are restricted to an origin allow-list.
- Supabase service-role keys belong only in edge-function secrets.
- If an environment file was ever committed, rotate every credential it contained; deleting the file does not remove it from Git history.
