import { iniciales } from '@/lib/format';

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
  nombreCorto: string;
  iniciales: string;
};

/**
 * Usuario de la sesión actual. Mientras no haya Supabase configurado (NEXT_PUBLIC_USE_MOCK=true
 * o sin llaves) devuelve el usuario demo del prototipo. Se reemplaza en la tarea de auth.
 */
export async function usuarioActual(): Promise<UsuarioSesion> {
  const nombre = 'Juan Costos';
  return { id: 'demo', email: 'demo@moneymaker.mx', nombre, nombreCorto: 'JC', iniciales: iniciales(nombre) };
}
