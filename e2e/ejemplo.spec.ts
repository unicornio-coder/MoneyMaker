import { expect, test } from '@playwright/test';

// El camino de quien prueba la app sin un estado de cuenta propio: un toque en un ejemplo y se lee completo.
// Es lo primero que hace el evaluador; si se rompe, la app "no sirve" aunque todo lo demás funcione.

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await request.post('/api/qa/reset');
});

test('un ejemplo en un toque desde Importar queda listo para revisar', async ({ page }) => {
  await page.goto('/app/importar');
  const ejemplos = page.getByTestId('ejemplos-rapidos');
  await expect(ejemplos).toBeVisible();
  await ejemplos.getByRole('button', { name: /Cuenta de nómina/ }).click();
  const lista = page.getByTestId('lista-archivos');
  await expect(lista.locator('li')).toHaveCount(1);
  await expect(lista.locator('li[data-estado="revisar"]')).toHaveCount(1, { timeout: 60_000 });
  // Con un archivo en la lista, los ejemplos se quitan para no distraer.
  await expect(page.getByTestId('ejemplos-rapidos')).toHaveCount(0);
});
