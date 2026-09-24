import Link from 'next/link';
import { ArrowRight, Check, ChevronRight, FileText, Lock, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/shell/Logo';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { EscenaConexion } from './EscenaConexion';
import { ProductoHero } from './ProductoHero';
import { FormCorreo } from './FormCorreo';
import { SiempreClaro } from './SiempreClaro';
import { Revelar } from './Revelar';

// Landing al estilo Apple × Stori: una idea por pantalla, tipografía grande, producto al centro, casi sin texto.
// Cada bloque tiene un titular de una línea, una frase de apoyo y un visual del producto. Nada inventado: sin testimonios.

const MARCAS = [
  ['BBVA', 'bbva.mx'], ['Nu', 'nu.com.mx'], ['Amex', 'americanexpress.com'], ['Banorte', 'banorte.com'], ['Santander', 'santander.com.mx'], ['HSBC', 'hsbc.com.mx'],
  ['Banamex', 'banamex.com'], ['Hey', 'heybanco.com'], ['Klar', 'klar.mx'], ['Stori', 'storicard.com'], ['Mercado Pago', 'mercadopago.com.mx'], ['GBM+', 'gbm.com'], ['Bitso', 'bitso.com'],
];

const SUSCRIPCIONES = [
  ['Netflix', 'netflix.com', '$249', 'desde ene 2024'],
  ['Spotify', 'spotify.com', '$129', 'desde mar 2023'],
  ['HBO Max', 'max.com', '$149', 'sin usar 3 meses'],
  ['Smart Fit', 'smartfit.com.mx', '$499', 'sin usar 2 meses'],
];

function Seccion({ id, className = '', children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-[1120px] px-5 md:px-8">{children}</div>
    </section>
  );
}

function Titular({ children, sub, tono = 'claro', align = 'center' }: { children: React.ReactNode; sub?: string; tono?: 'claro' | 'oscuro'; align?: 'center' | 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-[760px] text-center' : 'max-w-[640px]'}>
      <h2 className={`font-display font-bold leading-[1.02] tracking-[-1.6px] ${tono === 'oscuro' ? 'text-white' : 'text-fg'}`} style={{ fontSize: 'clamp(34px, 5vw, 58px)' }}>{children}</h2>
      {sub && <p className={`mt-4 text-[17px] leading-relaxed md:text-[20px] ${tono === 'oscuro' ? 'text-white/70' : 'text-txt-2 dark:text-fg-2'}`}>{sub}</p>}
    </div>
  );
}

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
const BUILD = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);

