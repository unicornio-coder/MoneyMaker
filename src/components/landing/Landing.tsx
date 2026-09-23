import Link from 'next/link';
import { ArrowRight, Check, ChevronRight, FileText, Landmark, Lock, Mail, Repeat, ShieldCheck, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { Logo } from '@/components/shell/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { TelefonoAnimado } from './TelefonoAnimado';
import { FormCorreo } from './FormCorreo';
import { Revelar } from './Revelar';

// Landing con una sola promesa, una sola oferta y un solo precio. Nada inventado: sin testimonios ni cifras de usuarios.
// Estructura: promesa → prueba visual → problema → cómo funciona → qué obtienes → seguridad → oferta → preguntas → cierre.

const BANCOS = [
  { nombre: 'BBVA', dominio: 'bbva.mx' },
  { nombre: 'Nu', dominio: 'nu.com.mx' },
  { nombre: 'American Express', dominio: 'americanexpress.com' },
  { nombre: 'Banorte', dominio: 'banorte.com' },
  { nombre: 'Santander', dominio: 'santander.com.mx' },
  { nombre: 'HSBC', dominio: 'hsbc.com.mx' },
  { nombre: 'Banamex', dominio: 'banamex.com' },
  { nombre: 'Scotiabank', dominio: 'scotiabank.com.mx' },
  { nombre: 'Hey Banco', dominio: 'heybanco.com' },
  { nombre: 'Klar', dominio: 'klar.mx' },
  { nombre: 'Stori', dominio: 'storicard.com' },
  { nombre: 'Mercado Pago', dominio: 'mercadopago.com.mx' },
  { nombre: 'GBM+', dominio: 'gbm.com' },
  { nombre: 'Bitso', dominio: 'bitso.com' },
  { nombre: 'CetesDirecto', dominio: 'cetesdirecto.com' },
];

const PROBLEMAS = [
  { icon: Wallet, titulo: 'No sabes cuánto te queda', texto: 'El saldo del banco no descuenta la renta, la tarjeta ni lo que ya prometiste. Llegas al 20 adivinando.' },
  { icon: Repeat, titulo: 'Pagas cosas que no usas', texto: 'Suscripciones de $149 que se cobran solas. Tres de ellas son $5,000 al año que no ves.' },
  { icon: Landmark, titulo: 'Los meses sin intereses se acumulan', texto: 'Cada compra a 12 meses parece pequeña. Juntas, se comen una parte de cada quincena.' },
];

const PASOS = [
  { n: '1', titulo: 'Sube tu estado de cuenta', texto: 'El PDF que ya te manda tu banco. Uno o varios, de tarjeta o de débito. Con contraseña también.' },
  { n: '2', titulo: 'Lo leemos y lo ordenamos', texto: 'Cada movimiento con su categoría. Suscripciones, meses sin intereses y nómina detectados solos.' },
  { n: '3', titulo: 'Cada quincena sabes qué hacer', texto: 'Cuánto te queda, qué cancelar y cuánto puedes invertir. Antes de gastarlo, no después.' },
];

const OBTIENES: { icon: typeof Wallet; titulo: string; texto: string; demo: React.ReactNode }[] = [
  { icon: Wallet, titulo: 'Tu quincena, en un número', texto: 'Ingreso menos fijos, menos meses sin intereses, menos tu gasto habitual. Lo que queda es tuyo.', demo: <Demo filas={[['Nómina', '$14,500'], ['Fijos y suscripciones', '−$4,200'], ['Meses sin intereses', '−$1,000'], ['Gasto habitual', '−$6,300']]} total="Puedes invertir $3,000" /> },
  { icon: Repeat, titulo: 'Suscripciones con su costo real', texto: 'Cuánto llevas pagando cada una, desde cuándo y cuándo vuelve a cobrarse. Cancelas en dos toques.', demo: <Demo filas={[['Netflix', '$249/mes'], ['Spotify', '$129/mes'], ['Gym', '$499/mes']]} total="$10,524 al año" /> },
  { icon: Landmark, titulo: 'Meses sin intereses, todos juntos', texto: 'Cuántos tienes, cuánto suman al mes y en qué fecha se libera cada uno.', demo: <Demo filas={[['Liverpool', '5 de 12'], ['Amazon', '2 de 6'], ['Coppel', '9 de 18']]} total="$2,300 al mes hasta marzo" /> },
  { icon: TrendingUp, titulo: 'Un presupuesto que se arma solo', texto: 'Con tus datos, no con promedios de nadie. Por quincena, porque así te pagan.', demo: <Barras /> },
];

const PREGUNTAS = [
  ['¿Es seguro subir mi estado de cuenta?', 'El PDF se procesa en memoria y se descarta. No lo guardamos, y la contraseña tampoco. Solo quedan los movimientos, en tu cuenta, cifrados y visibles únicamente para ti.'],
  ['¿Necesito darles las claves de mi banco?', 'No. Nunca pedimos usuario ni contraseña de tu banca en línea. Solo lectura de un archivo que ya tienes.'],
  ['¿Mueven mi dinero?', 'No. No somos una institución financiera. Cuando te decimos "paga tu tarjeta", te llevamos a la app de tu banco.'],
  ['¿Qué bancos funcionan?', 'Cualquier banco mexicano que te mande un estado de cuenta en PDF: BBVA, Nu, Amex, Banorte, Santander, HSBC, Banamex, Hey, Klar, Stori y más. También casas de bolsa como GBM+ y exchanges como Bitso.'],
  ['¿Qué pasa cuando terminan los 7 días?', 'Si te sirve, sigues por $250 al mes. Si no, cancelas desde Ajustes y no se cobra nada. Sin llamadas ni letras chiquitas.'],
];

function Demo({ filas, total }: { filas: [string, string][]; total: string }) {
  return (
    <div className="rounded-16 bg-ink p-4 text-white">
      <ul className="space-y-2 text-[12.5px]">
        {filas.map(([a, b]) => (
          <li key={a} className="flex items-center justify-between border-b border-white/10 pb-2 last:border-b-0"><span className="text-white/80">{a}</span><span className="font-display font-bold">{b}</span></li>
        ))}
      </ul>
      <div className="mt-3 font-display text-[16px] font-bold text-green-light">{total}</div>
    </div>
  );
}

function Barras() {
  return (
    <div className="rounded-16 bg-ink p-4 text-white">
      {[['Fijos', 46], ['Meses sin intereses', 16], ['Ahorro', 20], ['Libre', 18]].map(([l, p]) => (
        <div key={String(l)} className="mb-2 last:mb-0">
          <div className="flex justify-between text-[11.5px]"><span className="text-white/80">{l}</span><span className="font-bold">{p} %</span></div>
          <div className="mt-1 h-2 rounded-pill bg-white/12"><div className="h-2 origin-left rounded-pill bg-green-light animate-grow-x" style={{ width: `${p}%`, animationDuration: '900ms' }} /></div>
        </div>
      ))}
    </div>
  );
}

function Seccion({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">{children}</div>
    </section>
  );
}

function Titulo({ etiqueta, children, texto }: { etiqueta: string; children: React.ReactNode; texto?: string }) {
  return (
    <div className="max-w-[640px]">
      <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green">{etiqueta}</div>
      <h2 className="mt-2 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[38px]">{children}</h2>
      {texto && <p className="mt-3 text-[15px] leading-relaxed text-txt-2 dark:text-fg-2 md:text-[16px]">{texto}</p>}
    </div>
  );
}

export function Landing() {
  return (
    <div className="bg-surface text-fg">
      <header className="sticky top-0 z-30 border-b border-edge bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="MoneyMaker, inicio"><Logo /><span className="font-display text-[15px] font-bold">MoneyMaker</span></Link>
          <nav className="ml-4 hidden gap-5 text-[13px] font-semibold text-txt-2 md:flex" aria-label="Secciones">
            <a href="#como-funciona" className="hover:text-fg">Cómo funciona</a><a href="#que-obtienes" className="hover:text-fg">Qué obtienes</a><a href="#seguridad" className="hover:text-fg">Seguridad</a><a href="#precio" className="hover:text-fg">Precio</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="hidden h-10 items-center rounded-pill border border-line-2 px-4 text-[13px] font-semibold hover:bg-bg-hover sm:flex">Iniciar sesión</Link>
            <Link href="/registro" className="btn-primary flex h-10 items-center px-4 text-[13px]">Empezar gratis</Link>
          </div>
        </div>
      </header>

      {/* 1. Promesa */}
      <section className="relative overflow-hidden bg-ink text-white">
        <span className="pointer-events-none absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-green/35 blur-[110px] animate-blob" aria-hidden />
        <span className="pointer-events-none absolute -bottom-40 right-[-160px] h-[560px] w-[560px] rounded-full bg-green-light/20 blur-[120px] animate-blob [animation-delay:-9s]" aria-hidden />
        <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-24">
          <div className="animate-rise">
            <div className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-green-light"><Sparkles size={14} /> Hecho para la quincena mexicana</div>
            <h1 className="mt-5 font-display font-bold leading-[1.02] tracking-[-1.8px]" style={{ fontSize: 'clamp(40px, 5.6vw, 68px)' }}>
              Sabe cuánto te queda esta quincena, antes de gastarlo.
            </h1>
            <p className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-white/80">Sube el estado de cuenta que ya te manda tu banco. En dos minutos ves tus suscripciones, tus meses sin intereses y cuánto puedes invertir. Sin darnos tus claves.</p>
            <div className="mt-8 max-w-[480px]"><FormCorreo /></div>
            <p className="mt-3 text-[12.5px] text-white/60">7 días gratis · Después $250 al mes · Cancela desde Ajustes cuando quieras</p>
            <ul className="mt-8 grid max-w-[540px] grid-cols-1 gap-2 text-[13px] text-white/85 sm:grid-cols-3">
              {[['Solo lectura', ShieldCheck], ['El PDF se descarta', FileText], ['Sin claves del banco', Lock]].map(([t, I]) => {
                const Icon = I as typeof Lock;
                return <li key={String(t)} className="flex items-center gap-2"><Icon size={15} className="flex-none text-green-light" /> {String(t)}</li>;
              })}
            </ul>
          </div>
          <div className="flex justify-center animate-rise [animation-delay:160ms]"><TelefonoAnimado /></div>
        </div>
      </section>

      {/* 2. Bancos que reconocemos (logos reales, sin inventar cifras) */}
      <section className="border-b border-edge py-8" aria-label="Bancos que reconocemos">
        <p className="mb-5 text-center text-[12px] font-bold uppercase tracking-[0.9px] text-txt-2 dark:text-fg-2">Lee estados de cuenta de</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="marquee flex w-max gap-4 whitespace-nowrap">
            {[...BANCOS, ...BANCOS].map((b, i) => (
              <span key={i} className="inline-flex items-center gap-2 rounded-pill border border-edge bg-surface py-1.5 pl-1.5 pr-4 text-[13px] font-semibold text-txt-2 dark:text-fg-2">
                <Avatar domain={b.dominio} nombre={b.nombre} size={26} logoPct={70} />
                {b.nombre}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Problema */}
      <Seccion className="py-16 md:py-24">
        <Revelar>
          <Titulo etiqueta="El problema">Tu banco te dice cuánto tienes. No cuánto te queda.</Titulo>
        </Revelar>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PROBLEMAS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Revelar key={p.titulo} delay={i * 90}>
                <article className="card h-full rounded-card-lg p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-negative-50 text-negative dark:bg-surface-2"><Icon size={20} /></span>
                  <h3 className="mt-4 font-display text-[18px] font-bold leading-snug">{p.titulo}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-txt-2 dark:text-fg-2">{p.texto}</p>
                </article>
              </Revelar>
            );
          })}
        </div>
      </Seccion>

      {/* 4. Cómo funciona */}
      <Seccion id="como-funciona" className="bg-bg-page py-16 dark:bg-canvas md:py-24">
        <Revelar>
          <Titulo etiqueta="Cómo funciona" texto="Sin conectar tu banca en línea, sin capturar nada a mano.">Tres pasos. Dos minutos.</Titulo>
        </Revelar>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {PASOS.map((p, i) => (
            <Revelar key={p.n} delay={i * 90}>
              <li className="relative h-full rounded-card-lg bg-surface p-6 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green font-display text-[15px] font-extrabold text-white">{p.n}</span>
                <h3 className="mt-4 font-display text-[18px] font-bold leading-snug">{p.titulo}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-txt-2 dark:text-fg-2">{p.texto}</p>
              </li>
            </Revelar>
          ))}
        </ol>
        <Revelar delay={300}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/registro" className="btn-primary inline-flex h-12 items-center gap-2 px-6 text-[14px]">Subir mi primer estado de cuenta <ArrowRight size={16} /></Link>
            <span className="text-[12.5px] text-txt-2 dark:text-fg-2">Gratis 7 días. No pedimos tarjeta para empezar.</span>
          </div>
        </Revelar>
      </Seccion>

      {/* 5. Qué obtienes */}
      <Seccion id="que-obtienes" className="py-16 md:py-24">
        <Revelar>
          <Titulo etiqueta="Qué obtienes" texto="Cuatro cosas que ninguna app hecha fuera de México entiende: la quincena, los meses sin intereses, la nómina y el SPEI.">Claridad cada quincena, sin hojas de cálculo.</Titulo>
        </Revelar>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {OBTIENES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Revelar key={f.titulo} delay={(i % 2) * 90}>
                <article className="card grid h-full gap-5 rounded-card-xl p-6 md:grid-cols-[1fr_220px] md:items-center">
                  <div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green dark:bg-surface-2 dark:text-green-light"><Icon size={19} /></span>
                    <h3 className="mt-4 font-display text-[20px] font-bold leading-snug tracking-[-0.4px]">{f.titulo}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-txt-2 dark:text-fg-2">{f.texto}</p>
                  </div>
                  <div>{f.demo}</div>
                </article>
              </Revelar>
            );
          })}
        </div>
      </Seccion>

      {/* 6. Seguridad */}
      <Seccion id="seguridad" className="bg-ink py-16 text-white md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Revelar>
            <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green-light">Seguridad</div>
            <h2 className="mt-2 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[38px]">Tu dinero no se toca. Tu PDF no se guarda.</h2>
            <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-white/75">Diseñado para que puedas confiar sin tener que creer: cada afirmación de esta sección se puede verificar en el producto.</p>
          </Revelar>
          <ul className="grid gap-3">
            {[
              [Lock, 'Nunca pedimos las claves de tu banco', 'Solo lees tú tu banca en línea. Nosotros leemos un PDF.'],
              [FileText, 'El estado de cuenta se procesa y se descarta', 'Ni el archivo ni su contraseña se almacenan. Quedan solo los movimientos.'],
              [ShieldCheck, 'Tus datos, solo para ti', 'Cada usuario ve únicamente lo suyo, con reglas de acceso a nivel de base de datos.'],
              [Wallet, 'No movemos dinero', 'No somos institución financiera ni damos asesoría de inversión. "Pagar" te lleva a la app de tu banco.'],
            ].map(([I, t, d], i) => {
              const Icon = I as typeof Lock;
              return (
                <Revelar key={String(t)} delay={i * 80}>
                  <li className="flex items-start gap-3.5 rounded-card-lg bg-white/[0.06] p-4">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-green-light/15 text-green-light"><Icon size={17} /></span>
                    <div><div className="text-[14.5px] font-bold">{String(t)}</div><div className="mt-0.5 text-[13px] text-white/70">{String(d)}</div></div>
                  </li>
                </Revelar>
              );
            })}
          </ul>
        </div>
      </Seccion>

      {/* 7. Oferta (una sola vez) */}
      <Seccion id="precio" className="py-16 md:py-24">
        <div className="grid items-start gap-8 md:grid-cols-[1fr_400px]">
          <Revelar>
            <Titulo etiqueta="Precio" texto="Una suscripción que canceles o una comisión que evites ya lo paga. Sin plan gratis: es un servicio que trabaja para ti todos los días.">Un solo plan. Se paga solo.</Titulo>
            <ul className="mt-6 space-y-2.5 text-[14px]">
              {['Estados de cuenta ilimitados, de todos tus bancos', 'Presupuesto por quincena que se arma con tus datos', 'Suscripciones y meses sin intereses detectados y cancelables', 'Cuánto puedes invertir, cada quincena', 'Patrimonio: lo que tienes menos lo que debes', 'Insights explicables, sin adivinanzas'].map((b) => (
                <li key={b} className="flex items-start gap-2.5"><Check size={17} className="mt-0.5 flex-none text-green" /> {b}</li>
              ))}
            </ul>
          </Revelar>
          <Revelar delay={120}>
            <div className="rounded-card-xl border-2 border-green bg-green-50 p-7 dark:bg-surface-2">
              <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green">MoneyMaker</div>
              <div className="mt-2 font-display text-[52px] font-bold leading-none tracking-[-2px]">$250<span className="text-[16px] font-semibold text-txt-2 dark:text-fg-2"> MXN al mes</span></div>
              <div className="mt-1.5 text-[13px] text-txt-2 dark:text-fg-2">Primeros 7 días gratis. Se cancela desde Ajustes, sin llamadas.</div>
              <Link href="/registro" className="mt-6 flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-ink font-display text-[16px] font-extrabold text-white transition-colors hover:bg-green">Empezar 7 días gratis <ArrowRight size={18} /></Link>
              <p className="mt-3 text-center text-[12px] text-txt-2 dark:text-fg-2">Menos de $9 al día. Una suscripción olvidada cuesta más.</p>
            </div>
          </Revelar>
        </div>
      </Seccion>

      {/* 8. Preguntas */}
      <Seccion className="bg-bg-page py-16 dark:bg-canvas md:py-24">
        <Revelar>
          <Titulo etiqueta="Preguntas">Lo que preguntan antes de empezar.</Titulo>
        </Revelar>
        <div className="mt-8 max-w-[760px] divide-y divide-edge rounded-card-lg bg-surface shadow-card">
          {PREGUNTAS.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[15.5px] font-bold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronRight size={18} className="flex-none text-txt-3 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-[14px] leading-relaxed text-txt-2 dark:text-fg-2">{a}</p>
            </details>
          ))}
        </div>
      </Seccion>

      {/* 9. Cierre */}
      <section className="relative overflow-hidden bg-ink py-20 text-center text-white md:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green/30 blur-[120px]" aria-hidden />
        <div className="relative mx-auto max-w-[680px] px-4">
          <h2 className="font-display text-[34px] font-bold leading-tight tracking-[-1px] md:text-[50px]">Tu próxima quincena empieza distinta.</h2>
          <p className="mt-3 text-[15px] text-white/75">Sube un estado de cuenta hoy. En dos minutos sabes cuánto te queda.</p>
          <Link href="/registro" className="mt-7 inline-flex h-[54px] items-center gap-2 rounded-[14px] bg-green-light px-7 font-display text-[16px] font-extrabold text-ink shadow-plus transition-transform hover:scale-[1.03]">Crear mi cuenta gratis <ChevronRight size={18} /></Link>
          <p className="mt-6 text-[12px] text-white/55">Solo lectura · El PDF se descarta · Sin claves del banco</p>
        </div>
      </section>

      <footer className="border-t border-edge py-8 text-center text-[12px] text-txt-3">
        <div className="flex flex-wrap justify-center gap-4"><Link href="/legal/privacidad">Aviso de privacidad</Link><Link href="/legal/terminos">Términos</Link><a href="mailto:hola@moneymaker.mx" className="inline-flex items-center gap-1"><Mail size={12} /> hola@moneymaker.mx</a></div>
        <p className="mt-3">© {new Date().getFullYear()} MoneyMaker. No somos una institución financiera; no movemos dinero ni damos asesoría de inversión.</p>
      </footer>
    </div>
  );
}
