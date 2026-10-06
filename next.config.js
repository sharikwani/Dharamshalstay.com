/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: 60,
  },
  reactStrictMode: true,
  // Redirect non-www to www so there is exactly ONE canonical domain.
  // This matches the canonical tags which point to www.
  // Markdown copies of detail pages for AI assistants: /blog/x.md -> app/md (see lib/llms.ts).
  async rewrites() {
    return [
      { source: '/:section(blog|destinations|treks|hotels)/:slug([a-z0-9-]+).md', destination: '/md/:section/:slug' },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'dharamshalastay.com' }],
        destination: 'https://www.dharamshalastay.com/:path*',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
