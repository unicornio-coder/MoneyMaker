// Banderas de producto. Se leen en build (NEXT_PUBLIC_*), así que sirven igual en servidor y cliente.

/**
 * Conexión bancaria automática (Belvo). Apagada: la app solo ofrece subir el estado de cuenta (PDF, Excel, CSV,
 * TXT o Word) y, como complemento, las alertas del correo. Se enciende con NEXT_PUBLIC_BANCOS=true cuando Belvo
 * tenga habilitada la banca para esta cuenta.
 */
export const BANCOS = process.env.NEXT_PUBLIC_BANCOS === 'true';
