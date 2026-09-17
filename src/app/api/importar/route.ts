import { NextResponse } from 'next/server';
import { contexto } from '@/lib/data/contexto';
import { importarArchivo } from '@/lib/services/importer';
import { ingerirMovimientos } from '@/lib/services/ingest';
import { infoBanco } from '@/lib/domain/comercios';
import type { TipoCuenta } from '@/lib/domain/tipos';
import { registrar } from '@/lib/services/analytics';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * multipart/form-data: archivo, modo ('vista' | 'confirmar'), cuentaId | (banco, tipo, ultimos4) para crear una nueva.
 * 'vista' devuelve el resumen sin guardar; 'confirmar' guarda en la cuenta indicada.
 */
export async function POST(req: Request) {
  const { usuario, repo } = await contexto();
  const form = await req.formData();
  const archivo = form.get('archivo');
  if (!(archivo instanceof File)) return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
  if (archivo.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'El archivo pesa más de 15 MB.' }, { status: 400 });

  const datos = Buffer.from(await archivo.arrayBuffer());
  const r = await importarArchivo(archivo.name, datos);
  const modo = String(form.get('modo') ?? 'vista');

  if (modo === 'vista') {
    return NextResponse.json({
      movimientos: r.movimientos.length,
      cargos: r.movimientos.filter((m) => !m.esAbono).length,
      abonos: r.movimientos.filter((m) => m.esAbono).length,
      desde: r.movimientos.map((m) => m.fecha).sort()[0] ?? null,
      hasta: r.movimientos.map((m) => m.fecha).sort().pop() ?? null,
      banco: r.banco,
      ultimos4: r.ultimos4,
      formato: r.formato,
      advertencias: r.advertencias,
      muestra: r.movimientos.slice(0, 5),
    });
  }

  if (!r.movimientos.length) return NextResponse.json({ error: 'No encontramos movimientos en el archivo.' }, { status: 422 });

  let cuentaId = String(form.get('cuentaId') ?? '');
  let cuenta = cuentaId ? await repo.cuenta(usuario.id, cuentaId) : null;
  if (!cuenta) {
    const banco = String(form.get('banco') || r.banco || 'Banco');
    const tipo = (String(form.get('tipo') || 'debito') as TipoCuenta) || 'debito';
    const ultimos4 = String(form.get('ultimos4') || r.ultimos4 || '') || null;
    const info = infoBanco(banco);
    const link = await repo.guardarLink(usuario.id, { proveedor: 'import', externalId: `import:${info.nombre}:${ultimos4 ?? tipo}`, institucion: info.nombre, institucionDominio: info.dominio, estado: 'ok', ultimoSync: new Date().toISOString() });
    cuenta = await repo.guardarCuenta(usuario.id, {
      linkId: link.id,
      externalId: `import:${info.nombre}:${ultimos4 ?? tipo}`,
      nombre: `${info.nombre} ${tipo === 'credito' ? 'Crédito' : tipo === 'inversion' ? 'Inversión' : 'Débito'}`,
      banco: info.nombre,
      bancoDominio: info.dominio || null,
      tipo,
      ultimos4,
      saldo: 0,
      color: info.color,
      activo: true,
    });
    cuentaId = cuenta.id;
  }

  const res = await ingerirMovimientos(repo, usuario.id, cuenta, r.movimientos, 'import');
  await repo.registrarEstadoDeCuenta(usuario.id, { cuentaId, archivo: archivo.name, banco: r.banco, estado: 'procesado', transacciones: res.insertados });
  await registrar(repo, usuario.id, 'importacion', { formato: r.formato, movimientos: res.insertados, banco: r.banco });
  return NextResponse.json({ ok: true, cuentaId, ...res });
}
