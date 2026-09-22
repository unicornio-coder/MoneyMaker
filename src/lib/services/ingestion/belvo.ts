// Fuente: conexión bancaria automática (Belvo) detrás de la interfaz de ingesta. Próximamente.
// La conexión directa sigue disponible en services/belvo.ts y services/conectar.ts para la sincronización diaria.

import { ErrorImportacion, type TransactionSource } from './tipos';

export const fuenteBelvo: TransactionSource = {
  nombre: 'belvo',
  async extraer() {
    throw new ErrorImportacion('no_disponible', 'Conectar mi banco automáticamente: próximamente');
  },
};
