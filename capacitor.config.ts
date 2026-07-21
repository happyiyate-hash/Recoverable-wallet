import { CapacitorConfig } from '@capacitor/cli';

/**
 * INSTITUTIONAL CAPACITOR CONFIGURATION
 * Version: 2.0.0
 * 
 * Rules:
 * 1. PACKAGE IDENTITY: com.wnc.wallet (Canonical)
 * 2. WEB REGISTRY: out (Next.js Static Export node)
 */
const config: CapacitorConfig = {
  appId: 'com.wnc.wallet',
  appName: 'WNC Wallet',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;
