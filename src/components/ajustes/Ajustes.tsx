'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Shield, Bell, Crown, Users, Download, LogOut, ChevronRight, ChevronLeft, Link2, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fechaCorta, money } from '@/lib/format';
import type { Perfil } from '@/lib/domain/tipos';
import type { UsuarioSesion } from '@/lib/auth/session';
import type { Link as Fuente } from '@/lib/data/repo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { cerrarSesion } from '@/lib/auth/actions';
import { actualizarPerfil, eliminarFuente, borrarCuenta } from '@/app/app/ajustes/acciones';
import { guardarLlavesBitso, sincronizarConector, desconectarConector, generarTokenDispositivo, obtenerCorreoReenvio, actualizarFuente } from '@/app/app/ajustes/conectores';
import { Mail, Bitcoin, RefreshCw, Smartphone, Forward, Copy } from 'lucide-react';

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
const BUILD = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);

type Sec = 'perfil' | 'seguridad' | 'notificaciones' | 'fuentes' | 'familia' | 'exportar' | null;

const ITEMS: { id: Exclude<Sec, null> | 'plan'; label: string; sub: string; icon: typeof User }[] = [
  { id: 'perfil', label: 'Perfil', sub: 'Nombre, días de pago e ingreso', icon: User },
  { id: 'fuentes', label: 'Cuentas conectadas', sub: 'Bancos, importaciones y su estado', icon: Link2 },
  { id: 'seguridad', label: 'Cuenta y seguridad', sub: 'Correo, contraseña y borrado', icon: Shield },
  { id: 'notificaciones', label: 'Notificaciones', sub: 'Cobros, MSI y suscripciones nuevas', icon: Bell },
  { id: 'plan', label: 'Plan', sub: 'Premium · prueba y facturación', icon: Crown },
  { id: 'familia', label: 'Familia', sub: 'Gastos por integrante (pronto)', icon: Users },
  { id: 'exportar', label: 'Exportar datos', sub: 'Descarga tus movimientos en CSV', icon: Download },
];

export function Ajustes({ usuario, perfil, links, seccionInicial, modoMock, gmailConfigurado, outlookConfigurado, aviso }: { usuario: UsuarioSesion; perfil: Perfil; links: Fuente[]; seccionInicial?: string; modoMock: boolean; gmailConfigurado: boolean; outlookConfigurado: boolean; aviso?: string | null }) {
  const [sec, setSec] = useState<Sec>((seccionInicial as Sec) ?? null);
  const router = useRouter();

  if (sec) {
    return (
      <div className="mx-auto max-w-settings animate-screen space-y-4">
        <button type="button" onClick={() => setSec(null)} className="flex items-center gap-1 text-[13px] font-semibold text-green-dark dark:text-green-light"><ChevronLeft size={16} /> Ajustes</button>
        {sec === 'perfil' && <SecPerfil perfil={perfil} usuario={usuario} />}
        {sec === 'fuentes' && <SecFuentes links={links} gmailConfigurado={gmailConfigurado} outlookConfigurado={outlookConfigurado} aviso={aviso} />}
        {sec === 'seguridad' && <SecSeguridad usuario={usuario} modoMock={modoMock} />}
        {sec === 'notificaciones' && <SecNotificaciones />}
        {sec === 'familia' && <div className="card p-5 text-[13px] text-txt-2 dark:text-fg-2">Familia llega después de la beta: integrantes, cuentas compartidas y gastos por hijo.</div>}
        {sec === 'exportar' && (
          <div className="card space-y-3 p-5">
            <p className="text-[13px] text-txt-2 dark:text-fg-2">Descarga todos tus movimientos categorizados en CSV (se abre en Excel o Numbers).</p>
            <a href="/api/exportar" className="btn-primary inline-flex h-11 items-center gap-2 px-5 text-[13px]"><Download size={16} /> Descargar CSV</a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-settings space-y-4">
      <div className="card flex items-center gap-3.5 p-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-display text-[18px] font-bold text-white dark:bg-white dark:text-ink">{usuario.iniciales}</span>
        <div className="min-w-0">
          <div className="truncate font-display text-[16px] font-bold">{perfil.nombre || usuario.nombre}</div>
          <div className="truncate text-[12.5px] text-txt-2 dark:text-fg-2">{usuario.email}</div>
          <div className="mt-0.5 text-[11.5px] font-semibold text-green-dark dark:text-green-light">{perfil.plan === 'premium' ? 'Premium' : perfil.plan === 'trial' ? `Prueba gratis hasta el ${fechaCorta(perfil.trialTermina)}` : 'Plan vencido'}</div>
        </div>
      </div>
      <ul className="card divide-y divide-edge overflow-hidden p-0">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const inner = (
            <>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2"><Icon size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold">{it.label}</span>
                <span className="block truncate text-[11.5px] text-txt-2 dark:text-fg-2">{it.sub}</span>
              </span>
              <ChevronRight size={18} className="text-txt-3" />
            </>
          );
          return (
            <li key={it.id}>
              {it.id === 'plan' ? (
                <Link href="/app/planes" className="flex h-[64px] items-center gap-3 px-4 hover:bg-bg-hover dark:hover:bg-surface-2">{inner}</Link>
              ) : (
                <button type="button" onClick={() => setSec(it.id as Sec)} className="flex h-[64px] w-full items-center gap-3 px-4 text-left hover:bg-bg-hover dark:hover:bg-surface-2">{inner}</button>
              )}
            </li>
          );
        })}
        <li>
          <form action={cerrarSesion}>
            <button type="submit" className="flex h-[64px] w-full items-center gap-3 px-4 text-left hover:bg-bg-hover dark:hover:bg-surface-2">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2"><LogOut size={18} /></span>
              <span className="text-[14px] font-bold">Cerrar sesión</span>
            </button>
          </form>
        </li>
      </ul>
      <footer className="space-y-1.5 text-center text-[11px] text-txt-3">
        <p className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <Link href="/legal/privacidad" className="hover:text-fg">Aviso de privacidad</Link>
          <Link href="/legal/terminos" className="hover:text-fg">Términos</Link>
          <a href="mailto:hola@moneymaker.mx" className="hover:text-fg">hola@moneymaker.mx</a>
          <button type="button" onClick={() => router.push('/app/planes')} className="hover:text-fg">Planes</button>
        </p>
        <p>MoneyMaker v{VERSION}{BUILD ? ` · ${BUILD}` : ''} · {modoMock ? 'modo demo' : 'cuenta real'}</p>
        <p>No somos una institución financiera. No movemos dinero ni damos asesoría de inversión.</p>
      </footer>
    </div>
  );
}

