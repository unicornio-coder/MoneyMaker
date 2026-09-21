import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { CASOS, crearPdfEstado } from '../scripts/qa-pdfs.mjs';

// Flujo completo: Inicio vacío → Agregar cuenta → subir 3 PDFs a la vez → revisión → guardar → Inicio con drawer → Gastos → Fijos.
// Corre en modo demo sin llaves: el usuario arranca vacío y los PDFs se leen por reglas.

const CAPTURAS = 'test-results/capturas';

async function captura(page: Page, nombre: string) {
  await mkdir(CAPTURAS, { recursive: true });
  await page.screenshot({ path: `${CAPTURAS}/${test.info().project.name}-${nombre}.png`, fullPage: true });
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.post('/api/qa/reset');
});

test('sube 3 estados de cuenta y llena todas las pantallas', async ({ page }, testInfo) => {
  const pdfs = await Promise.all(CASOS.map(async (c) => ({ name: c.archivo, mimeType: 'application/pdf', buffer: await crearPdfEstado({ ...c, archivo: `${testInfo.project.name}-${c.archivo}` }) })));

  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Aún no hay cuentas' })).toBeVisible();
  await captura(page, '01-inicio-vacio');

  // "Agregar" abre la hoja con las tres opciones; solo el PDF está activo.
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(page.getByText('Subir estado de cuenta')).toBeVisible();
  await expect(page.getByRole('button', { name: /Conectar mi banco automáticamente/ })).toBeDisabled();
  await captura(page, '02-hoja-agregar-cuenta');
  await page.getByRole('button', { name: /Subir estado de cuenta/ }).click();
  await expect(page).toHaveURL(/\/app\/importar/);

  // Tres archivos a la vez.
  await page.getByTestId('input-archivos').setInputFiles(pdfs);
  const lista = page.getByTestId('lista-archivos');
  await expect(lista.locator('li')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Encontramos 3 estados de cuenta' })).toBeVisible({ timeout: 60_000 });
  await expect(lista.locator('li[data-estado="revisar"]')).toHaveCount(3);
  await expect(page.getByText('•••• 0001').first()).toBeVisible();
  await expect(page.getByText('Se creará una cuenta nueva')).toHaveCount(2);
  await expect(page.getByText('Se unirá al otro estado de cuenta de esta misma tarjeta')).toHaveCount(1);
  await captura(page, '03-revision-combinada');

  await page.getByTestId('confirmar').click();
  await expect(page.getByRole('heading', { name: 'Listo' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/29 movimientos nuevos en 2 cuentas/)).toBeVisible();
  await expect(page.getByText(/Detectamos tu nómina los días 14 y 30/)).toBeVisible();
  await captura(page, '04-resultado');
  await page.getByRole('button', { name: 'Sí, usar esos días' }).click();
  await expect(page.getByText(/Listo: tu quincena/)).toBeVisible();

  // Inicio con el carrusel lleno y el drawer de la primera cuenta abierto.
  await page.getByRole('button', { name: 'Ver mi Inicio' }).click();
  await expect(page).toHaveURL(/\/app\?cuenta=/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Paga antes del')).toBeVisible();
  await captura(page, '05-inicio-drawer');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Cuentas' })).toBeVisible();
  await expect(page.getByText('BBVA Crédito').first()).toBeVisible();
  await expect(page.getByText('Banorte Débito').first()).toBeVisible();
  await captura(page, '06-inicio');

  await page.goto('/app/gastos');
  await expect(page.getByRole('heading', { name: 'Sin movimientos todavía' })).toHaveCount(0);
  await captura(page, '07-gastos');

  await page.goto('/app/fijos');
  await expect(page.getByText('Netflix').first()).toBeVisible();
  await expect(page.getByText('Amazon').first()).toBeVisible();
  await captura(page, '08-fijos');

  await page.goto('/app/presupuesto');
  await expect(page.getByRole('heading', { name: 'Tu presupuesto se arma solo' })).toHaveCount(0);
  await captura(page, '09-presupuesto');

  await page.goto('/app/patrimonio');
  await expect(page.getByText('Efectivo y débito')).toBeVisible();
  await page.getByRole('button', { name: /^P Pasivos/ }).click();
  await expect(page.getByText('Tarjetas')).toBeVisible();
  await expect(page.getByText('$20,100').first()).toBeVisible();
  await captura(page, '10-patrimonio');
});

test('el mismo estado de cuenta dos veces no se repite', async ({ page }, testInfo) => {
  const pdf = { name: 'repetido.pdf', mimeType: 'application/pdf', buffer: await crearPdfEstado({ ...CASOS[1], archivo: `${testInfo.project.name}-${CASOS[1].archivo}` }) };
  await page.goto('/app/importar');
  await page.getByTestId('input-archivos').setInputFiles(pdf);
  await expect(page.getByText('Este estado de cuenta ya está en tu cuenta.')).toBeVisible({ timeout: 30_000 });
});

test('archivo que no es PDF muestra el error y se puede quitar', async ({ page }) => {
  await page.goto('/app/importar');
  await page.getByTestId('input-archivos').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('no soy pdf') });
  await expect(page.getByText('Ese archivo no es un PDF.')).toBeVisible();
  await page.getByRole('button', { name: 'Quitar' }).click();
  await expect(page.getByTestId('lista-archivos')).toHaveCount(0);
});
