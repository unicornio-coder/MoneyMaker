import { expect, test } from '@playwright/test';
import { CASOS, crearPdfEstado } from '../scripts/qa-pdfs.mjs';

// Billy dentro de la app: siempre visible (Inicio, menú lateral y hoja "Más"), contesta de entrada y solo con cifras de la app.

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.post('/api/qa/reset');
});

test('sin cuentas: tarjeta en Inicio, entrada en el menú y Billy manda a subir el estado de cuenta', async ({ page }, testInfo) => {
  await page.goto('/app');
  const tarjeta = page.locator('[data-testid="tarjeta-billy"]:visible');
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
  // El estado de cuenta se sube ahí mismo: botón que abre el selector, ejemplos de un toque y el clip del compositor.
  await expect(chat.getByRole('button', { name: 'Subir estado de cuenta' })).toBeVisible();
  await expect(chat.getByTestId('ejemplos-rapidos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adjuntar estado de cuenta' })).toBeVisible();
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
  await expect(page.locator('[data-testid="tarjeta-billy"]:visible')).toContainText('Pregúntale a Billy');
  await page.goto('/app/billy');
  const chat = page.getByRole('log', { name: 'Conversación con Billy' });
  await expect(chat).toContainText('Soy Billy');
  await expect(chat).toContainText(cifra!);
  await expect(chat.getByRole('button', { name: 'Subir estado de cuenta' })).toHaveCount(0);

  // Una pregunta escrita también se contesta con cifras de la app.
  await page.getByLabel('Tu pregunta para Billy').fill('¿Cuánto pago de suscripciones?');
  await page.getByRole('button', { name: 'Enviar pregunta' }).click();
  await expect(chat).toContainText(/Pagas \$[\d,]+ al mes|No encontré suscripciones/, { timeout: 15_000 });
});

test('sube un PDF desde el chat: Billy dice lo que encontró y al guardar contesta con una cifra', async ({ page }, testInfo) => {
  // Otro plástico (últimos 4 distintos) para que no choque con los estados ya guardados en la prueba anterior.
  const base = CASOS[2];
  const caso = { ...base, ultimos4: '0042', archivo: `${testInfo.project.name}-chat-${base.archivo}` };
  const buffer = await crearPdfEstado(caso);

  await page.goto('/app/billy');
  const chat = page.getByRole('log', { name: 'Conversación con Billy' });
  await expect(chat).toContainText('Soy Billy');
  await page.getByTestId('billy-archivo').setInputFiles({ name: caso.archivo, mimeType: 'application/pdf', buffer });

  // El archivo aparece como mensaje tuyo y Billy lo lee en su tarjeta.
  await expect(chat).toContainText(caso.archivo);
  const tarjeta = chat.getByTestId('billy-lectura');
  await expect(tarjeta).toHaveAttribute('data-estado', 'revisar', { timeout: 60_000 });
  await expect(tarjeta).toContainText('Banorte');
  await expect(tarjeta).toContainText('•••• 0042');
  await expect(tarjeta).toContainText('Periodo');
  await expect(tarjeta.locator('dd').nth(1)).toHaveText(String(caso.movimientos.length));
  await expect(tarjeta.getByRole('link', { name: 'Revisar en Importar' })).toHaveAttribute('href', '/app/importar');

  await tarjeta.getByRole('button', { name: 'Guardar' }).click();
  await expect(tarjeta).toHaveAttribute('data-estado', 'guardado', { timeout: 60_000 });
  await expect(chat).toContainText(/Listo, ya está en tu cuenta: \d+ movimientos? nuevos?/);
  // Billy contesta solo "¿Cuánto me queda?" con las cifras nuevas.
  await expect(chat.locator('[data-etiqueta="Con tus cifras nuevas"]')).toContainText(/\$[\d,]+/, { timeout: 20_000 });
});

test('un archivo que no es estado de cuenta se rechaza en el chat con el mismo texto que Importar', async ({ page }) => {
  await page.goto('/app/billy');
  const chat = page.getByRole('log', { name: 'Conversación con Billy' });
  await page.getByTestId('billy-archivo').setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('no es un pdf') });
  await expect(chat).toContainText('No pudimos leer ese tipo de archivo');
  await expect(chat.getByTestId('billy-lectura')).toHaveCount(0);
});
