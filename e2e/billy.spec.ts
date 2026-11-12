import { expect, test } from '@playwright/test';
import { CASOS, crearPdfEstado } from '../scripts/qa-pdfs.mjs';

// Billy dentro de la app: siempre visible (Inicio, menú lateral y hoja "Más"), contesta de entrada y solo con cifras de la app.

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.post('/api/qa/reset');
});

test('sin cuentas: tarjeta en Inicio, entrada en el menú y Billy manda a subir el estado de cuenta', async ({ page }, testInfo) => {
  await page.goto('/app');
  const tarjeta = page.getByTestId('tarjeta-billy');
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta).toContainText('Conoce a Billy');
  if (testInfo.project.name === 'escritorio') {
    await expect(page.getByRole('complementary', { name: 'Menú principal' }).getByRole('link', { name: 'Billy' })).toBeVisible();
  } else {
    await page.getByRole('button', { name: 'Más' }).click();
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Billy' })).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await tarjeta.click();
  await expect(page).toHaveURL(/\/app\/billy/);
  const chat = page.getByRole('log', { name: 'Conversación con Billy' });
  await expect(chat).toContainText('Soy Billy');
  await expect(chat).toContainText('Todavía no tengo movimientos tuyos');
  await expect(chat.getByRole('link', { name: 'Subir estado de cuenta' })).toBeVisible();
});

test('con datos: contesta "cuánto me queda" de entrada con la misma cifra que Presupuesto', async ({ page, request }, testInfo) => {
  for (const c of CASOS) {
    const r = await request.post('/api/imports', { multipart: { modo: 'sync', archivo: { name: c.archivo, mimeType: 'application/pdf', buffer: await crearPdfEstado({ ...c, archivo: `${testInfo.project.name}-${c.archivo}` }) } } });
    const { importacion } = (await r.json()) as { importacion: { id: string } };
    await request.post('/api/imports/confirmar', { data: { items: [{ id: importacion.id }] } });
  }
  // Presupuesto (quincena) dice "Te quedan $X"; Billy debe decir exactamente esa X.
  await page.goto('/app/presupuesto');
  const linea = await page.getByText(/^Te quedan \$[\d,]+$/).first().textContent();
  const cifra = /\$[\d,]+/.exec(linea ?? '')?.[0];
  expect(cifra).toBeTruthy();

  await page.goto('/app');
  await expect(page.getByTestId('tarjeta-billy')).toContainText('Pregúntale a Billy');
  await page.goto('/app/billy');
  const chat = page.getByRole('log', { name: 'Conversación con Billy' });
  await expect(chat).toContainText('Soy Billy');
  await expect(chat).toContainText(cifra!);
  await expect(chat.getByRole('link', { name: 'Subir estado de cuenta' })).toHaveCount(0);

  // Una pregunta escrita también se contesta con cifras de la app.
  await page.getByLabel('Tu pregunta para Billy').fill('¿Cuánto pago de suscripciones?');
  await page.getByRole('button', { name: 'Enviar pregunta' }).click();
  await expect(chat).toContainText(/Pagas \$[\d,]+ al mes|No encontré suscripciones/, { timeout: 15_000 });
});
