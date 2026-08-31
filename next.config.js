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
