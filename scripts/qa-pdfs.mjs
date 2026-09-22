// Genera estados de cuenta ficticios en PDF (texto plano, sin logos) para pruebas locales y E2E.
// Uso: `npm run qa:pdfs` → qa/entregables/estados/provisional-*.pdf. También lo importan las pruebas.
// Son provisionales: los 15 casos reales los entrega Cowork (talacha T-003).

import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const PIE = 'DOCUMENTO DE PRUEBA · Bill Up';

function dinero(centavos) {
  const abs = Math.abs(centavos);
  const pesos = Math.floor(abs / 100).toLocaleString('en-US');
  return `${centavos < 0 ? '-' : ''}$${pesos}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * spec: { banco, tipo: 'credito'|'debito', producto, ultimos4, periodoInicio, periodoFin, fechaCorte, fechaLimite,
 *         pagoMinimo, saldoAlCorte, limite, movimientos: [{ fecha: 'dd/mm/yyyy', descripcion, centavos, abono }] }
 */
export async function crearPdfEstado(spec) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([612, 792]);
  let y = 750;
  const linea = (texto, opts = {}) => {
    if (y < 60) {
      page.drawText(PIE, { x: 50, y: 30, size: 8, font });
      page = doc.addPage([612, 792]);
      y = 750;
    }
    page.drawText(texto, { x: opts.x ?? 50, y, size: opts.size ?? 10, font: opts.bold ? bold : font });
    if (!opts.mismaLinea) y -= opts.salto ?? 16;
  };
  const cargos = spec.movimientos.filter((m) => !m.abono).reduce((s, m) => s + m.centavos, 0);
  const abonos = spec.movimientos.filter((m) => m.abono).reduce((s, m) => s + m.centavos, 0);

  linea(`ESTADO DE CUENTA ${spec.banco.toUpperCase()}`, { bold: true, size: 14, salto: 22 });
  linea(spec.tipo === 'credito' ? `Tarjeta de Crédito ${spec.producto}` : `Cuenta de Nómina ${spec.producto}`, { bold: true });
  linea(`Titular: PERSONA DE PRUEBA`);
  linea(`No. de ${spec.tipo === 'credito' ? 'tarjeta' : 'cuenta'}: **** **** **** ${spec.ultimos4}`);
  linea(`Periodo: ${spec.periodoInicio} al ${spec.periodoFin}`);
  linea(`Fecha de corte: ${spec.fechaCorte}`);
  if (spec.tipo === 'credito') {
    linea(`Fecha límite de pago: ${spec.fechaLimite}`);
    linea(`Pago mínimo: ${dinero(spec.pagoMinimo)}`);
    linea(`Límite de crédito: ${dinero(spec.limite)}`);
    linea(`Saldo al corte: ${dinero(spec.saldoAlCorte)}`, { bold: true });
  } else {
    linea(`Saldo final: ${dinero(spec.saldoAlCorte)}`, { bold: true });
  }
  linea(`Total de cargos: ${dinero(cargos)}`);
  linea(`Total de pagos y abonos: ${dinero(abonos)}`, { salto: 24 });

  linea('Fecha', { bold: true, mismaLinea: true });
  linea('Descripción', { bold: true, x: 130, mismaLinea: true });
  linea('Monto', { bold: true, x: 470, salto: 18 });
  for (const m of spec.movimientos) {
    linea(m.fecha, { mismaLinea: true });
    linea(m.descripcion.slice(0, 48), { x: 130, mismaLinea: true });
    linea(m.abono ? `(${dinero(m.centavos)})` : dinero(m.centavos), { x: 470, salto: 15 });
  }
  if (spec.msi?.length) {
    y -= 10;
    linea('Compras a meses sin intereses', { bold: true, salto: 18 });
    for (const c of spec.msi) linea(`${c.comercio}  cuota ${c.cuota} de ${c.total}  ${dinero(c.centavos)}`);
  }
  page.drawText(PIE, { x: 50, y: 30, size: 8, font });
  // Bytes deterministas: el mismo caso produce el mismo archivo (y el mismo hash) en cada corrida.
  const fija = new Date('2026-01-01T00:00:00Z');
  doc.setCreationDate(fija);
  doc.setModificationDate(fija);
  doc.setProducer('Bill Up QA');
  doc.setCreator('Bill Up QA');
  return Buffer.from(await doc.save({ updateFieldAppearances: false }));
}

/** dd/mm/yyyy del día `dia` del mes `hoy + offsetMeses` (día 31 se ajusta al último del mes). */
function fechaEn(hoy, offsetMeses, dia) {
  const base = new Date(hoy.getFullYear(), hoy.getMonth() + offsetMeses, 1);
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const d = new Date(base.getFullYear(), base.getMonth(), Math.min(dia, ultimo));
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Tres casos con fechas relativas a hoy (para que Inicio muestre datos recientes y las pruebas no caduquen):
 * crédito con suscripciones y MSI (corte hace dos meses), mismo plástico un mes después (corte el mes pasado)
 * y débito con nómina los días 14 y fin de mes (mes pasado completo).
 */
export function casos(hoy = new Date()) {
  const F = (offset, dia) => fechaEn(hoy, offset, dia);
  return [
    {
      archivo: 'provisional-01-credito-bbva-1.pdf',
      banco: 'BBVA',
      tipo: 'credito',
      producto: 'Azul',
      ultimos4: '0001',
      periodoInicio: F(-3, 16),
      periodoFin: F(-2, 15),
      fechaCorte: F(-2, 15),
      fechaLimite: F(-1, 5),
      pagoMinimo: 120000,
      saldoAlCorte: 1845000,
      limite: 6000000,
      movimientos: [
        { fecha: F(-3, 18), descripcion: 'NETFLIX.COM', centavos: 21900, categoria: 'suscripciones' },
        { fecha: F(-3, 20), descripcion: 'SPOTIFY MEXICO', centavos: 12900, categoria: 'suscripciones' },
        { fecha: F(-3, 22), descripcion: 'OXXO SUC 4521 CDMX', centavos: 18800, categoria: 'super' },
        { fecha: F(-3, 25), descripcion: 'UBER *TRIP HELP.UBER.COM', centavos: 14500, categoria: 'transporte' },
        { fecha: F(-3, 28), descripcion: 'AMAZON MX MSI 02/06', centavos: 65000, categoria: 'msi' },
        { fecha: F(-2, 1), descripcion: 'SU PAGO GRACIAS', centavos: 900000, abono: true, categoria: 'pago_tarjeta' },
        { fecha: F(-2, 3), descripcion: 'RAPPI RESTAURANTES CDMX', centavos: 31800, categoria: 'comida' },
        { fecha: F(-2, 5), descripcion: 'WAL-MART SUPERCENTER', centavos: 124500, categoria: 'super' },
        { fecha: F(-2, 9), descripcion: 'CINEPOLIS PERISUR', centavos: 36000, categoria: 'entretenimiento' },
        { fecha: F(-2, 12), descripcion: 'GIMNASIO DEL VALLE', centavos: 65000, categoria: 'otros' },
        { fecha: F(-2, 14), descripcion: 'REEMBOLSO AMAZON MX', centavos: 45000, abono: true, categoria: 'ingreso' },
      ],
      msi: [{ comercio: 'AMAZON MX', cuota: 2, total: 6, centavos: 65000 }],
      suscripcionesEsperadas: ['Netflix', 'Spotify'],
      msiEsperados: [{ comercio: 'Amazon', cuota: 2, total: 6 }],
    },
    {
      archivo: 'provisional-02-credito-bbva-2.pdf',
      banco: 'BBVA',
      tipo: 'credito',
      producto: 'Azul',
      ultimos4: '0001',
      periodoInicio: F(-2, 16),
      periodoFin: F(-1, 15),
      fechaCorte: F(-1, 15),
      fechaLimite: F(0, 5),
      pagoMinimo: 135000,
      saldoAlCorte: 2010000,
      limite: 6000000,
      movimientos: [
        { fecha: F(-2, 18), descripcion: 'NETFLIX.COM', centavos: 24900, categoria: 'suscripciones' },
        { fecha: F(-2, 20), descripcion: 'SPOTIFY MEXICO', centavos: 12900, categoria: 'suscripciones' },
        { fecha: F(-2, 28), descripcion: 'AMAZON MX MSI 03/06', centavos: 65000, categoria: 'msi' },
        { fecha: F(-1, 1), descripcion: 'SU PAGO GRACIAS', centavos: 1000000, abono: true, categoria: 'pago_tarjeta' },
        { fecha: F(-1, 2), descripcion: 'OXXO SUC 4521 CDMX', centavos: 9500, categoria: 'super' },
        { fecha: F(-1, 2), descripcion: 'OXXO SUC 4521 CDMX', centavos: 9500, categoria: 'super' },
        { fecha: F(-1, 6), descripcion: 'UBER *EATS PENDING', centavos: 28900, categoria: 'comida' },
        { fecha: F(-1, 11), descripcion: 'GIMNASIO DEL VALLE', centavos: 65000, categoria: 'otros' },
        { fecha: F(-1, 13), descripcion: 'CFE SSB PAGO SERVICIO', centavos: 64000, categoria: 'servicios' },
        { fecha: F(-1, 15), descripcion: 'LIVERPOOL CUOTA 11 DE 12', centavos: 100000, categoria: 'msi' },
      ],
      msi: [
        { comercio: 'AMAZON MX', cuota: 3, total: 6, centavos: 65000 },
        { comercio: 'LIVERPOOL', cuota: 11, total: 12, centavos: 100000 },
      ],
      suscripcionesEsperadas: ['Netflix', 'Spotify'],
      msiEsperados: [
        { comercio: 'Amazon', cuota: 3, total: 6 },
        { comercio: 'Liverpool', cuota: 11, total: 12 },
      ],
    },
    {
      archivo: 'provisional-03-debito-banorte-nomina.pdf',
      banco: 'Banorte',
      tipo: 'debito',
      producto: 'Enlace',
      ultimos4: '0003',
      periodoInicio: F(-1, 1),
      periodoFin: F(-1, 31),
      fechaCorte: F(-1, 31),
      saldoAlCorte: 2312000,
      movimientos: [
        { fecha: F(-1, 1), descripcion: 'PAGO TARJETA BBVA 0001', centavos: 1000000, categoria: 'pago_tarjeta' },
        { fecha: F(-1, 3), descripcion: 'SORIANA HIPER', centavos: 123800, categoria: 'super' },
        { fecha: F(-1, 8), descripcion: 'RETIRO CAJERO ATM BANORTE', centavos: 200000, categoria: 'efectivo' },
        { fecha: F(-1, 14), descripcion: 'PAGO DE NOMINA EMPRESA SA DE CV', centavos: 1450000, abono: true, categoria: 'nomina' },
        { fecha: F(-1, 16), descripcion: 'TELCEL RECARGA', centavos: 20000, categoria: 'servicios' },
        { fecha: F(-1, 20), descripcion: 'FARMACIAS SAN PABLO', centavos: 43500, categoria: 'salud' },
        { fecha: F(-1, 25), descripcion: 'SPEI ENVIADO GBM APORTACION', centavos: 300000, categoria: 'inversion' },
        { fecha: F(-1, 31), descripcion: 'PAGO DE NOMINA EMPRESA SA DE CV', centavos: 1450000, abono: true, categoria: 'nomina' },
      ],
      suscripcionesEsperadas: [],
      msiEsperados: [],
      nomina: { montoCentavos: 1450000, diasQuincena: [14, 30] },
    },
  ];
}

export const CASOS = casos();

/** Respuesta correcta de un caso, en el formato de qa/talachas/T-003.md (lo que compara `npm run qa:precision`). */
export function esperadoDe(c) {
  const cargos = c.movimientos.filter((m) => !m.abono).reduce((s, m) => s + m.centavos, 0);
  const abonos = c.movimientos.filter((m) => m.abono).reduce((s, m) => s + m.centavos, 0);
  return {
    institucion: c.banco,
    tipoCuenta: c.tipo,
    ultimos4: c.ultimos4,
    periodoInicio: iso(c.periodoInicio),
    periodoFin: iso(c.periodoFin),
    fechaCorte: iso(c.fechaCorte),
    fechaLimitePago: c.fechaLimite ? iso(c.fechaLimite) : null,
    pagoMinimoCentavos: c.pagoMinimo ?? null,
    limiteCreditoCentavos: c.limite ?? null,
    saldoAlCorteCentavos: c.saldoAlCorte,
    totalCargosCentavos: cargos,
    totalAbonosCentavos: abonos,
    movimientos: c.movimientos.map((m) => ({ fecha: iso(m.fecha), descripcion: m.descripcion, montoCentavos: m.centavos, esAbono: !!m.abono, categoriaEsperada: m.categoria ?? null })),
    suscripcionesEsperadas: c.suscripcionesEsperadas ?? [],
    msiEsperados: c.msiEsperados ?? [],
    nomina: c.nomina ?? null,
  };
}

/** dd/mm/yyyy → yyyy-mm-dd (para comparar en pruebas). */
function iso(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m}-${d}`;
}
export { iso };

export async function generarEstadosDePrueba(dir = 'qa/entregables/estados') {
  await mkdir(dir, { recursive: true });
  const salida = [];
  for (const c of CASOS) {
    const ruta = `${dir}/${c.archivo}`;
    await writeFile(ruta, await crearPdfEstado(c));
    await writeFile(ruta.replace(/\.pdf$/, '.json'), JSON.stringify(esperadoDe(c), null, 2) + '\n');
    salida.push(ruta);
  }
  return salida;
}

// Sin await de nivel superior: Playwright carga este archivo como CommonJS.
if (process.argv[1] && process.argv[1].endsWith('qa-pdfs.mjs')) {
  generarEstadosDePrueba().then((rutas) => console.log(rutas.join('\n')));
}
