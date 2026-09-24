// Entrada de movimientos por notificación del teléfono (app Android) o correo reenviado a una dirección propia.
// Las dos fuentes llegan como "correo": remitente/paquete, título, texto y fecha. Un recibo enriquece; una alerta
// bancaria crea el movimiento en la cuenta correcta. Todo pasa por el mismo parser que Gmail y la misma ingesta.

import { createHash, randomBytes } from 'node:crypto';
import type { Repo } from '@/lib/data/repo';
import { infoBanco } from '@/lib/domain/comercios';
import type { FuenteDato } from '@/lib/domain/tipos';
import { ingerirMovimientos } from './ingest';
import { parsearAlerta, type AlertaParseada, type CorreoAlerta } from './gmail.parsers';
import { parsearRecibo } from './recibos';
import { aplicarRecibos } from './enriquecer';

/** Apps bancarias de Android → dominio del banco (para que el parser reconozca el remitente). */
export const PAQUETES_ANDROID: Record<string, string> = {
  'com.bbva.mx': 'bbva.mx',
  'com.bancomer.mbanking': 'bbva.mx',
  'com.nu.production': 'nu.com.mx',
  'com.banorte.movil': 'banorte.com',
  'mx.banorte.mbanking': 'banorte.com',
  'mx.santander.supermovil': 'santander.com.mx',
  'com.santander.mx': 'santander.com.mx',
  'mx.com.hsbc.hsbcmexico': 'hsbc.com.mx',
  'com.banamex.mobile': 'banamex.com',
  'com.citibanamex.mobile': 'banamex.com',
  'com.scotiabank.mx': 'scotiabank.com.mx',
  'com.hey.banco': 'heybanco.com',
  'mx.klar.klar': 'klar.mx',
  'com.storicard.app': 'storicard.com',
  'com.mercadopago.wallet': 'mercadopago.com.mx',
  'com.americanexpress.android.acctsvcs.mx': 'americanexpress.com',
  'com.amazon.mShop.android.shopping': 'amazon.com.mx',
  'com.ubercab': 'uber.com',
  'com.sdu.didi.psnger': 'didiglobal.com',
  'com.grability.rappi': 'rappi.com.mx',
  'com.mercadolibre': 'mercadolibre.com.mx',
};

export type Notificacion = { paquete: string; titulo: string; texto: string; hora?: string | null };

/** Convierte una notificación de Android al formato de correo que entienden los parsers. */
export function notificacionACorreo(n: Notificacion): CorreoAlerta | null {
  const dominio = PAQUETES_ANDROID[n.paquete];
  if (!dominio) return null;
  const fecha = n.hora && !Number.isNaN(Date.parse(n.hora)) ? new Date(n.hora).toISOString() : new Date().toISOString();
  return { from: `notificacion@${dominio}`, subject: n.titulo.slice(0, 200), text: n.texto.slice(0, 4000), fecha };
}

export type ResultadoEntrada = { tipo: 'recibo'; casados: number } | { tipo: 'movimiento'; insertados: number; duplicados: number } | { tipo: 'ignorado'; motivo: string };

/** Cuenta a la que va una alerta: la del banco (y últimos 4 si vienen); si no existe, se crea con el link de la fuente. */
async function cuentaParaAlerta(repo: Repo, userId: string, p: AlertaParseada, fuente: FuenteDato) {
  const info = infoBanco(p.banco);
  const cuentas = await repo.cuentas(userId);
  const existente = cuentas.find((c) => c.banco === info.nombre && (!p.ultimos4 || c.ultimos4 === p.ultimos4)) ?? cuentas.find((c) => c.banco === info.nombre && c.tipo === p.tipoCuenta);
  if (existente) return existente;
  const link = (await repo.links(userId)).find((l) => l.proveedor === fuente) ?? (await repo.guardarLink(userId, { proveedor: fuente as 'dispositivo' | 'correo', externalId: `${fuente}:fuente`, institucion: fuente === 'dispositivo' ? 'Notificaciones del teléfono' : 'Correo reenviado', institucionDominio: null, estado: 'ok', ultimoSync: new Date().toISOString() }));
  return repo.guardarCuenta(userId, { linkId: link.id, externalId: `${fuente}:${info.nombre}:${p.ultimos4 ?? p.tipoCuenta}`, nombre: `${info.nombre} ${p.tipoCuenta === 'credito' ? 'Crédito' : 'Débito'}`, banco: info.nombre, bancoDominio: info.dominio || null, tipo: p.tipoCuenta, ultimos4: p.ultimos4, saldo: 0, color: info.color, activo: true });
}

/** Procesa un correo o notificación: recibo → detalle; alerta → movimiento; lo demás se ignora. */
export async function procesarEntrada(repo: Repo, userId: string, correo: CorreoAlerta, fuente: 'dispositivo' | 'correo'): Promise<ResultadoEntrada> {
  const recibo = parsearRecibo(correo);
  if (recibo) {
    const r = await aplicarRecibos(repo, userId, [recibo]);
    return { tipo: 'recibo', casados: r.casados };
  }
  const alerta = parsearAlerta(correo);
  if (!alerta) return { tipo: 'ignorado', motivo: 'no es alerta ni recibo' };
  const cuenta = await cuentaParaAlerta(repo, userId, alerta, fuente);
  const r = await ingerirMovimientos(repo, userId, cuenta, [alerta.movimiento], fuente);
  return { tipo: 'movimiento', insertados: r.insertados, duplicados: r.duplicados };
}

// ---------- Tokens de dispositivo y alias de correo ----------

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Crea (o reemplaza) el token de la app Android del usuario. Se guarda solo el hash; el token se muestra una vez. */
export async function crearTokenDispositivo(repo: Repo, userId: string): Promise<string> {
  const token = `mmd_${randomBytes(24).toString('hex')}`;
  const hash = hashToken(token);
  const links = await repo.links(userId);
  for (const l of links.filter((x) => x.proveedor === 'dispositivo')) await repo.eliminarLink(userId, l.id);
  await repo.guardarLink(userId, { proveedor: 'dispositivo', externalId: `dispositivo:${hash}`, institucion: 'Notificaciones del teléfono', institucionDominio: null, estado: 'ok', ultimoSync: null });
  return token;
}

/** Usuario dueño de un token de dispositivo; null si no existe. */
export async function usuarioPorToken(repo: Repo, token: string): Promise<string | null> {
  if (!/^mmd_[a-f0-9]{48}$/.test(token)) return null;
  return repo.usuarioPorExternalId('dispositivo', `dispositivo:${hashToken(token)}`);
}

/** Alias de la dirección de reenvío: `<alias>@<dominio>`. Se crea una vez por usuario. */
export async function aliasCorreo(repo: Repo, userId: string): Promise<string> {
  const links = await repo.links(userId);
  const existente = links.find((l) => l.proveedor === 'correo' && l.externalId?.startsWith('correo:'));
  if (existente?.externalId) return existente.externalId.slice('correo:'.length);
  const alias = `mm-${randomBytes(5).toString('hex')}`;
  await repo.guardarLink(userId, { proveedor: 'correo', externalId: `correo:${alias}`, institucion: 'Correo reenviado', institucionDominio: null, estado: 'ok', ultimoSync: null });
  return alias;
}

export async function usuarioPorAlias(repo: Repo, alias: string): Promise<string | null> {
  if (!/^mm-[a-f0-9]{10}$/.test(alias)) return null;
  return repo.usuarioPorExternalId('correo', `correo:${alias}`);
}

export function dominioCorreoEntrante(): string {
  return process.env.CORREO_ENTRANTE_DOMINIO || 'in.moneymaker.mx';
}
