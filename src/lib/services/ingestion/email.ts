// Fuente: estado de cuenta reenviado por correo. Próximamente: misma interfaz, mismo resultado.

import { ErrorImportacion, type TransactionSource } from './tipos';

export const fuenteCorreo: TransactionSource = {
  nombre: 'email',
  async extraer() {
    throw new ErrorImportacion('no_disponible', 'Reenviar por correo: próximamente');
  },
};
