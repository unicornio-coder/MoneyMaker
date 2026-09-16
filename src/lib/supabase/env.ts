export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Sin llaves de Supabase (o NEXT_PUBLIC_USE_MOCK=true) la app corre con el usuario demo y datos en memoria. */
export const MODO_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || !SUPABASE_URL || !SUPABASE_ANON_KEY;
