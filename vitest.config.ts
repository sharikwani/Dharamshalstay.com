import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', env: { BOOKING_LINK_SECRET: 'test-booking-link-secret' } },
});
