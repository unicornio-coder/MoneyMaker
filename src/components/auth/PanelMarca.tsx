import { ShieldCheck, FileCheck, Sparkles, TrendingUp } from 'lucide-react';
import { TelefonoAnimado } from '@/components/landing/TelefonoAnimado';
import { Plastico } from '@/components/inicio/Cuentas';
import { Avatar } from '@/components/ui/Avatar';

const TARJETA_MUESTRA = { id: 'muestra', nombre: 'BBVA Crédito', banco: 'BBVA', bancoDominio: 'bbva.mx', tipo: 'credito' as const, ultimos4: '0001', saldo: 20100, color: '#072146', activo: true, inversion: null };

/** Visual compacto para alturas medias: un plástico con dos hallazgos flotando. */
function TarjetaMuestra() {
  return (
    <div className="relative mx-auto w-[300px] py-6">
      <div className="mx-auto w-[236px] animate-float">
        <Plastico cuenta={TARJETA_MUESTRA} />
      </div>
      <div className="absolute -left-2 top-3 flex items-center gap-2 rounded-card bg-white px-3 py-2 text-[12px] font-semibold text-ink shadow-dark animate-float [animation-delay:-2s]">
        <Avatar domain="netflix.com" nombre="Netflix" size={26} logoPct={62} />
        Netflix · $249 al mes
      </div>
      <div className="absolute -right-3 bottom-2 flex items-center gap-2 rounded-card bg-green-light px-3 py-2 text-[12px] font-bold text-ink shadow-dark animate-float [animation-delay:-4s]">
        <TrendingUp size={16} /> Puedes invertir $4,000
      </div>
    </div>
  );
}

const MARCAS = [
  { nombre: 'Netflix', dominio: 'netflix.com' },
  { nombre: 'Spotify', dominio: 'spotify.com' },
  { nombre: 'HBO Max', dominio: 'max.com' },
  { nombre: 'BBVA', dominio: 'bbva.mx' },
  { nombre: 'Nu', dominio: 'nu.com.mx' },
  { nombre: 'Amex', dominio: 'americanexpress.com' },
  { nombre: 'Banorte', dominio: 'banorte.com' },
  { nombre: 'Telcel', dominio: 'telcel.com' },
];

const PUNTOS = [
  { icon: FileCheck, texto: 'Subes el PDF de tu tarjeta y en dos minutos ves qué pagas cada mes.' },
  { icon: Sparkles, texto: 'Detectamos suscripciones, meses sin intereses y cuánto te sobra en la quincena.' },
  { icon: ShieldCheck, texto: 'Solo lectura. El PDF se lee y se descarta. Nunca pedimos las claves de tu banco.' },
];

/** Columna izquierda de login y registro: promesa del producto, teléfono animado (si cabe) y marcas que reconocemos. */
export function PanelMarca() {
  return (
    <aside className="relative hidden overflow-hidden bg-ink text-white md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:justify-between md:px-12 md:py-10 lg:px-16">
      <span className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-green/30 blur-[90px] animate-blob" />
      <span className="pointer-events-none absolute -bottom-32 right-[-120px] h-[460px] w-[460px] rounded-full bg-green-light/20 blur-[100px] animate-blob [animation-delay:-8s]" />

      <div className="relative animate-rise">
        <h2 className="max-w-[440px] font-display text-[30px] font-bold leading-[1.1] tracking-[-0.9px] lg:text-[38px]">
          Sube tu estado de cuenta.<br />
          <span className="text-green-light">Te decimos qué te sobra</span> y qué te cobran de más.
        </h2>
        <ul className="mt-7 space-y-3.5">
          {PUNTOS.map((p, i) => {
            const Icon = p.icon;
            return (
              <li key={p.texto} className="flex items-start gap-3.5 animate-rise" style={{ animationDelay: `${140 + i * 90}ms` }}>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/10 text-green-light"><Icon size={18} /></span>
                <span className="pt-1.5 text-[13.5px] leading-relaxed text-white/80">{p.texto}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Visual según la altura disponible: teléfono en pantallas altas, plástico compacto en medias, nada en bajas. */}
      <div className="relative hidden min-h-0 flex-1 items-center justify-center animate-rise [animation-delay:260ms] [@media(min-height:760px)]:flex [@media(min-height:1060px)]:hidden">
        <TarjetaMuestra />
      </div>
      <div className="relative hidden min-h-0 flex-1 items-center justify-center animate-rise [animation-delay:260ms] [@media(min-height:1060px)]:flex">
        <div className="animate-float">
          <TelefonoAnimado />
        </div>
      </div>

      <div className="relative animate-rise [animation-delay:420ms]">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.9px] text-white/50">Reconocemos cargos de</div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {MARCAS.map((m, i) => (
            <span key={m.nombre} className="flex items-center gap-2 rounded-pill bg-white/8 py-1 pl-1 pr-3 text-[12px] font-semibold text-white/85 animate-rise" style={{ animationDelay: `${480 + i * 50}ms` }}>
              <Avatar domain={m.dominio} nombre={m.nombre} size={26} logoPct={62} bg="#ffffff" className="text-ink" />
              {m.nombre}
            </span>
          ))}
          <span className="flex items-center rounded-pill bg-white/8 px-3 py-1 text-[12px] font-semibold text-white/60">y cualquier banco de México</span>
        </div>
      </div>
    </aside>
  );
}
