// A dónde mandar a alguien después de entrar. El parámetro `next` llega en la URL, así que cualquiera puede escribirlo:
// solo se aceptan rutas internas de la app. Sin esto, /login?next=https://sitio-falso llevaría a un sitio ajeno
// justo después de iniciar sesión de verdad (redirección abierta).

export function rutaSegura(next: unknown, porDefecto = '/app'): string {
  if (typeof next !== 'string') return porDefecto;
  const ruta = next.trim();
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.startsWith('/\\')) return porDefecto;
  for (const c of ruta) if (c.charCodeAt(0) < 32 || c === '\\') return porDefecto;
  return ruta;
}
