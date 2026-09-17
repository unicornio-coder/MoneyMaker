import Link from 'next/link';
import { Mail, ArrowRight, ChevronRight, Check } from 'lucide-react';
import { Logo } from '@/components/shell/Logo';
import { TelefonoAnimado } from './TelefonoAnimado';
import { FormCorreo } from './FormCorreo';

const MARCAS = ['Netflix', 'BBVA', 'Telcel', 'Disney+', 'Banco Azteca', 'Spotify', 'CFE', 'Nu', 'Totalplay', 'ViX', 'Elektra', 'Uber', 'Banorte', 'HBO Max', 'Telmex', 'Coppel', 'Amazon', 'Izzi', 'Santander', 'YouTube', 'Rappi', 'Liverpool', 'Megacable', 'Mercado Pago', 'Smart Fit', 'Banamex', 'Prime Video', 'AT&T', 'Bitso', 'DiDi', 'HSBC', 'Apple', 'Naturgy', 'Mercado Libre', 'Scotiabank', 'Paramount+', 'Kueski', 'GBM+', 'Cinépolis', 'Stori', 'Xbox', 'Oxxo', 'Klar', 'Crunchyroll', 'Inbursa', 'Walmart'];

const FUNCIONES: { titulo: string; texto: string; demo: React.ReactNode }[] = [
  { titulo: 'Todo tu dinero en un solo lugar', texto: 'BBVA, Nu, Amex, Bitso, GBM+. Solo lectura. Un saldo total, todas las cuentas.', demo: <Demo filas={[['BBVA Débito', '$18,420'], ['Nu Crédito', '$6,480'], ['GBM+', '$164,053'], ['Bitso', '$41,300']]} total="$217,653" /> },
  { titulo: 'Tus gastos, solos y ordenados', texto: 'Cada movimiento con su categoría, sin que muevas un dedo. Corriges uno y aprende.', demo: <Demo filas={[['Oxxo', 'Súper'], ['Uber', 'Transporte'], ['Amazon', 'En línea'], ['Rappi', 'Comida']]} total="Categorizado" /> },
  { titulo: 'Tu presupuesto, en 2 minutos', texto: 'Dinos cuándo te pagan. Separamos fijos, MSI, ahorro y gasto libre por quincena.', demo: <Barras /> },
  { titulo: 'Cancela lo que no usas', texto: 'Detectamos cada suscripción y cuánto llevas pagando. Cancelas con un toque o lo hacemos por ti.', demo: <Demo filas={[['HBO Max', '$149/mes'], ['Spotify', '$129/mes'], ['Smart Fit', '$499/mes']]} total="Ahorras $9,324 al año" /> },
  { titulo: 'Tus meses sin intereses, claros', texto: 'Cuántos MSI tienes, cuánto suman al mes y cuándo terminan. Antes de la siguiente compra.', demo: <Demo filas={[['Liverpool', '5/12'], ['Amazon', '2/6'], ['Coppel', '9/18']]} total="$2,300 al mes" /> },
  { titulo: 'Invierte lo que te sobra', texto: 'Cada quincena te decimos cuánto puedes invertir después de fijos y gasto habitual.', demo: <Demo filas={[['CETES 28 días', '10.4 %'], ['ETF S&P 500', 'GBM+'], ['Bitcoin', 'Bitso']]} total="Puedes invertir $3,150" /> },
  { titulo: 'Beneficios por ser miembro', texto: 'Negociamos tu plan de celular e internet y conseguimos cashback donde ya gastas.', demo: <Demo filas={[['Telcel', '−$120/mes'], ['Totalplay', '−$260/mes'], ['Cinépolis', '10 % cashback']]} total="Pronto" /> },
];

