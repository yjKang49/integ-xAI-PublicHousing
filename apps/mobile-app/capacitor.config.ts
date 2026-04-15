// apps/mobile-app/capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.co.ax.publichousing',
  appName: 'AX 안전관리',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Live reload for development (remove in production)
    url: 'http://192.168.1.100:8100',
    cleartext: true,
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen',
    },
    Geolocation: {
      permissions: ['location'],
    },
    CapacitorMlkitBarcodeScanning: {
      // Google ML Kit Barcode Scanning
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a237e',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a237e',
    },
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
};

export default config;
