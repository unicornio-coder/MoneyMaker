// Cuentas de prueba qa01–qa10 en Supabase (solo preview/desarrollo). Requiere SUPABASE_SERVICE_ROLE_KEY.
// Uso: `npm run qa:seed` crea o restablece las cuentas y escribe qa/cuentas.local.md (ignorado por git).
//      `npm run qa:reset` borra los datos de esas cuentas (cuentas, movimientos, importaciones) sin borrar el usuario.
// Nunca se corre contra producción: se niega si NEXT_PUBLIC_APP_URL no contiene "vercel.app" ni "localhost".

import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const modo = process.argv[2] === 'reset' ? 'reset' : 'seed';

async function cargarEnvLocal() {
  try {
    const texto = await readFile('.env.local', 'utf8');
    for (const linea of texto.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linea);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // sin .env.local: se usan las variables del entorno
  }
}

await cargarEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

if (!url || !servicio) {
  console.log('Sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: en modo demo no hacen falta cuentas (entra el usuario JC).');
  console.log('Para preview: pon las llaves en .env.local (ver docs/CHECKLIST-FUNDADOR.md) y vuelve a correr npm run qa:seed.');
  process.exit(0);
}
if (!/vercel\.app|localhost|127\.0\.0\.1/.test(appUrl) || /moneymaker\.mx|billup/.test(appUrl)) {
  console.error(`NEXT_PUBLIC_APP_URL=${appUrl} no parece preview ni desarrollo. No se crean cuentas de prueba en producción.`);
  process.exit(1);
}

const admin = createClient(url, servicio, { auth: { autoRefreshToken: false, persistSession: false } });
const dominio = process.env.QA_EMAIL_DOMAIN ?? 'qa.billup.test';
const PERSONAS = [
  ['qa01', 'Primer uso: sube un PDF y quiere ver su total en menos de 2 minutos'],
  ['qa02', 'Dos tarjetas de crédito, tres meses cada una'],
  ['qa03', 'Compras a meses sin intereses (MSI), una que termina este mes'],
  ['qa04', 'PDF con contraseña, poco técnico'],
  ['qa05', 'Débito con nómina los 15 y 30'],
  ['qa06', 'Duplicados, subida múltiple y periodos traslapados'],
  ['qa07', 'Freelancer con depósitos irregulares'],
  ['qa08', 'Estado de cuenta con cero movimientos'],
  ['qa09', 'Seguridad: /admin, IDs de otro usuario, archivos maliciosos, sesión'],
  ['qa10', 'Móvil, modo oscuro y red lenta'],
];

async function usuarioPorCorreo(correo) {
  let pagina = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === correo);
    if (u) return u;
    if (data.users.length < 200) return null;
    pagina++;
  }
}

async function borrarDatos(userId) {
  for (const tabla of ['statement_imports', 'unmatched_descriptors', 'insights', 'calendar_events', 'cancel_requests', 'recurrents', 'transactions', 'budget_lines', 'budgets', 'assets', 'liabilities', 'goals', 'accounts', 'links', 'credentials', 'merchants']) {
    const { error } = await admin.from(tabla).delete().eq('user_id', userId);
    if (error && !/does not exist/.test(error.message)) console.warn(`  ${tabla}: ${error.message}`);
  }
  await admin.from('profiles').update({ dias_pago: [5, 20], ingreso_quincenal: null, onboarding_completo: true }).eq('id', userId);
}

const filas = [];
for (const [usuario, persona] of PERSONAS) {
  const correo = `${usuario}@${dominio}`;
  let u = await usuarioPorCorreo(correo);
  let contraseña = null;
  if (modo === 'seed') {
    contraseña = `Qa-${randomBytes(6).toString('base64url')}-${usuario.slice(-2)}`;
    if (!u) {
      const { data, error } = await admin.auth.admin.createUser({ email: correo, password: contraseña, email_confirm: true, user_metadata: { nombre: `Prueba ${usuario.toUpperCase()}` } });
      if (error) throw error;
      u = data.user;
      console.log(`creada  ${correo}`);
    } else {
      const { error } = await admin.auth.admin.updateUserById(u.id, { password: contraseña, email_confirm: true });
      if (error) throw error;
      console.log(`restablecida  ${correo}`);
    }
  }
  if (u) {
    await borrarDatos(u.id);
    if (modo === 'reset') console.log(`limpia  ${correo}`);
  }
  filas.push({ usuario, correo, contraseña, persona });
}

if (modo === 'seed') {
  const md = ['# Cuentas de prueba (solo preview) · generado por `npm run qa:seed`', '', `App: ${appUrl}`, `Generado: ${new Date().toISOString()}`, '', '| Usuario | Correo | Contraseña | Persona |', '|---|---|---|---|', ...filas.map((f) => `| ${f.usuario} | ${f.correo} | \`${f.contraseña}\` | ${f.persona} |`), '', 'Este archivo está en .gitignore. No lo compartas fuera del equipo de QA.', ''].join('\n');
  await writeFile('qa/cuentas.local.md', md);
  console.log('\nCredenciales en qa/cuentas.local.md');
}
