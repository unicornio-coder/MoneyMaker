'use client';

import { useEffect, useState } from 'react';

/** Número que sube de 0 al valor en ~700 ms (ease-out). Sin decimales; formato es-MX opcional. */
export function CountUp({ value, duration = 700, format }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const inicio = performance.now();
    const desde = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - inicio) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(desde + (value - desde) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format ? format(n) : n.toLocaleString('es-MX')}</>;
}
