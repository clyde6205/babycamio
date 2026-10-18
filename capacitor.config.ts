import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.babycam.app',
  appName: 'BabyCam.io',
  webDir: 'dist',
  server: {
    // Serve the bundled app over the local HTTPS scheme. Do not commit a hosted
    // development URL here; doing so makes every installed APK depend on that preview.
    androidScheme: 'https',
  },
  plugins: {
    AdMob: {
      // Replace with the production AdMob App ID through the release environment.
      appId: 'ca-app-pub-3940256099942544~3347511713',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0a1628',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a1628',
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0a1628',
  },
};

export default config;
