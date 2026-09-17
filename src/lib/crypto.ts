// Cifrado simétrico para credenciales de conectores (tokens de Gmail, llaves de Bitso).
// AES-256-GCM con CREDENTIALS_KEY (32 bytes en base64). Sin llave, en modo mock, se guarda en claro con prefijo.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function llave(): Buffer | null {
  const k = process.env.CREDENTIALS_KEY;
  if (!k) return null;
  const b = Buffer.from(k, 'base64');
  if (b.length !== 32) throw new Error('CREDENTIALS_KEY debe ser 32 bytes en base64 (openssl rand -base64 32)');
  return b;
}

export function cifrar(texto: string): string {
  const k = llave();
  if (!k) return `plain:${Buffer.from(texto, 'utf8').toString('base64')}`;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', k, iv);
  const enc = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return `gcm:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
}

export function descifrar(cifrado: string): string {
  if (cifrado.startsWith('plain:')) return Buffer.from(cifrado.slice(6), 'base64').toString('utf8');
  const k = llave();
  if (!k) throw new Error('Falta CREDENTIALS_KEY para descifrar');
  const [, iv, tag, enc] = cifrado.split(':');
  const d = createDecipheriv('aes-256-gcm', k, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8');
}