const TESTIMONIOS = [
  ['Daniela R.', 'Monterrey', 'Encontró tres suscripciones que ya no usaba. Se pagó sola el primer mes.'],
  ['Jorge M.', 'CDMX', 'Por fin sé cuánto me queda de verdad hasta el día 20. Antes lo adivinaba.'],
  ['Fernanda L.', 'Guadalajara', 'Los meses sin intereses me tenían amarrada sin saberlo. Ahora los veo todos juntos.'],
  ['Ricardo P.', 'Querétaro', 'Subí mi estado de cuenta de GBM+ y quedó todo ordenado en un minuto.'],
  ['Paola G.', 'Puebla', 'El presupuesto por quincena es lo que ninguna app gringa entiende.'],
  ['Andrés V.', 'Mérida', 'Cada quincena me dice cuánto puedo mandar a CETES. Ya llevo cuatro seguidas.'],
];

function Demo({ filas, total }: { filas: [string, string][]; total: string }) {
  return (
    <div className="rounded-16 bg-ink p-4 text-white">
      <ul className="space-y-2 text-[12px]">
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
      {[['Fijos', 46], ['MSI', 16], ['Ahorro', 20], ['Libre', 18]].map(([l, p]) => (
        <div key={String(l)} className="mb-2 last:mb-0">
          <div className="flex justify-between text-[11px]"><span className="text-white/80">{l}</span><span className="font-bold">{p} %</span></div>
          <div className="mt-1 h-2 rounded-pill bg-white/12"><div className="h-2 rounded-pill bg-green-light" style={{ width: `${p}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Landing() {
  return (
    <div className="bg-surface text-fg">
      <header className="sticky top-0 z-30 border-b border-edge bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-5">
          <Link href="/" className="flex items-center gap-2.5"><Logo /><span className="font-display text-[15px] font-bold">MoneyMaker</span></Link>
          <nav className="ml-4 hidden gap-5 text-[13px] font-semibold text-txt-2 md:flex">
            <a href="#funciones" className="hover:text-fg">Funciones</a><a href="#testimonios" className="hover:text-fg">Testimonios</a><a href="#precio" className="hover:text-fg">Precio</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="hidden h-10 items-center rounded-pill border border-line-2 px-4 text-[13px] font-semibold hover:bg-bg-hover sm:flex">Iniciar sesión</Link>
            <Link href="/registro" className="btn-primary flex h-10 items-center px-4 text-[13px]">Crear cuenta</Link>
          </div>
        </div>
      </header>

      <section className="bg-green text-white">
        <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div>
            <h1 className="font-display font-bold leading-[1.02] tracking-[-1.5px]" style={{ fontSize: 'clamp(38px, 5vw, 66px)' }}>Tu quincena, clara.</h1>
            <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-white/85">Bancos, tarjetas, Bitso y GBM+ en un solo lugar. Sabemos cuánto te queda hasta el día 20, qué suscripciones te sobran y cuánto puedes invertir.</p>
            <div className="mt-7 max-w-[480px]"><FormCorreo /></div>
            <p className="mt-3 text-[12px] text-white/70">7 días gratis · Solo lectura · Cancela cuando quieras · <Link href="/legal/terminos" className="underline">Términos</Link> y <Link href="/legal/privacidad" className="underline">Privacidad</Link></p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-pill bg-white/15 px-4 py-2 text-[12px] font-semibold">
              <span className="flex -space-x-2">{['B', 'N', 'A', 'G', '₿'].map((l) => <span key={l} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-ink ring-2 ring-green">{l}</span>)}</span>
              +60 bancos · Bitso · GBM+
            </div>
          </div>
          <div className="flex justify-center"><TelefonoAnimado /></div>
        </div>
      </section>

      <section className="border-b border-edge py-10">
        <p className="mb-5 text-center text-[12px] font-bold uppercase tracking-[0.9px] text-txt-2">Detectamos suscripciones y cuentas de</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div className="marquee flex w-max gap-10 whitespace-nowrap text-[14px] font-semibold text-txt-3">
            {[...MARCAS, ...MARCAS].map((m, i) => <span key={i}>{m}</span>)}
          </div>
        </div>
      </section>

      <section id="funciones" className="mx-auto max-w-[1120px] px-5 py-16">
        <h2 className="font-display text-[30px] font-bold tracking-[-0.8px]">Lo que hace por ti</h2>
        <p className="mt-1 text-[14px] text-txt-2">Siete cosas que ninguna app hecha en Estados Unidos entiende de México.</p>
        <div className="snap-x-carousel mt-8 -mx-5 px-5">
          {FUNCIONES.map((f) => (
            <article key={f.titulo} className="w-[280px] rounded-card-lg border border-edge bg-surface p-4 shadow-card">
              {f.demo}
              <h3 className="mt-4 font-display text-[16px] font-bold leading-snug">{f.titulo}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-txt-2">{f.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="testimonios" className="bg-bg-page py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="font-display text-[30px] font-bold tracking-[-0.8px]">Lo que dicen</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {TESTIMONIOS.map(([n, c, t]) => (
              <blockquote key={n} className="card p-5">
                <p className="text-[14px] leading-relaxed">“{t}”</p>
                <footer className="mt-4 flex items-center gap-2.5 text-[12.5px]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-display text-[12px] font-bold text-white">{n[0]}</span><span><b>{n}</b> · {c}</span></footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section id="precio" className="mx-auto max-w-[1120px] px-5 py-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-[30px] font-bold tracking-[-0.8px]">Un solo plan. Se paga solo.</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-txt-2">$250 al mes. Una suscripción que canceles o una comisión que evites ya lo cubre. Sin plan gratis: es un servicio profesional.</p>
            <ul className="mt-5 space-y-2 text-[13.5px]">
              {['Todas tus cuentas, solo lectura', 'Presupuesto por quincena automático', 'Suscripciones y MSI detectados y cancelables', 'Cuánto puedes invertir, cada quincena', 'Estados de cuenta ilimitados'].map((b) => <li key={b} className="flex items-start gap-2"><Check size={16} className="mt-0.5 flex-none text-green" /> {b}</li>)}
            </ul>
          </div>
          <div className="rounded-20 border-2 border-green bg-green-50 p-7">
            <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green">Premium</div>
            <div className="mt-2 font-display text-[48px] font-bold leading-none tracking-[-2px]">$250<span className="text-[16px] font-semibold text-txt-2"> MXN/mes</span></div>
            <div className="mt-1 text-[12.5px] text-txt-2">o $2,500 al año (2 meses gratis)</div>
            <Link href="/registro" className="mt-6 flex h-[52px] items-center justify-center gap-2 rounded-[11px] bg-ink font-display text-[17px] font-extrabold text-white hover:bg-green">Empezar 7 días gratis <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-24 text-center text-white">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green/30 blur-[120px]" />
        <div className="relative mx-auto max-w-[640px] px-5">
          <h2 className="font-display text-[36px] font-bold leading-tight tracking-[-1px] md:text-[48px]">Tu próxima quincena empieza distinta.</h2>
          <p className="mt-3 text-[15px] text-white/75">7 días gratis. Cancela cuando quieras.</p>
          <Link href="/registro" className="mt-7 inline-flex h-[54px] items-center gap-2 rounded-[14px] bg-green-light px-7 font-display text-[16px] font-extrabold text-ink shadow-plus transition-transform hover:scale-[1.03]">Crear mi cuenta gratis <ChevronRight size={18} /></Link>
          <p className="mt-6 text-[12px] text-white/55">Solo lectura · Cifrado bancario · +60 instituciones</p>
        </div>
      </section>

      <footer className="border-t border-edge py-8 text-center text-[12px] text-txt-3">
        <div className="flex flex-wrap justify-center gap-4"><Link href="/legal/privacidad">Aviso de privacidad</Link><Link href="/legal/terminos">Términos</Link><a href="mailto:hola@moneymaker.mx" className="inline-flex items-center gap-1"><Mail size={12} /> hola@moneymaker.mx</a></div>
        <p className="mt-3">© {new Date().getFullYear()} MoneyMaker. No somos una institución financiera; no movemos dinero ni damos asesoría de inversión.</p>
      </footer>
    </div>
  );
}
