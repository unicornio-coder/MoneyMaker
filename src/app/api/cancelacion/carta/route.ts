import { contexto } from '@/lib/data/contexto';
import { aISO, hoyMX } from '@/lib/domain/fechas';
import { costoMensual } from '@/lib/domain/recurrentes';
import { generarCartaPdf } from '@/lib/services/carta';
import { registrar } from '@/lib/services/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PDF de la carta de cancelación de una suscripción del usuario. Nada se guarda: se genera y se descarga. */
export async function GET(req: Request) {
  const { usuario, repo, perfil } = await contexto();
  const q = new URL(req.url).searchParams;
  const r = (await repo.recurrentes(usuario.id)).find((x) => x.id === q.get('recurrente'));
  if (!r) return new Response('No encontramos la suscripción.', { status: 404 });
  const limpio = (v: string | null, max: number) => (v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max) || null;
  const pdf = await generarCartaPdf({
    servicio: r.nombre,
    titular: limpio(q.get('nombre'), 80) ?? perfil.nombre?.trim() ?? usuario.nombre,
    correo: limpio(q.get('correo'), 120) ?? usuario.email ?? null,
    ultimos4: /^\d{4}$/.test(q.get('ultimos4') ?? '') ? q.get('ultimos4') : null,
    montoMensual: r.tipo === 'msi' ? r.monto : costoMensual(r),
    fecha: aISO(hoyMX()),
    notas: limpio(q.get('notas'), 400),
  });
  await registrar(repo, usuario.id, 'carta_cancelacion', { recurrenteId: r.id });
  const archivo = `cancelacion-${r.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  return new Response(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${archivo}"` } });
}
