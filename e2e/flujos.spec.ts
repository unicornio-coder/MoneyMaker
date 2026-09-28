import { expect, test } from '@playwright/test';
import { CASOS, crearPdfEstado } from '../scripts/qa-pdfs.mjs';

// Onboarding de 4 pasos y flujo de cancelación (guiada y "por mí"). Modo demo sin llaves.

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.post('/api/qa/reset');
});

test('onboarding: cuenta, metas y conectar', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: 'Bienvenido a MoneyMaker' })).toBeVisible();
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  const nombre = page.getByLabel('Tu nombre');
  await nombre.fill('');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Escribe tu nombre.')).toBeVisible();
  await nombre.fill('Juan Carlos Ostos');
  // La contraseña es opcional, pero si se escribe debe tener 8 caracteres.
  await page.getByLabel('Contraseña (opcional)').fill('corta');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('La contraseña necesita al menos 8 caracteres.')).toBeVisible();
  await page.getByLabel('Contraseña (opcional)').fill('');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: '¿Qué quieres lograr?' })).toBeVisible();
  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Elige al menos una meta' })).toBeDisabled();
  await page.getByRole('button', { name: /Ahorrar cada quincena/ }).click();
  await page.getByRole('button', { name: /Controlar suscripciones/ }).click();
  await expect(page.getByRole('button', { name: /Ahorrar cada quincena/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Conecta tu dinero' })).toBeVisible();
  await expect(page.getByText('Paso 3 de 3')).toBeVisible();
  // Sin "saltar": las dos únicas salidas son conectar un banco o subir un PDF.
  await expect(page.getByRole('button', { name: /Ver mi panel/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Conectar mi banco/ }).click();
  await expect(page.getByRole('dialog').filter({ hasText: 'Vincular banco' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /Subir estado de cuenta/ }).click();
  await expect(page).toHaveURL(/\/app\/importar/);

  // El nombre quedó guardado en Ajustes.
  await page.goto('/app/ajustes');
  await expect(page.getByText('Juan Carlos Ostos').first()).toBeVisible();
});

test('cancelar una suscripción: guiada y por mí', async ({ page, request }, testInfo) => {
  for (const c of CASOS) {
    const r = await request.post('/api/imports', { multipart: { modo: 'sync', archivo: { name: c.archivo, mimeType: 'application/pdf', buffer: await crearPdfEstado({ ...c, archivo: `${testInfo.project.name}-${c.archivo}` }) } } });
    const { importacion } = (await r.json()) as { importacion: { id: string } };
    await request.post('/api/imports/confirmar', { data: { items: [{ id: importacion.id }] } });
  }

  await page.goto('/app/fijos');
  await expect(page.getByText('Suscripciones y cargos fijos al mes')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar una suscripción' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('¿Qué quieres cancelar?')).toBeVisible();
  await expect(modal.getByText('Tus suscripciones')).toBeVisible();

  // Guiada: Netflix tiene enlace directo y pasos; "Ya la cancelé" la deja de contar.
  await modal.getByRole('button', { name: /Netflix/ }).click();
  await expect(modal.getByText('Mandamos la carta por ti')).toBeVisible();
  const enlace = modal.getByRole('link', { name: /Ir directo a cancelar/ });
  await expect(enlace).toHaveAttribute('href', /netflix\.com/);
  await expect(enlace).toHaveAttribute('target', '_blank');
  await modal.getByRole('button', { name: 'Ya la cancelé' }).click();
  await expect(modal.getByRole('heading', { name: 'Listo' })).toBeVisible();
  await expect(modal.getByText(/Ahorras \$[\d,]+ al año/)).toBeVisible();
  await modal.getByRole('button', { name: 'Cerrar', exact: true }).filter({ hasText: 'Cerrar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('li', { hasText: 'Netflix' })).toHaveCount(0);

  // Por mí: solo pide el correo del servicio (opcional) y la autorización.
  await page.getByRole('button', { name: 'Cancelar una suscripción' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Spotify/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mandar carta por correo' }).click();
  await expect(page.getByRole('dialog').getByText('Cancelar Spotify por ti')).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('Nombre en la cuenta')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Mandar carta' }).click();
  await expect(page.getByRole('dialog').getByText('Marca la autorización')).toBeVisible();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Mandar carta' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Solicitud recibida' })).toBeVisible();
  // La carta de cancelación se descarga como PDF con los datos del perfil.
  const carta = page.getByRole('dialog').getByRole('link', { name: /Descargar carta de cancelación/ });
  await expect(carta).toHaveAttribute('href', /\/api\/cancelacion\/carta\?recurrente=.+/);
  const pdf = await request.get((await carta.getAttribute('href'))!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  expect(pdf.headers()['content-disposition']).toContain('cancelacion-spotify.pdf');
});
