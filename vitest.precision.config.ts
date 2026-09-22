import { defineConfig } from 'vitest/config';
import path from 'node:path';

// `npm run qa:precision`: corre la extracción sobre qa/entregables/estados/*.pdf que tengan su .json esperado
// y escribe qa/reportes/precision-<fecha>.md. Con ANTHROPIC_API_KEY mide el modelo; sin llave, las reglas.
export default defineConfig({
  test: {
    include: ['qa/precision.test.ts'],
    environment: 'node',
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
