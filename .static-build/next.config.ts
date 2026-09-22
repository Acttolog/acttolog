import type { NextConfig } from 'next';

/**
 * ACTTOLOG production configuration.
 * Security headers per spec §86. CSP is deliberately deferred to the
 * hardening pass (requires nonce wiring for inline theme scripts) —
 * tracked in README "Remaining".
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

/**
 * ACTTOLOG_LOWMEM=1 trims build peak memory for ≤1GB containers:
 * type-check and lint run as separate `npm test` steps there instead of
 * inside the build. Vercel (normal `npm run build`) keeps full checks.
 */
const lowmem = Boolean(process.env.ACTTOLOG_LOWMEM);
/** Static export mode for GitHub Pages preview (tools/build-static.sh). */
const isExport = Boolean(process.env.ACTTOLOG_EXPORT);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(isExport ? { output: 'export' as const } : {}),
  typescript: { ignoreBuildErrors: lowmem },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/my/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
  images: {
    unoptimized: isExport, // GitHub Pages has no image optimizer
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google profile photos
    ],
  },
  experimental: {
    // Small (1 GB) build containers: cap static-generation workers.
    cpus: Number(process.env.ACTTOLOG_BUILD_CPUS || 1),
  },
};

export default nextConfig;
