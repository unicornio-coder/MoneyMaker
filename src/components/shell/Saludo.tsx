'use client';

import { useEffect, useState } from 'react';
import { saludo } from '@/lib/format';

/**
 * "Buenos días, JC" con la hora local del navegador. El servidor corre en UTC, así que ahí se renderiza un saludo neutro
 * y el cliente lo ajusta al montar: nunca hay diferencia entre HTML del servidor y del cliente.
 */
export function useSaludo(nombre: string): string {
  const [texto, setTexto] = useState(() => `Hola, ${nombre}`);
  useEffect(() => {
    setTexto(saludo(nombre));
    const id = setInterval(() => setTexto(saludo(nombre)), 60_000);
    return () => clearInterval(id);
  }, [nombre]);
  return texto;
}

export function Saludo({ nombre, className }: { nombre: string; className?: string }) {
  return <span className={className}>{useSaludo(nombre)}</span>;
}
