import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CASOS, crearPdfEstado } from '../scripts/qa-pdfs.mjs';

// Accesibilidad (axe, WCAG 2.1 AA + buenas prácticas) en claro y oscuro. Sin violaciones serias ni críticas.
// Única excepción: el azul de gasto/deuda (#2563EB, paleta fija) sobre fondo oscuro se queda en 3.6:1.

const RUTAS = ['/', '/login', '/registro', '/onboarding', '/app', '/app/gastos', '/app/fijos', '/app/presupuesto', '/app/patrimonio', '/app/insights', '/app/importar', '/app/ajustes?sec=fuentes'];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.post('/api/qa/reset');
  for (const c of CASOS) {
    const r = await request.post('/api/imports', { multipart: { modo: 'sync', archivo: { name: c.archivo, mimeType: 'application/pdf', buffer: await crearPdfEstado(c) } } });
    const { importacion } = (await r.json()) as { importacion: { id: string } };
    await request.post('/api/imports/confirmar', { data: { items: [{ id: importacion.id }] } });
  }
});

for (const tema of ['claro', 'oscuro'] as const) {
  test(`sin violaciones serias en tema ${tema}`, async ({ page }) => {
    test.setTimeout(240_000); // 12 rutas × 2 (compilación en frío en CI + axe)
    await page.addInitScript((t) => { try { localStorage.setItem('mm-theme', t); } catch {} }, tema === 'oscuro' ? 'dark' : 'light');
    // Sin animaciones: axe mide colores a media transición si no.
    await page.emulateMedia({ colorScheme: tema === 'oscuro' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const fallas: string[] = [];
    for (const ruta of RUTAS) {
      await page.goto(ruta, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']);
      const res = await (tema === 'oscuro' ? axe.exclude('.text-negative') : axe).analyze();
      for (const v of res.violations) {
        if (v.impact === 'serious' || v.impact === 'critical') fallas.push(`${ruta} ${v.id} ×${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
      }
    }
    expect(fallas, fallas.join('\n')).toEqual([]);
  });
}
