import { redirect } from 'next/navigation';

/**
 * Crear cuenta ya no es otra pantalla: /login decide si entra o crea la cuenta. Se conservan los enlaces viejos
 * (portada, correos) mandando a /login con el correo y la ruta de regreso que traían.
 */
export default function RegistroPage({ searchParams }: { searchParams: { email?: string; next?: string } }) {
  const q = new URLSearchParams();
  if (typeof searchParams.email === 'string' && searchParams.email) q.set('email', searchParams.email);
  if (typeof searchParams.next === 'string' && searchParams.next) q.set('next', searchParams.next);
  const s = q.toString();
  redirect(s ? `/login?${s}` : '/login');
}
