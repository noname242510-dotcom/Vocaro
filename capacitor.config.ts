import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.vocaro.app',
  appName: 'Vocaro',
  webDir: 'out',
  server: {
    iosScheme: 'capacitor',
    hostname: 'localhost'
  }
};

export default config;