function SecPerfil({ perfil, usuario }: { perfil: Perfil; usuario: UsuarioSesion }) {
  const [nombre, setNombre] = useState(perfil.nombre || usuario.nombre);
  const [dias, setDias] = useState<number[]>(perfil.diasPago ?? [5, 20]);
  const [ingreso, setIngreso] = useState(perfil.ingresoQuincenal ? String(perfil.ingresoQuincenal) : '');
  const [msg, setMsg] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const toggleDia = (d: number) => setDias((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d].sort((a, b) => a - b)));
  const guardar = () =>
    start(async () => {
      const r = await actualizarPerfil({ nombre, diasPago: dias, ingresoQuincenal: ingreso ? Number(ingreso) : null });
      setMsg(r.ok ? 'Guardado. Recalculamos tu quincena y presupuesto.' : r.error);
      router.refresh();
    });
  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-display text-[18px] font-bold">Perfil</h2>
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <div>
        <div className="mb-1.5 text-[12.5px] font-semibold">Días en que te pagan</div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <button key={d} type="button" aria-pressed={dias.includes(d)} onClick={() => toggleDia(d)} className={cn('h-9 rounded-[10px] text-[12.5px] font-bold transition-colors', dias.includes(d) ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-bg-muted text-txt-2 dark:bg-surface-2')}>{d}</button>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-txt-2 dark:text-fg-2">Quincena típica: 5 y 20. Un solo día = presupuesto mensual.</p>
      </div>
      <Input label="Ingreso por quincena" value={ingreso} onChange={(e) => setIngreso(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="14500" hint="Si lo dejas vacío lo estimamos con tus depósitos de nómina." />
      {msg && <p className="text-[12.5px] font-semibold text-green-dark dark:text-green-light">{msg}</p>}
      <Button onClick={guardar} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar'}</Button>
    </div>
  );
}

function SecFuentes({ links, gmailConfigurado, outlookConfigurado, aviso }: { links: Fuente[]; gmailConfigurado: boolean; outlookConfigurado: boolean; aviso?: string | null }) {
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const [bitsoKey, setBitsoKey] = useState('');
  const [bitsoSecret, setBitsoSecret] = useState('');
  const [msg, setMsg] = useState<string | null>(aviso ?? null);
  const gmail = links.find((l) => l.proveedor === 'gmail');
  const outlook = links.find((l) => l.proveedor === 'outlook');
  const bitso = links.find((l) => l.proveedor === 'bitso');
  const dispositivo = links.find((l) => l.proveedor === 'dispositivo');
  const [token, setToken] = useState<string | null>(null);
  const [reenvio, setReenvio] = useState<{ direccion: string; activo: boolean } | null>(null);
  const copiar = (t: string) => { try { void navigator.clipboard.writeText(t); setMsg('Copiado.'); } catch { setMsg(t); } };
  const sync = (p: 'gmail' | 'outlook' | 'bitso') => start(async () => { const r = await sincronizarConector(p); setMsg(r.ok ? `Listo: ${r.insertados} movimientos nuevos.` : r.error ?? 'No se pudo sincronizar.'); router.refresh(); });
  const desconectar = (p: 'gmail' | 'outlook' | 'bitso', nombre: string) => confirm(`¿Desconectar ${nombre}?`) && start(async () => { await desconectarConector(p); router.refresh(); });
  const ESTADO: Record<Fuente['estado'], { label: string; cls: string }> = {
    ok: { label: 'Conectada', cls: 'bg-green-50 text-green-dark dark:text-green-light dark:bg-surface-2' },
    mfa: { label: 'Requiere token', cls: 'bg-warning-soft text-warning dark:bg-surface-2' },
    roto: { label: 'Reconectar', cls: 'bg-negative-50 text-negative dark:bg-surface-2' },
    pendiente: { label: 'Sincronizando', cls: 'bg-bg-muted text-txt-2 dark:bg-surface-2' },
  };
  return (
    <div className="card p-5">
      <h2 className="font-display text-[18px] font-bold">Cuentas conectadas</h2>
      <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">Solo lectura. Eliminar una conexión borra sus cuentas y movimientos de MoneyMaker y revoca el acceso en el proveedor.</p>
      <ul className="mt-3 divide-y divide-edge">
        {links.map((l) => (
          <li key={l.id} className="flex h-16 items-center gap-3">
            <Avatar domain={l.institucionDominio} nombre={l.institucion} size={40} logoPct={60} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-bold">{l.institucion}</div>
              <div className="text-[11px] text-txt-2 dark:text-fg-2">{l.proveedor === 'belvo' ? 'Belvo' : l.proveedor === 'import' ? 'Estado de cuenta' : l.proveedor === 'gmail' ? 'Gmail' : l.proveedor === 'outlook' ? 'Outlook' : l.proveedor === 'dispositivo' ? 'App Android' : l.proveedor === 'correo' ? 'Correo reenviado' : l.proveedor === 'bitso' ? 'Bitso' : 'Manual'}{l.ultimoSync ? ` · ${fechaCorta(l.ultimoSync)}` : ''}</div>
            </div>
            <span className={cn('rounded-pill px-2 py-0.5 text-[10.5px] font-bold', ESTADO[l.estado].cls)}>{ESTADO[l.estado].label}</span>
            {(l.proveedor === 'belvo' || l.proveedor === 'manual') && l.externalId && (
              <button type="button" aria-label={`Actualizar ${l.institucion}`} disabled={pendiente} onClick={() => start(async () => { const r = await actualizarFuente(l.id); setMsg(r.ok ? `${l.institucion}: ${r.insertados} movimientos nuevos.` : r.error); router.refresh(); })} className="flex h-8 w-8 items-center justify-center rounded-full text-txt-3 hover:bg-bg-muted"><RefreshCw size={15} className={cn(pendiente && 'animate-spin')} /></button>
            )}
            <button type="button" aria-label="Eliminar" disabled={pendiente} onClick={() => confirm(`¿Eliminar la conexión con ${l.institucion}?`) && start(async () => { await eliminarFuente(l.id); router.refresh(); })} className="flex h-8 w-8 items-center justify-center rounded-full text-txt-3 hover:bg-bg-muted"><Trash2 size={15} /></button>
          </li>
        ))}
        {links.length === 0 && <li className="py-6 text-center text-[12.5px] text-txt-2">Aún no hay conexiones.</li>}
      </ul>
      <Link href="/app/importar" className="btn-primary mt-3 inline-flex h-10 items-center px-4 text-[12.5px]">Agregar cuenta</Link>

      {msg && <p className="mt-4 rounded-input bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green-dark dark:text-green-light dark:bg-surface-2">{msg}</p>}

      <div className="mt-6 border-t border-edge pt-5">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-bold"><Mail size={16} /> Alertas de tu correo</h3>
        <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">Leemos solo las alertas de compra de tu banco y los recibos de tiendas y apps (Amazon, Uber, Rappi…) para que cada cargo aparezca al instante y con detalle. Nunca leemos otros correos.</p>
        {([['gmail', 'Gmail', gmail, gmailConfigurado, '/api/gmail/auth'], ['outlook', 'Outlook / Hotmail', outlook, outlookConfigurado, '/api/outlook/auth']] as const).map(([p, nombre, link, configurado, href]) => (
          <div key={p} className="mt-3 flex flex-wrap items-center gap-2">
            {link ? (
              <>
                <span className="rounded-pill bg-green-50 px-2.5 py-1 text-[11.5px] font-bold text-green-dark dark:text-green-light dark:bg-surface-2">{nombre} · {link.externalId}</span>
                <button type="button" disabled={pendiente} onClick={() => sync(p)} className="flex h-9 items-center gap-1.5 rounded-pill border border-line-2 px-3 text-[12px] font-semibold dark:border-edge"><RefreshCw size={13} className={cn(pendiente && 'animate-spin')} /> Leer ahora</button>
                <button type="button" disabled={pendiente} onClick={() => desconectar(p, nombre)} className="h-9 rounded-pill px-3 text-[12px] font-semibold text-txt-2">Desconectar</button>
              </>
            ) : configurado ? (
              <a href={href} className="btn-primary inline-flex h-10 items-center gap-2 px-4 text-[12.5px]"><Mail size={15} /> Conectar {nombre}</a>
            ) : (
              <span className="text-[12px] text-txt-3">{nombre}: disponible cuando se configure el acceso ({p === 'gmail' ? 'GOOGLE_CLIENT_ID / SECRET' : 'MS_CLIENT_ID / SECRET'}).</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-edge pt-5">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-bold"><Smartphone size={16} /> Notificaciones de tu teléfono (Android)</h3>
        <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">La app de MoneyMaker para Android lee las notificaciones de tus apps bancarias (BBVA, Nu, Banorte, Santander, HSBC, Hey, Klar, Stori, Mercado Pago) y cada cargo aparece aquí en segundos. Sin claves del banco.</p>
        {token ? (
          <div className="mt-3 rounded-card bg-ink p-4 text-white">
            <div className="text-[11px] font-semibold text-green-light">Tu código de vinculación (se muestra una sola vez)</div>
            <div className="mt-1 break-all font-mono text-[13px]">{token}</div>
            <button type="button" onClick={() => copiar(token)} className="mt-3 flex h-9 items-center gap-1.5 rounded-pill bg-white px-3 text-[12px] font-bold text-ink"><Copy size={13} /> Copiar</button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {dispositivo && <span className="rounded-pill bg-green-50 px-2.5 py-1 text-[11.5px] font-bold text-green-dark dark:text-green-light dark:bg-surface-2">Vinculado</span>}
            <button type="button" disabled={pendiente} onClick={() => start(async () => { const r = await generarTokenDispositivo(); setToken(r.token); router.refresh(); })} className="btn-primary inline-flex h-10 items-center gap-2 px-4 text-[12.5px]"><Smartphone size={15} /> {dispositivo ? 'Generar código nuevo' : 'Vincular mi teléfono'}</button>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-edge pt-5">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-bold"><Forward size={16} /> Reenvía tus recibos y alertas</h3>
        <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">¿No quieres conectar tu correo? Reenvía a tu dirección de MoneyMaker las alertas del banco y los recibos de Amazon, Uber, Rappi o Mercado Libre. Sacamos el movimiento y el detalle; el correo no se guarda.</p>
        {reenvio ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-bg-muted px-3 py-1.5 font-mono text-[12.5px] dark:bg-surface-2">{reenvio.direccion}</span>
            <button type="button" onClick={() => copiar(reenvio.direccion)} className="flex h-9 items-center gap-1.5 rounded-pill border border-line-2 px-3 text-[12px] font-semibold dark:border-edge"><Copy size={13} /> Copiar</button>
            {!reenvio.activo && <span className="text-[11.5px] text-txt-3">Se activa cuando el buzón esté configurado en el servidor.</span>}
          </div>
        ) : (
          <button type="button" disabled={pendiente} onClick={() => start(async () => { const r = await obtenerCorreoReenvio(); setReenvio({ direccion: r.direccion, activo: r.activo }); })} className="mt-3 inline-flex h-10 items-center gap-2 rounded-pill border border-line-2 px-4 text-[12.5px] font-semibold dark:border-edge"><Forward size={15} /> Ver mi dirección de reenvío</button>
        )}
      </div>

      <div className="mt-6 border-t border-edge pt-5">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-bold"><Bitcoin size={16} /> Bitso (llaves de API de solo lectura)</h3>
        <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">En Bitso: Perfil → API → Crear llave con permisos solo de <b>consulta</b> (sin retiros ni trading). Se guardan cifradas.</p>
        {bitso ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-green-50 px-2.5 py-1 text-[11.5px] font-bold text-green-dark dark:text-green-light dark:bg-surface-2">Conectado</span>
            <button type="button" disabled={pendiente} onClick={() => sync('bitso')} className="flex h-9 items-center gap-1.5 rounded-pill border border-line-2 px-3 text-[12px] font-semibold dark:border-edge"><RefreshCw size={13} className={cn(pendiente && 'animate-spin')} /> Actualizar</button>
            <button type="button" disabled={pendiente} onClick={() => desconectar('bitso', 'Bitso')} className="h-9 rounded-pill px-3 text-[12px] font-semibold text-txt-2">Desconectar</button>
          </div>
        ) : (
          <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await guardarLlavesBitso(bitsoKey, bitsoSecret); setMsg(r.ok ? `Bitso conectado: ${money(r.total)}` : r.error); if (r.ok) { setBitsoKey(''); setBitsoSecret(''); router.refresh(); } }); }}>
            <Input value={bitsoKey} onChange={(e) => setBitsoKey(e.target.value)} placeholder="API key" autoComplete="off" />
            <Input value={bitsoSecret} onChange={(e) => setBitsoSecret(e.target.value)} placeholder="API secret" type="password" autoComplete="off" />
            <Button type="submit" disabled={pendiente || !bitsoKey || !bitsoSecret}>{pendiente ? 'Probando…' : 'Conectar'}</Button>
          </form>
        )}
      </div>
    </div>
  );
}

function SecSeguridad({ usuario, modoMock }: { usuario: UsuarioSesion; modoMock: boolean }) {
  const [confirmar, setConfirmar] = useState('');
  const [pendiente, start] = useTransition();
  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-5">
        <h2 className="font-display text-[18px] font-bold">Cuenta y seguridad</h2>
        <div className="text-[13px]"><span className="text-txt-2 dark:text-fg-2">Correo:</span> <b>{usuario.email}</b></div>
        <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Para cambiar tu contraseña, cierra sesión y usa &quot;¿Olvidaste tu contraseña?&quot; en el inicio de sesión. Nunca guardamos claves bancarias; Belvo maneja la conexión con tu banco.</p>
      </div>
      <div className="card space-y-3 border border-negative/30 p-5">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-bold"><AlertTriangle size={16} className="text-negative" /> Borrar mi cuenta</h3>
        <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Elimina tus cuentas, movimientos, presupuestos e insights, y revoca las conexiones bancarias. No se puede deshacer.{modoMock ? ' (En modo demo solo reinicia los datos.)' : ''}</p>
        <Input label='Escribe "BORRAR" para confirmar' value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        <Button variant="outline" disabled={confirmar !== 'BORRAR' || pendiente} onClick={() => start(async () => { await borrarCuenta(); })} className="text-negative">{pendiente ? 'Borrando…' : 'Borrar todo'}</Button>
      </div>
    </div>
  );
}

function SecNotificaciones() {
  const [prefs, setPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mm-notif') || '{}') as Record<string, boolean>;
    } catch {
      return {};
    }
  });
  const OPC = [
    ['cobros', 'Recordatorio un día antes de cada cargo fijo'],
    ['msi', 'Cuando un MSI está por terminar'],
    ['suscripcion', 'Cuando aparece una suscripción nueva'],
    ['quincena', 'Resumen al inicio de cada quincena'],
    ['excedido', 'Cuando una categoría rebasa su presupuesto'],
  ];
  const toggle = (k: string) => {
    const n = { ...prefs, [k]: !(prefs[k] ?? true) };
    setPrefs(n);
    try {
      localStorage.setItem('mm-notif', JSON.stringify(n));
    } catch {}
  };
  return (
    <div className="card p-5">
      <h2 className="font-display text-[18px] font-bold">Notificaciones</h2>
      <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">Por correo y, si instalas la app, en tu teléfono.</p>
      <ul className="mt-3 divide-y divide-edge">
        {OPC.map(([k, label]) => {
          const on = prefs[k] ?? true;
          return (
            <li key={k} className="flex h-14 items-center gap-3">
              <span className="flex-1 text-[13px]">{label}</span>
              <button type="button" role="switch" aria-checked={on} onClick={() => toggle(k)} className={cn('relative h-7 w-12 rounded-pill transition-colors', on ? 'bg-green' : 'bg-line-dashed dark:bg-surface-2')}>
                <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', on ? 'left-6' : 'left-1')} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { money };
