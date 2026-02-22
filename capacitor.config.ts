import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.babycam.app',
  appName: 'BabyCam.io',
  webDir: 'dist',
  server: {
    url: 'https://1b7444d5-9ac1-487f-9e86-e1b166f05b65.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    AdMob: {
      // Replace with your real AdMob App ID before production
      appId: 'ca-app-pub-3940256099942544~3347511713', // Test App ID
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
    allowMixedContent: true,
    backgroundColor: '#0a1628',
  },
};

export default config;
