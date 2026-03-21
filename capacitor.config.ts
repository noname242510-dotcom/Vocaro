import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.vocaro.app',
  appName: 'Vocaro',
  webDir: 'public',
  server: {
    url: 'http://localhost:9003',
    cleartext: true
  }
};

export default config;
