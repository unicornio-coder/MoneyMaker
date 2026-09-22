// Precisión de la lectura de estados de cuenta: compara cada PDF de qa/entregables/estados con su .json esperado
// y deja la tabla "campo del PDF → esperado → detectado" en qa/reportes/. Se corre con `npm run qa:precision`.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Esperado } from '../scripts/qa-pdfs.mjs';
import { extraerArchivo } from '@/lib/services/ingestion';
import { categorizar, hashMovimiento } from '@/lib/domain/categorizar';
import { detectarRecurrentes } from '@/lib/domain/recurrentes';
import { detectarDiasPago } from '@/lib/domain/nomina';
import { indexarRepetidos } from '@/lib/domain/dedupe';
import { aPesos, formatearCentavos } from '@/lib/domain/money';
import { hayLLM } from '@/lib/services/llm';
import type { Movimiento } from '@/lib/domain/tipos';

const DIR = 'qa/entregables/estados';
const REPORTES = 'qa/reportes';

type Fila = { campo: string; esperado: string; detectado: string; ok: boolean };

const f = (v: unknown) => (v == null ? '—' : String(v));
const dinero = (c: number | null) => (c == null ? '—' : formatearCentavos(c));

async function evaluar(nombre: string, esperado: Esperado): Promise<{ filas: Fila[]; movs: { esperados: number; detectados: number; iguales: number; categoriasOk: number; categoriasTotal: number }; sus: { esperadas: string[]; detectadas: string[] }; msi: { esperados: string[]; detectados: string[] }; nomina: { esperada: string; detectada: string; ok: boolean } }> {
  const datos = await readFile(path.join(DIR, nombre));
  const r = await extraerArchivo({ nombre, datos, contraseña: /_pass-(\w+)\.pdf$/i.exec(nombre)?.[1] ?? null });
  const s = r.resumen;
  const filas: Fila[] = [
    ['Institución', f(esperado.institucion), f(s.institucion)],
    ['Tipo', f(esperado.tipoCuenta), f(s.tipoCuenta)],
    ['Últimos 4', f(esperado.ultimos4), f(s.ultimos4)],
    ['Periodo inicio', f(esperado.periodoInicio), f(s.periodoInicio)],
    ['Periodo fin', f(esperado.periodoFin), f(s.periodoFin)],
    ['Fecha de corte', f(esperado.fechaCorte), f(s.fechaCorte)],
    ['Fecha límite de pago', f(esperado.fechaLimitePago), f(s.fechaLimitePago)],
    ['Pago mínimo', dinero(esperado.pagoMinimoCentavos), dinero(s.pagoMinimoCentavos)],
    ['Límite de crédito', dinero(esperado.limiteCreditoCentavos), dinero(s.limiteCreditoCentavos)],
    ['Saldo al corte', dinero(esperado.saldoAlCorteCentavos), dinero(s.saldoAlCorteCentavos)],
    ['Total de cargos', dinero(esperado.totalCargosCentavos), dinero(s.totalCargosCentavos)],
    ['Total de abonos', dinero(esperado.totalAbonosCentavos), dinero(s.totalAbonosCentavos)],
  ].map(([campo, e, d]) => ({ campo, esperado: e, detectado: d, ok: e === d }));

  // Movimientos: mismo día y mismo monto (la descripción puede variar en espacios).
  const clave = (m: { fecha: string; montoCentavos: number; esAbono: boolean }) => `${m.fecha}|${m.montoCentavos}|${m.esAbono ? 'A' : 'C'}`;
  const restantes = new Map<string, number>();
  for (const m of esperado.movimientos) restantes.set(clave(m), (restantes.get(clave(m)) ?? 0) + 1);
  let iguales = 0;
  for (const m of r.movimientos) {
    const k = clave(m);
    const n = restantes.get(k) ?? 0;
    if (n > 0) {
      iguales++;
      restantes.set(k, n - 1);
    }
  }

  // Categorías: se categoriza como en la ingesta (reglas + catálogo, sin LLM) y se compara con la esperada.
  const tipoCuenta = s.tipoCuenta ?? esperado.tipoCuenta ?? 'debito';
  let categoriasOk = 0;
  let categoriasTotal = 0;
  const movsDominio: Movimiento[] = [];
  for (const m of indexarRepetidos(r.movimientos)) {
    const cat = categorizar({ fecha: m.fecha, descripcion: m.descripcion, monto: aPesos(m.montoCentavos), esAbono: m.esAbono, esPosibleSuscripcion: m.esPosibleSuscripcion, msi: m.msi ?? null }, tipoCuenta);
    const esp = esperado.movimientos.find((e) => clave(e) === clave(m) && e.descripcion.replace(/\s+/g, ' ').toUpperCase() === m.descripcion.replace(/\s+/g, ' ').toUpperCase());
    if (esp?.categoriaEsperada) {
      categoriasTotal++;
      if (esp.categoriaEsperada === cat.categoriaId) categoriasOk++;
    }
    movsDominio.push({ id: `${nombre}-${movsDominio.length}`, cuentaId: 'c', fecha: m.fecha, descripcionRaw: m.descripcion, comercio: cat.comercio, comercioDominio: cat.comercioDominio, monto: aPesos(m.montoCentavos), tipo: cat.tipo, categoriaId: cat.categoriaId, categoriaFuente: cat.categoriaFuente, esMsi: cat.esMsi, msiCuota: cat.msiCuota, msiTotal: cat.msiTotal, fuente: 'import', hash: hashMovimiento('c', m.fecha, m.descripcion, aPesos(m.montoCentavos), m.esAbono, m.repeticion) });
  }
  const recs = detectarRecurrentes(movsDominio);
  const sus = { esperadas: esperado.suscripcionesEsperadas, detectadas: recs.filter((x) => x.tipo === 'suscripcion').map((x) => x.nombre) };
  const msi = { esperados: esperado.msiEsperados.map((x) => `${x.comercio} ${x.cuota}/${x.total}`), detectados: recs.filter((x) => x.tipo === 'msi').map((x) => `${x.nombre} ${x.msiCuotasPagadas}/${x.msiCuotasTotal}`) };
  const dias = detectarDiasPago(movsDominio);
  const nomina = { esperada: esperado.nomina ? `días ${esperado.nomina.diasQuincena.join(' y ')}` : '—', detectada: dias ? `días ${dias.dias.join(' y ')}` : '—', ok: (esperado.nomina?.diasQuincena.join(',') ?? '') === (dias?.dias.join(',') ?? '') };

  return { filas, movs: { esperados: esperado.movimientos.length, detectados: r.movimientos.length, iguales, categoriasOk, categoriasTotal }, sus, msi, nomina };
}