export function Landing({ sesion = false }: { sesion?: boolean }) {
  return (
    <div className="bg-surface text-fg">
      <SiempreClaro />
      <header className="sticky top-0 z-30 border-b border-edge bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="MoneyMaker, inicio"><Logo size={26} /><span className="font-display text-[15px] font-bold">MoneyMaker</span></Link>
          <nav className="ml-auto flex items-center gap-1 text-[13px] font-semibold" aria-label="Principal">
            {sesion ? (
              <Link href="/app" className="btn-primary flex h-9 items-center gap-1.5 px-4 text-[13px]">Ir a mi panel <ArrowRight size={14} /></Link>
            ) : (
              <>
                <Link href="/login" className="rounded-pill px-4 py-2 text-fg hover:bg-bg-muted dark:hover:bg-surface-2">Entrar</Link>
                <Link href="/registro" className="btn-primary flex h-9 items-center px-4 text-[13px]">Empezar</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
      {/* 1. Una promesa. El producto. Un botón. */}
      <section className="relative overflow-hidden bg-surface text-fg">
        <span className="pointer-events-none absolute left-1/2 top-[-320px] h-[760px] w-[760px] -translate-x-1/2 rounded-full bg-green-100 blur-[120px]" aria-hidden />
        <div className="relative mx-auto max-w-[1120px] px-5 pb-0 pt-20 text-center md:px-8 md:pt-28">
          <h1 className="mx-auto max-w-[900px] font-display font-bold leading-[0.98] tracking-[-2.4px] animate-rise" style={{ fontSize: 'clamp(46px, 8vw, 96px)' }}>
            Tu dinero, claro.
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-[18px] leading-relaxed text-txt-2 animate-rise [animation-delay:120ms] md:text-[22px]">Todas tus cuentas. Cada quincena. Sin darnos tus claves.</p>
          <div className="mx-auto mt-8 max-w-[460px] animate-rise [animation-delay:220ms]">
            {sesion ? (
              <Link href="/app" className="btn-primary mx-auto flex h-[54px] w-full max-w-[320px] items-center justify-center gap-2 text-[16px]">Ir a mi panel <ArrowRight size={18} /></Link>
            ) : (
              <FormCorreo />
            )}
          </div>
          <p className="mt-3 text-[12.5px] text-txt-2 animate-rise [animation-delay:300ms]">7 días gratis · Cancela cuando quieras</p>
          <div className="relative mt-14 animate-rise [animation-delay:380ms] md:mt-20">
            <ProductoHero />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-surface to-transparent" aria-hidden />
          </div>
        </div>
      </section>

      {/* 2. Marcas: una sola fila, sin cifras inventadas */}
      <section className="border-b border-edge py-7" aria-label="Bancos que reconocemos">
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div className="flex w-max gap-3 whitespace-nowrap animate-marquee">
            {[...MARCAS, ...MARCAS].map(([n, d], i) => (
              <span key={i} className="inline-flex items-center gap-2 rounded-pill border border-edge py-1.5 pl-1.5 pr-4 text-[13px] font-semibold text-txt-2 dark:text-fg-2">
                <BrandLogo domain={d} nombre={n} size={26} logoPct={70} />{n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Conecta todo */}
      <Seccion id="conecta" className="bg-bg-page py-24 md:py-32">
        <Revelar>
          <Titular sub="Sube el estado de cuenta que ya te manda tu banco. Dos minutos después, cada movimiento tiene nombre, categoría y detalle.">Todo tu dinero, en un lugar.</Titular>
        </Revelar>
        <Revelar delay={150} className="mt-14">
          <EscenaConexion tono="claro" />
        </Revelar>
      </Seccion>

      {/* 4. Lo que te sobra */}
      <Seccion className="py-24 md:py-32">
        <Revelar>
          <Titular sub="Ingreso menos fijos, menos meses sin intereses, menos tu gasto habitual. Antes de gastarlo, no después.">Sabe cuánto te queda esta quincena.</Titular>
        </Revelar>
        <Revelar delay={150} className="mt-12">
          <div className="mx-auto grid max-w-[880px] gap-4 md:grid-cols-3">
            {[
              ['Nómina', '$14,500', 'lo que entra', 'text-fg'],
              ['Compromisos', '−$11,350', 'fijos, MSI y gasto habitual', 'text-negative'],
              ['Puedes invertir', '$3,150', 'esta quincena', 'text-green-dark dark:text-green-light'],
            ].map(([l, v, d, c], i) => (
              <div key={String(l)} className={`card rounded-card-xl p-7 text-center ${i === 2 ? 'ring-2 ring-green' : ''}`}>
                <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-txt-2 dark:text-fg-2">{l}</div>
                <div className={`mt-2 font-display text-[40px] font-bold leading-none tracking-[-1.8px] ${c}`}>{v}</div>
                <div className="mt-2 text-[13px] text-txt-2 dark:text-fg-2">{d}</div>
              </div>
            ))}
          </div>
        </Revelar>
      </Seccion>

      {/* 5. Suscripciones */}
      <Seccion className="bg-bg-page py-24 dark:bg-canvas md:py-32">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <Revelar>
            <Titular align="left" sub="Cuánto llevas pagando cada una, desde cuándo y cuáles no usas. Cancelas en dos toques, con el enlace directo a la página de cancelación.">Cancela lo que no usas.</Titular>
            <Link href="/registro" className="mt-8 inline-flex items-center gap-1.5 text-[15px] font-bold text-green-dark dark:text-green-light">Ver mis suscripciones <ChevronRight size={18} /></Link>
          </Revelar>
          <Revelar delay={150}>
            <div className="mx-auto max-w-[420px] rounded-card-xl bg-surface p-3 shadow-hover">
              {SUSCRIPCIONES.map(([n, d, m, s], i) => (
                <div key={String(n)} className={`flex items-center gap-3 rounded-card px-3 py-3 ${i >= 2 ? 'bg-green-50 dark:bg-surface-2' : ''}`}>
                  <BrandLogo domain={String(d)} nombre={String(n)} size={40} />
                  <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{n}</span><span className={`block text-[11.5px] ${i >= 2 ? 'font-semibold text-green-dark dark:text-green-light' : 'text-txt-2 dark:text-fg-2'}`}>{s}</span></span>
                  <span className="font-display text-[14px] font-bold">{m}<span className="text-[11px] font-semibold text-txt-3">/mes</span></span>
                  {i >= 2 && <span className="btn-primary flex h-8 items-center px-3 text-[11px]">Cancelar</span>}
                </div>
              ))}
              <div className="mt-2 rounded-card bg-ink px-4 py-3 text-center text-[13px] font-bold text-white">Ahorras $7,776 al año</div>
            </div>
          </Revelar>
        </div>
      </Seccion>

      {/* 6. Detalle que nadie da */}
      <Seccion className="py-24 md:py-32">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <Revelar delay={150} className="order-2 md:order-1">
            <div className="mx-auto max-w-[420px] space-y-2">
              {[
                ['Amazon', 'amazon.com.mx', '$1,299', 'Secadora Remington · 1 de 6 MSI'],
                ['Uber', 'uber.com', '$132', 'Roma Norte → Polanco · 22 min'],
                ['Rappi', 'rappi.com.mx', '$248', 'Sushi Roll · 2 artículos'],
                ['Mercado Libre', 'mercadolibre.com.mx', '$589', 'Audífonos Sony · llega el jueves'],
              ].map(([n, d, m, det]) => (
                <div key={n} className="card flex items-center gap-3 px-3.5 py-3">
                  <BrandLogo domain={d} nombre={n} size={40} />
                  <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold">{n}</span><span className="block truncate text-[12px] text-txt-2 dark:text-fg-2">{det}</span></span>
                  <span className="font-display text-[14px] font-bold">{m}</span>
                </div>
              ))}
            </div>
          </Revelar>
          <Revelar className="order-1 md:order-2">
            <Titular align="left" sub="Tu banco dice “AMAZON MX”. Nosotros te decimos qué compraste, a cuántos meses y cuándo llega. Con Uber, de dónde a dónde.">Cada cargo, con detalle.</Titular>
          </Revelar>
        </div>
      </Seccion>

      {/* 7. Seguridad, en tres palabras */}
      <Seccion className="border-y border-edge py-16">
        <Revelar>
          <ul className="grid gap-6 text-center md:grid-cols-3">
            {[[Lock, 'Sin claves del banco', 'Nunca pedimos tu usuario ni tu contraseña.'], [FileText, 'El PDF se descarta', 'Se lee en memoria y no se guarda.'], [ShieldCheck, 'Solo tú ves lo tuyo', 'Reglas de acceso por usuario en la base de datos.']].map(([I, t, d]) => {
              const Icon = I as typeof Lock;
              return (
                <li key={String(t)}>
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><Icon size={20} /></span>
                  <div className="mt-3 font-display text-[16px] font-bold">{String(t)}</div>
                  <div className="mt-1 text-[13px] text-txt-2 dark:text-fg-2">{String(d)}</div>
                </li>
              );
            })}
          </ul>
        </Revelar>
      </Seccion>

      {/* 8. Precio, una vez */}
      <Seccion id="precio" className="py-24 md:py-32">
        <Revelar>
          <Titular sub="Menos de $9 al día. Una suscripción olvidada cuesta más.">$250 al mes. 7 días gratis.</Titular>
        </Revelar>
        <Revelar delay={120} className="mx-auto mt-10 max-w-[520px]">
          <ul className="grid gap-2.5 text-[14.5px] sm:grid-cols-2">
            {['Estados de cuenta ilimitados', 'Presupuesto por quincena', 'Suscripciones y MSI', 'Cuánto puedes invertir', 'Patrimonio y objetivos', 'Insights explicables'].map((b) => (
              <li key={b} className="flex items-center gap-2.5"><Check size={17} className="flex-none text-green-dark dark:text-green-light" /> {b}</li>
            ))}
          </ul>
          <Link href={sesion ? '/app' : '/registro'} className="btn-primary mt-8 flex h-[54px] items-center justify-center gap-2 text-[16px]">{sesion ? 'Ir a mi panel' : 'Empezar 7 días gratis'} <ArrowRight size={18} /></Link>
          <p className="mt-3 text-center text-[12px] text-txt-3">Sin tarjeta para empezar. Cancela desde Ajustes.</p>
        </Revelar>
      </Seccion>
      </main>

      <footer className="border-t border-edge py-8 text-center text-[12px] text-txt-3">
        <div className="flex flex-wrap justify-center gap-4"><Link href="/legal/privacidad">Aviso de privacidad</Link><Link href="/legal/terminos">Términos</Link><a href="mailto:hola@moneymaker.mx">hola@moneymaker.mx</a></div>
        <p className="mt-3">© {new Date().getFullYear()} MoneyMaker. No somos una institución financiera; no movemos dinero ni damos asesoría de inversión.</p>
        <p className="mt-2 text-[11px]">Versión {VERSION}{BUILD ? ` · build ${BUILD}` : ''}</p>
      </footer>
    </div>
  );
}
