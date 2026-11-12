// Archivos que el usuario eligió en el onboarding antes de llegar a /app/importar. Viven en memoria durante la
// navegación dentro de la app (no se guardan en ningún lado) y la pantalla de importar los recoge al abrir.

let pendientes: File[] = [];

export function dejarArchivosPendientes(archivos: File[]): void {
  pendientes = archivos;
}

export function tomarArchivosPendientes(): File[] {
  const salida = pendientes;
  pendientes = [];
  return salida;
}
