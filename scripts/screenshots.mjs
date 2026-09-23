// Capturas de referencia de todas las pantallas a 390 px (móvil) y 1440 px (escritorio).
// Uso: npm run capturas -- [carpeta]   (por defecto docs/capturas/<fecha>)
// Requiere la app corriendo en BASE_URL (por defecto http://localhost:3100, modo mock). Con SEED=1 carga 3 estados de prueba.
// Chromium: PW_CHROMIUM_PATH si Playwright no encuentra el navegador.

import { mkdir } from 'node:fs/promises';
import { chromium, request as pwRequest } from '@playwright/test';
import { CASOS, crearPdfEstado } from './qa-pdfs.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const carpeta = process.argv[2] ?? `docs/capturas/${new Date().toISOString().slice(0, 10)}`;
const VISTAS = [
  { nombre: 'movil', width: 390, height: 844, mobile: true },
  { nombre: 'escritorio', width: 1440, height: 900, mobile: false },
];
const RUTAS = [
  ['landing', '/'],
  ['login', '/login'],
  ['registro', '/registro'],
  ['onboarding', '/onboarding'],
  ['inicio', '/app'],
  ['gastos', '/app/gastos'],
  ['fijos', '/app/fijos'],
  ['presupuesto', '/app/presupuesto'],
  ['patrimonio', '/app/patrimonio'],
  ['inversiones', '/app/inversiones'],
  ['insights', '/app/insights'],
  ['objetivos', '/app/objetivos'],
  ['importar', '/app/importar'],
  ['planes', '/app/planes'],
  ['ajustes', '/app/ajustes'],
  ['marcas', '/app/dev/brands'],
];

async function sembrar() {
  const api = await pwRequest.newContext({ baseURL: BASE });
  await api.post('/api/qa/reset');
  for (const c of CASOS) {
    const r = await api.post('/api/imports', { multipart: { modo: 'sync', archivo: { name: c.archivo, mimeType: 'application/pdf', buffer: await crearPdfEstado(c) } } });
    const { importacion } = await r.json();
    await api.post('/api/imports/confirmar', { data: { items: [{ id: importacion.id }] } });
  }
  await api.dispose();
}

async function main() {
  await mkdir(carpeta, { recursive: true });
  if (process.env.SEED) await sembrar();
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
  try {
    for (const vista of VISTAS) {
      const ctx = await browser.newContext({ viewport: { width: vista.width, height: vista.height }, isMobile: vista.mobile, deviceScaleFactor: 1, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
      const page = await ctx.newPage();
      for (const [nombre, ruta] of RUTAS) {
        try {
          await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle', timeout: 60_000 });
          // Recorre la página para que los bloques que aparecen al hacer scroll queden visibles en la captura completa.
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 500) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 50));
            }
            window.scrollTo(0, 0);
          });
          await page.waitForTimeout(900);
          await page.screenshot({ path: `${carpeta}/${vista.nombre}-${nombre}.png`, fullPage: true, animations: 'disabled' });
          console.log(`ok  ${vista.nombre.padEnd(10)} ${nombre}`);
        } catch (e) {
          console.log(`err ${vista.nombre.padEnd(10)} ${nombre}: ${e instanceof Error ? e.message.split('\n')[0] : e}`);
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`Capturas en ${carpeta}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
