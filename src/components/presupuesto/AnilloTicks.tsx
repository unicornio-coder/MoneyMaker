'use client';

// Anillo de 60 ticks radiales (r 78→104, 4 px, round). Gastado en verde; los últimos 8 del tramo gastado en verde claro; resto gris verde.

const N = 60;

export function AnilloTicks({ pct }: { pct: number }) {
  const llenos = Math.round((Math.min(100, Math.max(0, pct)) / 100) * N);
  return (
    <div className="relative h-[220px] w-[220px]">
      <svg viewBox="0 0 220 220" className="h-full w-full" aria-hidden>
        {Array.from({ length: N }, (_, i) => {
          const a = (i / N) * Math.PI * 2 - Math.PI / 2;
          const x1 = 110 + Math.cos(a) * 78;
          const y1 = 110 + Math.sin(a) * 78;
          const x2 = 110 + Math.cos(a) * 104;
          const y2 = 110 + Math.sin(a) * 104;
          const lleno = i < llenos;
          const punta = lleno && i >= llenos - 8;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={punta ? '#4ADE80' : lleno ? '#16A34A' : 'var(--tick-vacio, #E3EFE6)'}
              strokeWidth="4"
              strokeLinecap="round"
              style={{ transition: `stroke .4s ease ${i * 6}ms` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[40px] font-bold leading-none tracking-[-1.5px]">{Math.round(pct)}%</span>
        <span className="mt-1 text-[12px] text-txt-2 dark:text-fg-2">gastado</span>
      </div>
    </div>
  );
}
