import { expect, test } from '@playwright/test';
import { CASOS, crearPdfEstado } from '../scripts/qa-pdfs.mjs';

// Onboarding de 4 pasos y flujo de cancelación (guiada y "por mí"). Modo demo sin llaves.

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.post('/api/qa/reset');
});

test('acceso: una sola pantalla con correo, contraseña y "Continuar"', async ({ page }) => {
  // /registro ya no es otra pantalla: llega a /login con el correo que traía (la portada lo manda así).
  await page.goto('/registro?email=ana%40correo.mx');
  await expect(page).toHaveURL(/\/login\?email=ana%40correo\.mx$/);
  await expect(page.getByRole('heading', { name: 'Entra o crea tu cuenta' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Acceso' })).toHaveCount(0);
  await expect(page.getByLabel('Correo')).toHaveValue('ana@correo.mx');
  await expect(page.getByLabel('¿Cómo te llamas?')).toHaveCount(0);

  // Ver u ocultar la contraseña.
  const password = page.getByLabel('Contraseña', { exact: true });
  await password.fill('secreta123');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'password');

  // Errores en línea, junto al campo, y se ocultan al corregir.
  await page.getByLabel('Correo').fill('ana@');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Escribe un correo válido.')).toBeVisible();
  await expect(page.getByLabel('Correo')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Correo').fill('ana@correo.mx');
  await expect(page.getByText('Escribe un correo válido.')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Olvidé mi contraseña' })).toHaveAttribute('href', '/recuperar');

  // En demo no hay Auth real: "Continuar" entra directo al panel.
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test('onboarding: cuenta, metas y conectar', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: 'Te damos la bienvenida a MoneyMaker' })).toBeVisible();
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

  await expect(page.getByRole('heading', { name: 'Sube tu estado de cuenta', exact: true })).toBeVisible();
  await expect(page.getByText('Paso 3 de 3')).toBeVisible();
  // Sin "saltar" y sin conectar banco: la única salida es subir un estado de cuenta.
  await expect(page.getByRole('button', { name: /Ver mi panel/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Conectar mi banco/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Subir estado de cuenta/ })).toBeVisible();
  // Quien no trae un estado de cuenta a la mano puede descargar uno de ejemplo desde aquí mismo.
  const ejemplo = page.getByTestId('onboarding-ejemplos').getByRole('link', { name: 'cuenta de nómina' });
  await expect(ejemplo).toBeVisible();
  const respuesta = await page.request.get((await ejemplo.getAttribute('href'))!);
  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()['content-type']).toContain('pdf');
  // El archivo elegido aquí viaja a la pantalla de importar y se empieza a leer ahí mismo.
  await page.getByTestId('onboarding-archivo').setInputFiles({ name: 'estado.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 prueba') });
  await expect(page).toHaveURL(/\/app\/importar/);
  await expect(page.getByTestId('lista-archivos').locator('li')).toHaveCount(1);

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

test('ayuda: preguntas y reporte de problema sin humanos', async ({ page }) => {
  await page.goto('/app/ayuda');
  await expect(page.getByRole('heading', { name: 'Preguntas frecuentes' })).toBeVisible();
  const pregunta = page.getByRole('button', { name: '¿Cómo cancelo una suscripción?' });
  await pregunta.click();
  await expect(pregunta).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(/Mandar carta por correo/)).toBeVisible();

  // Validación: el reporte necesita asunto y detalle.
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(page.getByTestId('error-reporte')).toContainText('qué pasó');
  await page.getByLabel('Qué pasó, en pocas palabras').fill('No se leyó mi PDF');
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(page.getByTestId('error-reporte')).toContainText('Cuéntanos un poco más');
  await page.getByLabel('Cuéntanos más').fill('Subí el estado de cuenta de agosto y se quedó en leyendo.');
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  // Sin token ni Resend en demo, queda registrado.
  await expect(page.getByRole('status').filter({ hasText: 'Recibido' })).toBeVisible();
});
