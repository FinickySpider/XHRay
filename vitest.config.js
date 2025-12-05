// Configuration for running unit tests with Vitest in a browser-like environment
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true
  }
});