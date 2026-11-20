// Validación de un correo que escribe el usuario como destinatario (el proveedor al que va una carta).
// Un solo destinatario, sin saltos de línea ni separadores: lo que llega aquí termina en el "para" de un correo
// que sale desde el dominio de la app, así que no puede traer varios destinatarios ni cabeceras escondidas.

export function correoValido(valor: string | null | undefined): string | null {
  const c = (valor ?? '').trim();
  if (!c || c.length > 120) return null;
  return /^[^\s@<>,;:"'()]+@[^\s@<>,;:"'()]+\.[a-z]{2,}$/i.test(c) ? c.toLowerCase() : null;
}