describe('precisión de lectura de estados de cuenta', () => {
  it('genera el reporte', async () => {
    const archivos = (await readdir(DIR)).filter((a) => a.toLowerCase().endsWith('.pdf')).sort();
    const pares: { pdf: string; esperado: Esperado }[] = [];
    for (const pdf of archivos) {
      try {
        pares.push({ pdf, esperado: JSON.parse(await readFile(path.join(DIR, pdf.replace(/\.pdf$/i, '.json')), 'utf8')) as Esperado });
      } catch {
        // sin .json esperado no se puede medir
      }
    }
    expect(pares.length, 'No hay PDFs con .json esperado en qa/entregables/estados').toBeGreaterThan(0);

    const fecha = new Date().toISOString().slice(0, 10);
    const modo = hayLLM() ? `modelo ${process.env.ANTHROPIC_MODEL || 'claude-opus-5'}` : 'reglas (sin ANTHROPIC_API_KEY)';
    const md: string[] = [`# Precisión de lectura · ${fecha}`, '', `Método: ${modo}. Archivos: ${pares.length}. Generado por \`npm run qa:precision\`.`, ''];
    let camposOk = 0;
    let camposTotal = 0;
    let movIguales = 0;
    let movEsperados = 0;
    let catOk = 0;
    let catTotal = 0;

    for (const { pdf, esperado } of pares) {
      const t0 = Date.now();
      const r = await evaluar(pdf, esperado);
      const ok = r.filas.filter((x) => x.ok).length;
      camposOk += ok;
      camposTotal += r.filas.length;
      movIguales += r.movs.iguales;
      movEsperados += r.movs.esperados;
      catOk += r.movs.categoriasOk;
      catTotal += r.movs.categoriasTotal;
      md.push(`## ${pdf}`, '', `Campos del resumen: ${ok}/${r.filas.length} · Movimientos: ${r.movs.iguales}/${r.movs.esperados} (detectados ${r.movs.detectados}) · Categorías: ${r.movs.categoriasOk}/${r.movs.categoriasTotal} · ${((Date.now() - t0) / 1000).toFixed(1)} s`, '', '| Campo del PDF | Esperado | Detectado | |', '|---|---|---|---|');
      for (const x of r.filas) md.push(`| ${x.campo} | ${x.esperado} | ${x.detectado} | ${x.ok ? 'ok' : 'NO'} |`);
      md.push(`| Suscripciones | ${r.sus.esperadas.join(', ') || '—'} | ${r.sus.detectadas.join(', ') || '—'} | ${r.sus.esperadas.every((s) => r.sus.detectadas.includes(s)) ? 'ok' : 'NO'} |`);
      md.push(`| MSI | ${r.msi.esperados.join(', ') || '—'} | ${r.msi.detectados.join(', ') || '—'} | ${r.msi.esperados.every((s) => r.msi.detectados.includes(s)) ? 'ok' : 'NO'} |`);
      md.push(`| Nómina / quincena | ${r.nomina.esperada} | ${r.nomina.detectada} | ${r.nomina.ok ? 'ok' : 'NO'} |`, '');
    }
    const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : '—');
    md.splice(3, 0, `**Resumen:** campos ${pct(camposOk, camposTotal)} (${camposOk}/${camposTotal}) · movimientos ${pct(movIguales, movEsperados)} (${movIguales}/${movEsperados}) · categorías ${pct(catOk, catTotal)} (${catOk}/${catTotal}). Meta: ≥ 95 % de filas leídas, ≥ 80 % bien categorizadas.`, '');

    await mkdir(REPORTES, { recursive: true });
    const ruta = path.join(REPORTES, `precision-${fecha}.md`);
    await writeFile(ruta, md.join('\n') + '\n');
    console.log(`Reporte: ${ruta}\n` + md.slice(0, 5).join('\n'));
    expect(movEsperados).toBeGreaterThan(0);
  });
});
