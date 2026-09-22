import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { CASOS, crearPdfEstado } from '../scripts/qa-pdfs.mjs';

// Capturas de referencia para revisión visual (no verifican lógica): login, registro, Inicio con cuentas, hoja "Agregar cuenta".
// `npx playwright test capturas` → test-results/capturas/<proyecto>-vis-*.png

const CAPTURAS = 'test-results/capturas';

async function captura(page: Page, nombre: string) {
  await mkdir(CAPTURAS, { recursive: true });
  await page.waitForTimeout(900);
  // animations: 'disabled' deja cada animación en su estado final (la captura a página completa las reiniciaría).
  await page.screenshot({ path: `${CAPTURAS}/${test.info().project.name}-vis-${nombre}.png`, fullPage: true, animations: 'disabled' });
}

test('capturas de login, registro e Inicio con cuentas', async ({ page, request }) => {
  await request.post('/api/qa/reset');
  for (const c of CASOS) {
    const r = await request.post('/api/imports', { multipart: { archivo: { name: c.archivo, mimeType: 'application/pdf', buffer: await crearPdfEstado(c) } } });
    const { importacion } = (await r.json()) as { importacion: { id: string } };
    await request.post('/api/imports/confirmar', { data: { items: [{ id: importacion.id }] } });
  }

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await captura(page, 'login');

  await page.goto('/registro');
  await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
  await captura(page, 'registro');
  await page.getByLabel('Correo').fill('jc@billup.mx');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Quincena2026!');
  await captura(page, 'registro-contrasena');

  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Cuentas' })).toBeVisible();
  await captura(page, 'inicio');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await captura(page, 'hoja-agregar');
  await page.keyboard.press('Escape');

  await page.goto('/app/fijos');
  await captura(page, 'fijos');
});
