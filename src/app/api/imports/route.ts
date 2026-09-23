import { NextResponse } from 'next/server';
import { registrar } from '@/lib/services/analytics';
import { contexto } from '@/lib/data/contexto';
import { analizarArchivo } from '@/lib/services/importacion';
import { esErrorImportacion } from '@/lib/services/ingestion';
import { PDF_MAX_BYTES } from '@/lib/services/ingestion/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// La lectura de un PDF con el modelo puede tardar; Vercel con Fluid compute permite hasta 300 s (ver SOLO JC en qa/TABLERO.md).
export const maxDuration = 300;

/**
 * POST multipart/form-data: `archivo` (PDF, CSV o Excel), `contraseña` opcional.
 * Crea o reutiliza la importación por hash del archivo, la procesa en esta misma petición y devuelve su estado.
 * El archivo se descarta al terminar; solo quedan los datos extraídos.
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

  try {
    const r = await analizarArchivo(repo, usuario.id, { nombre: archivo.name, datos: Buffer.from(await archivo.arrayBuffer()), contraseña: typeof contraseña === 'string' && contraseña ? contraseña : null });
    const status = r.codigo === 'ya_subido' ? 409 : r.importacion.estado === 'error' ? 422 : 200;
    if (status === 422) await registrar(repo, usuario.id, 'import_error', { codigo: r.importacion.error ?? r.codigo ?? 'desconocido', kb: Math.round(archivo.size / 1024) });
    return NextResponse.json(r, { status });
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
