/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    // Allow images from any HTTPS domain.
    // This is necessary because hotel photos come from many OTA sources
    // (MakeMyTrip, Booking.com, Agoda, Goibibo, Airbnb, etc.) plus partner uploads.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    // Don't fail the build if an image 404s at build time
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Increase minimum cache TTL for better performance
    minimumCacheTTL: 60,
  },
  // Allow the app to work even if some OTA images fail
  reactStrictMode: true,
};
module.exports = nextConfig;