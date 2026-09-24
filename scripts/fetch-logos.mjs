// Baja los logos de bancos y comercios a public/logos/<dominio>.png para servirlos desde nuestro dominio
// (sin depender de terceros en producción) y escribe src/lib/brands.locales.json con los que se consiguieron.
// Uso: npm run logos [-- --solo bbva.mx,nu.com.mx]   Requiere salida a internet. Es idempotente: no vuelve a bajar los que ya existen.
// Fuentes por orden: Brandfetch (con BRANDFETCH_CLIENT_ID) → Clearbit → favicon de Google → DuckDuckGo.
// En GitHub lo corre el bot .github/workflows/logos.yml (también cuando este archivo cambia).

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = process.cwd();
const DESTINO = path.join(RAIZ, 'public', 'logos');
const MANIFIESTO = path.join(RAIZ, 'src', 'lib', 'brands.locales.json');
const TAM = 128;

function fuentes(d) {
  const out = [];
  if (process.env.BRANDFETCH_CLIENT_ID) out.push(`https://cdn.brandfetch.io/${d}/w/${TAM}/h/${TAM}?c=${process.env.BRANDFETCH_CLIENT_ID}`);
  out.push(`https://logo.clearbit.com/${d}?size=${TAM}`, `https://www.google.com/s2/favicons?domain=${d}&sz=${TAM}`, `https://icons.duckduckgo.com/ip3/${d}.ico`);
  return out;
}

async function dominios() {
  const src = await readFile(path.join(RAIZ, 'src', 'lib', 'domain', 'comercios.ts'), 'utf8');
  const bancos = JSON.parse(await readFile(path.join(RAIZ, 'qa', 'entregables', 'bancos.json'), 'utf8')).bancos.map((b) => b.dominio);
  const merchants = JSON.parse(await readFile(path.join(RAIZ, 'qa', 'entregables', 'merchants.json'), 'utf8')).merchants.map((m) => m.dominio_logo);
  const enCodigo = [...src.matchAll(/dominio: '([^']+)'/g)].map((m) => m[1]);
  return Array.from(new Set([...bancos, ...merchants, ...enCodigo].filter(Boolean).map((d) => d.toLowerCase().replace(/^www\./, ''))));
}

async function existe(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function bajar(d) {
  for (const url of fuentes(d)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const tipo = res.headers.get('content-type') ?? '';
      const bytes = Buffer.from(await res.arrayBuffer());
      // Los favicons "por defecto" de Google miden 16 px y pesan muy poco: no sirven como logo.
      if (bytes.length < 400) continue;
      const ext = tipo.includes('svg') ? 'svg' : tipo.includes('png') ? 'png' : tipo.includes('jpeg') || tipo.includes('jpg') ? 'jpg' : tipo.includes('icon') || url.endsWith('.ico') ? 'ico' : 'png';
      return { ext, bytes, url };
    } catch {
      // siguiente fuente
    }
  }
  return null;
}

async function main() {
  const solo = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1].split(',') : null;
  await mkdir(DESTINO, { recursive: true });
  let manifiesto = {};
  try {
    manifiesto = JSON.parse(await readFile(MANIFIESTO, 'utf8'));
  } catch {}
  const lista = (await dominios()).filter((d) => !solo || solo.includes(d));
  let ok = 0;
  let fallidos = [];
  for (const d of lista) {
    if (manifiesto[d] && (await existe(path.join(DESTINO, manifiesto[d])))) {
      ok++;
      continue;
    }
    const r = await bajar(d);
    if (!r) {
      fallidos.push(d);
      console.log(`--  ${d}`);
      continue;
    }
    const archivo = `${d}.${r.ext}`;
    await writeFile(path.join(DESTINO, archivo), r.bytes);
    manifiesto[d] = archivo;
    ok++;
    console.log(`ok  ${d} ← ${new URL(r.url).host}`);
  }
  await writeFile(MANIFIESTO, JSON.stringify(Object.fromEntries(Object.entries(manifiesto).sort()), null, 2) + '\n');
  console.log(`\n${ok} logos locales, ${fallidos.length} sin logo (usan monograma).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
