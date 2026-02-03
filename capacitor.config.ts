import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.sprachorchestrator.app',
  appName: 'ZubenkoAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
