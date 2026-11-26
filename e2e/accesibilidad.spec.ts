import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CASOS, crearPdfEstado } from '../scripts/qa-pdfs.mjs';

// Accesibilidad (axe, WCAG 2.1 AA + buenas prácticas). Sin violaciones serias ni críticas.

const RUTAS = ['/', '/login', '/registro', '/onboarding', '/app', '/app/billy', '/app/gastos', '/app/fijos', '/app/presupuesto', '/app/patrimonio', '/app/insights', '/app/importar', '/app/ayuda', '/app/ajustes?sec=fuentes'];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.post('/api/qa/reset');
  for (const c of CASOS) {
    const r = await request.post('/api/imports', { multipart: { modo: 'sync', archivo: { name: c.archivo, mimeType: 'application/pdf', buffer: await crearPdfEstado(c) } } });
    const { importacion } = (await r.json()) as { importacion: { id: string } };
    await request.post('/api/imports/confirmar', { data: { items: [{ id: importacion.id }] } });
  }
});

// Solo modo día: aunque el sistema pida oscuro (o quede una preferencia vieja guardada), la app se ve en claro.
test('sin violaciones serias (modo día, aunque el sistema esté en oscuro)', async ({ page }) => {
  test.setTimeout(240_000); // 14 rutas (compilación en frío en CI + axe)
  await page.addInitScript(() => { try { localStorage.setItem('mm-theme', 'dark'); } catch {} });
  // Sin animaciones: axe mide colores a media transición si no.
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const fallas: string[] = [];
  for (const ruta of RUTAS) {
    await page.goto(ruta, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBeNull();
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
    for (const v of res.violations) {
      if (v.impact === 'serious' || v.impact === 'critical') fallas.push(`${ruta} ${v.id} ×${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
    }
  }
  expect(fallas, fallas.join('\n')).toEqual([]);
});
