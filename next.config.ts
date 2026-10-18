import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Capacitor packages the statically exported site from the `out` directory.
  output: 'export',
  images: { unoptimized: true,
  /* config options here */

  // FIX: Added headers to support Base Smart Wallet popups
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    '@lifi/sdk', 
    'tiny-secp256k1', 
    'bip32', 
    'bip39', 
    '@reown/appkit', 
    '@reown/appkit-adapter-wagmi',
    '@reown/appkit-common',
    '@tanstack/react-query'
  ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gcghriodmljkusdduhzl.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // STABLE TURBOPACK CONFIGURATION
  // Replaces deprecated experimental.turbo to stabilize compilation
  turbopack: {
    resolveAlias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      url: 'url',
      zlib: 'browserify-zlib',
      http: 'stream-http',
      https: 'https-browserify',
      assert: 'assert',
      os: 'os-browserify',
      path: 'path-browserify',
      process: 'process/browser',
      // node: scheme aliases for Turbopack
      'node:buffer': 'buffer',
      'node:stream': 'stream-browserify',
      'node:crypto': 'crypto-browserify',
      'node:util': 'util',
      'node:events': 'events',
      'node:path': 'path-browserify',
    },
  },
  webpack: (config, { isServer, webpack }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Polyfills and fallbacks for crypto-libraries during build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert'),
        os: require.resolve('os-browserify'),
        path: require.resolve('path-browserify'),
        process: require.resolve('process/browser'),
        buffer: require.resolve('buffer/'),
        events: require.resolve('events/'),
        util: require.resolve('util/'),
      };

      // node: scheme aliases for Webpack
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:buffer': require.resolve('buffer/'),
        'node:stream': require.resolve('stream-browserify'),
        'node:crypto': require.resolve('crypto-browserify'),
        'node:util': require.resolve('util/'),
        'node:events': require.resolve('events/'),
        'node:path': require.resolve('path-browserify'),
      };

      // Add ProvidePlugin for process and Buffer to handle legacy crypto libs
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );

      // Explicitly tell webpack that the environment supports async/await
      if (config.output) {
        config.output.environment = {
          ...config.output.environment,
          asyncFunction: true,
        };
      }
    }

    return config;
  },
};

export default nextConfig;