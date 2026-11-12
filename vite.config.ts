import { qwikVite } from '@qwik.dev/core/optimizer';
import { qwikMcp } from '@qwik.dev/mcp';
import { qwikRouter } from '@qwik.dev/router/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [qwikMcp(), qwikRouter(), qwikVite({ experimental: ['blockSSR', 'pendingBoundary'] })],
});
