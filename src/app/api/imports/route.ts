import { NextResponse } from 'next/server';
import { registrar } from '@/lib/services/analytics';
import { contexto } from '@/lib/data/contexto';
import { analizarArchivo, iniciarAnalisis, procesarAnalisis } from '@/lib/services/importacion';
import { esErrorImportacion } from '@/lib/services/ingestion';
import { PDF_MAX_BYTES } from '@/lib/services/ingestion/pdf';
import { enSegundoPlano } from '@/lib/server/segundo-plano';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST multipart `archivo` (+ `contraseña` opcional): registra la importación y responde de inmediato (202) con
 * `estado: 'procesando'`; la lectura sigue en segundo plano y se consulta con GET /api/imports/[id].
 * Con `modo=sync` espera a que termine (pruebas). El archivo nunca se guarda: se procesa en memoria y se descarta.
 */
export async function POST(req: Request) {
  const { usuario, repo } = await contexto();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ codigo: 'corrupto' }, { status: 400 });
  }
  const archivo = form.get('archivo');
  if (!(archivo instanceof File)) return NextResponse.json({ codigo: 'no_pdf' }, { status: 400 });
  if (archivo.size > PDF_MAX_BYTES) return NextResponse.json({ codigo: 'muy_grande' }, { status: 413 });
  const contraseña = form.get('contraseña');
  const sincrono = form.get('modo') === 'sync';
  const entrada = { nombre: archivo.name, datos: Buffer.from(await archivo.arrayBuffer()), contraseña: typeof contraseña === 'string' && contraseña ? contraseña : null };

  try {
    if (sincrono) {
      const r = await analizarArchivo(repo, usuario.id, entrada);
      const status = r.codigo === 'ya_subido' ? 409 : r.importacion.estado === 'error' ? 422 : 200;
      return NextResponse.json(r, { status });
    }
    const r = await iniciarAnalisis(repo, usuario.id, entrada);
    if (r.procesar) {
      enSegundoPlano(procesarAnalisis(repo, usuario.id, r.importacion.id, entrada));
      return NextResponse.json({ importacion: r.importacion }, { status: 202 });
    }
    const status = r.codigo === 'ya_subido' ? 409 : r.importacion.estado === 'error' ? 422 : 200;
    return NextResponse.json({ importacion: r.importacion, codigo: r.codigo }, { status });
  } catch (e) {
    const codigo = esErrorImportacion(e) ? e.codigo : 'servidor';
    if (!esErrorImportacion(e)) console.error('[api/imports]', e instanceof Error ? e.name : 'error');
    await registrar(repo, usuario.id, 'import_error', { codigo, kb: Math.round(archivo.size / 1024) });
    return NextResponse.json({ codigo }, { status: codigo === 'muy_grande' ? 413 : codigo === 'no_pdf' ? 400 : 500 });
  }
}

/** GET: importaciones pendientes (en revisión, esperando contraseña o procesando) para retomar al volver. */
export async function GET() {
  const { usuario, repo } = await contexto();
  const importaciones = await repo.importaciones(usuario.id, { estados: ['revisar', 'necesita_contraseña', 'procesando'] });
  return NextResponse.json({ importaciones });
}
