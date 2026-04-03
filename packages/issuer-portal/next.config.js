// Load environment variables from the monorepo root .env
// (Next.js only looks in its own project root by default)
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile shared workspace package (TypeScript source)
  transpilePackages: ['shared'],
  webpack: (config) => {
    // Prevent webpack from trying to bundle Node.js-only modules
    // used by ethers/Veramo in the API routes
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
