import { expect, test } from '@playwright/test';
import { CASOS, crearPdfEstado } from '../scripts/qa-pdfs.mjs';

// Onboarding de 4 pasos y flujo de cancelación (guiada y "por mí"). Modo demo sin llaves.

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.post('/api/qa/reset');
});

test('onboarding: metas, quincena, plan y primer PDF', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: '¿Qué quieres lograr?' })).toBeVisible();
  await expect(page.getByText('Paso 1 de 4')).toBeVisible();
  // Sin meta no se puede continuar.
  await expect(page.getByRole('button', { name: 'Elige al menos una meta' })).toBeDisabled();
  // El nombre solo se pide cuando no lo tenemos (en demo ya viene).
  const nombre = page.getByLabel('¿Cómo te llamas?');
  if (await nombre.isVisible()) await nombre.fill('Juan Carlos Ostos');
  await page.getByRole('button', { name: /Ahorrar cada quincena/ }).click();
  await page.getByRole('button', { name: /Controlar suscripciones/ }).click();
  await expect(page.getByRole('button', { name: /Ahorrar cada quincena/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: '¿Cuándo te pagan?' })).toBeVisible();
  await expect(page.getByText('Paso 2 de 4')).toBeVisible();
  // Días por defecto 5 y 20; los cambiamos a 15 y 30.
  await expect(page.getByText('Tu quincena empieza los días 5 y 20.')).toBeVisible();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: '20', exact: true }).click();
  await expect(page.getByText('Elige al menos un día.')).toBeVisible();
  await page.getByRole('button', { name: '15', exact: true }).click();
  await page.getByRole('button', { name: '30', exact: true }).click();
  await expect(page.getByText('Tu quincena empieza los días 15 y 30.')).toBeVisible();
  await page.getByLabel(/¿Cuánto recibes cada quincena/).fill('14500');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: '7 días gratis. Sin tarjeta.' })).toBeVisible();
  await expect(page.getByText('Menos de $9 al día. Una suscripción olvidada cuesta más.')).toBeVisible();
  await page.getByRole('button', { name: 'Empezar 7 días gratis' }).click();

  await expect(page.getByRole('heading', { name: 'Sube tu primer estado de cuenta' })).toBeVisible();
  await expect(page.getByText('Paso 4 de 4')).toBeVisible();
  // "Atrás" regresa al plan y vuelve a avanzar.
  await page.getByRole('button', { name: 'Atrás' }).click();
  await expect(page.getByRole('heading', { name: '7 días gratis. Sin tarjeta.' })).toBeVisible();
  await page.getByRole('button', { name: 'Empezar 7 días gratis' }).click();
  await page.getByRole('button', { name: 'Subir estado de cuenta' }).click();
  await expect(page).toHaveURL(/\/app\/importar/);

  // Lo guardado se refleja en Ajustes: días de pago e ingreso.
  await page.goto('/app/ajustes');
  await page.getByRole('button', { name: /^Perfil/ }).click();
  await expect(page.getByRole('button', { name: '15', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '5', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('cancelar una suscripción: guiada y por mí', async ({ page, request }, testInfo) => {
  for (const c of CASOS) {
    const r = await request.post('/api/imports', { multipart: { modo: 'sync', archivo: { name: c.archivo, mimeType: 'application/pdf', buffer: await crearPdfEstado({ ...c, archivo: `${testInfo.project.name}-${c.archivo}` }) } } });
    const { importacion } = (await r.json()) as { importacion: { id: string } };
    await request.post('/api/imports/confirmar', { data: { items: [{ id: importacion.id }] } });
  }

  await page.goto('/app/fijos');
  await expect(page.getByText('Cargos fijos al mes')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar una suscripción' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('¿Qué quieres cancelar?')).toBeVisible();
  await expect(modal.getByText('Tus suscripciones')).toBeVisible();

  // Guiada: Netflix tiene enlace directo y pasos; "Ya la cancelé" la deja de contar.
  await modal.getByRole('button', { name: /Netflix/ }).click();
  await expect(modal.getByText('Podemos cancelarla por ti')).toBeVisible();
  const enlace = modal.getByRole('link', { name: /Ir directo a cancelar/ });
  await expect(enlace).toHaveAttribute('href', /netflix\.com/);
  await expect(enlace).toHaveAttribute('target', '_blank');
  await modal.getByRole('button', { name: 'Ya la cancelé' }).click();
  await expect(modal.getByRole('heading', { name: 'Listo' })).toBeVisible();
  await expect(modal.getByText(/Ahorras \$[\d,]+ al año/)).toBeVisible();
  await modal.getByRole('button', { name: 'Cerrar', exact: true }).filter({ hasText: 'Cerrar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('li', { hasText: 'Netflix' })).toHaveCount(0);

  // Por mí: el formulario exige nombre, correo y autorización.
  await page.getByRole('button', { name: 'Cancelar una suscripción' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Spotify/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar por mí' }).click();
  await expect(page.getByRole('dialog').getByText('Cancelar Spotify por ti')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByRole('dialog').getByText('Escribe el nombre y el correo')).toBeVisible();
  await page.getByRole('dialog').getByLabel('Nombre en la cuenta').fill('Juan Carlos');
  await page.getByRole('dialog').getByLabel('Correo de la cuenta').fill('jc@billup.mx');
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByRole('dialog').getByText('Necesitamos tu autorización')).toBeVisible();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Solicitud recibida' })).toBeVisible();
  // La carta de cancelación se descarga como PDF con los datos del formulario.
  const carta = page.getByRole('dialog').getByRole('link', { name: /Descargar carta de cancelación/ });
  await expect(carta).toHaveAttribute('href', /\/api\/cancelacion\/carta\?recurrente=.+&nombre=Juan\+Carlos&correo=jc%40billup\.mx/);
  const pdf = await request.get((await carta.getAttribute('href'))!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  expect(pdf.headers()['content-disposition']).toContain('cancelacion-spotify.pdf');
});
