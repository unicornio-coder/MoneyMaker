// Cifrado simétrico para credenciales de conectores (tokens de Gmail, llaves de Bitso).
// AES-256-GCM con una llave de 32 bytes derivada (SHA-256) de CREDENTIALS_KEY, que puede ser cualquier cadena larga.
// Sin llave, en modo mock, se guarda en claro con prefijo.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function llave(): Buffer | null {
  const k = process.env.CREDENTIALS_KEY?.trim();
  if (!k) return null;
  if (k.length < 16) throw new Error('CREDENTIALS_KEY debe tener al menos 16 caracteres');
  return createHash('sha256').update(k, 'utf8').digest();
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
