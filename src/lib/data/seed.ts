// Siembra del usuario demo (modo mock): pasa por el mismo pipeline que un usuario real
// (conectar link → cuentas → ingesta → recurrentes → insights) para ejercitar el código de verdad.

import type { Repo } from './repo';
import { conectarLink } from '@/lib/services/conectar';
import { ingerirMovimientos } from '@/lib/services/ingest';
import { activosMock, objetivosMock, pasivosMock } from '@/lib/mock/patrimonio';
import { USUARIO_DEMO } from '@/lib/auth/session';

const g = globalThis as unknown as { __mmSeed?: Map<string, Promise<void>> };
const enCurso = (g.__mmSeed ??= new Map());

export async function asegurarDemo(repo: Repo, userId: string): Promise<void> {
  const perfil = await repo.perfil(userId);
  if (perfil) return;
  const existente = enCurso.get(userId);
  if (existente) return existente;
  const p = sembrar(repo, userId).finally(() => enCurso.delete(userId));
  enCurso.set(userId, p);
  return p;
}

async function sembrar(repo: Repo, userId: string) {
  // MOCK_SIN_DEMO=true: usuario demo vacío (para probar el flujo "primer estado de cuenta" y las pruebas E2E).
  if (process.env.MOCK_SIN_DEMO === 'true') {
    await repo.guardarPerfil(userId, { email: USUARIO_DEMO.email, nombre: USUARIO_DEMO.nombre, diasPago: [5, 20], onboardingCompleto: true });
    return;
  }
  await repo.guardarPerfil(userId, { email: USUARIO_DEMO.email, nombre: USUARIO_DEMO.nombre, diasPago: [5, 20], ingresoQuincenal: 14500, metas: ['ahorrar', 'deudas', 'invertir'], onboardingCompleto: true });

  for (const [id, nombre] of [['nu_mx_retail', 'Nu'], ['amex_mx_retail', 'Amex'], ['coppel_mx_retail', 'Coppel'], ['bbva_mx_retail', 'BBVA'], ['bitso', 'Bitso'], ['gbm', 'GBM+']]) {
    await conectarLink(repo, userId, id, nombre, 4);
  }

  const efectivo = await repo.guardarCuenta(userId, { nombre: 'Efectivo', banco: 'Efectivo', bancoDominio: null, tipo: 'efectivo', saldo: 1200, color: '#16A34A', activo: true });
  const hoy = new Date();
  const iso = (d: number) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - d).toISOString().slice(0, 10);
  await ingerirMovimientos(repo, userId, efectivo, [
    { fecha: iso(0), descripcion: 'Tacos al pastor', monto: 120, esAbono: false },
    { fecha: iso(2), descripcion: 'Propina', monto: 50, esAbono: false },
    { fecha: iso(5), descripcion: 'Tianguis', monto: 340, esAbono: false },
  ], 'manual');

  const cuentas = await repo.cuentas(userId);
  const porExternal = (ext: string) => (cuentas as (typeof cuentas[number] & { externalId?: string | null })[]).find((c) => c.externalId === ext)?.id ?? null;
  for (const a of activosMock) await repo.guardarActivo(userId, { ...a, cuentaId: a.cuentaId ? porExternal(a.cuentaId) : null });
  for (const p of pasivosMock) await repo.guardarPasivo(userId, { ...p, cuentaId: p.cuentaId ? porExternal(p.cuentaId) : null });
  for (const o of objetivosMock) await repo.guardarObjetivo(userId, { ...o, cuentaId: o.cuentaId ? porExternal(o.cuentaId) : null });
}
