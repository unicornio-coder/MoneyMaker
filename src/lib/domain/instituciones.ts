// Diagnóstico de la lista de instituciones que devuelve el agregador (Belvo). Lógica pura, sin I/O.
// Sirve para saber, con datos y no a ojo, si la cuenta del proveedor tiene bancos habilitados: si no los tiene,
// el widget solo muestra "Fiscal" (SAT) y "Empleo" (IMSS) y ningún usuario puede conectar una cuenta bancaria.

export type InstitucionProveedor = { name: string; display_name?: string | null; type: string; status?: string | null };

export type DiagnosticoInstituciones = {
  total: number;
  /** Cuántas instituciones por tipo, p. ej. { bank: 12, fiscal: 1, employment: 1 }. */
  porTipo: Record<string, number>;
  /** Nombres visibles de los bancos y fintech disponibles (hasta 40). */
  bancos: string[];
  hayBancos: boolean;
  /** Explicación corta para la pantalla de Ajustes. */
  mensaje: string;
};

const ETIQUETA_TIPO: Record<string, string> = { bank: 'bancos', fintech: 'fintech', business: 'banca empresarial', fiscal: 'fiscal (SAT)', employment: 'empleo (IMSS)' };

export function esBanco(i: Pick<InstitucionProveedor, 'type'>): boolean {
  const t = i.type.toLowerCase();
  return t === 'bank' || t === 'fintech';
}

export function diagnosticarInstituciones(lista: InstitucionProveedor[], entorno: 'sandbox' | 'production' | 'mock'): DiagnosticoInstituciones {
  const porTipo: Record<string, number> = {};
  for (const i of lista) porTipo[i.type.toLowerCase()] = (porTipo[i.type.toLowerCase()] ?? 0) + 1;
  const bancos = lista.filter(esBanco).map((i) => (i.display_name || i.name).trim()).filter(Boolean).slice(0, 40);
  const hayBancos = bancos.length > 0;
  const tipos = Object.entries(porTipo).map(([t, n]) => `${n} ${ETIQUETA_TIPO[t] ?? t}`).join(', ');
  let mensaje: string;
  if (!lista.length) mensaje = 'Belvo no devolvió ninguna institución. Revisa que las llaves sean correctas y del entorno indicado.';
  else if (hayBancos) mensaje = entorno === 'production' ? `${bancos.length} bancos y fintech disponibles para conectar.` : `${bancos.length} bancos de prueba disponibles (sandbox). Con llaves de producción serán los bancos reales.`;
  else mensaje = `Belvo devolvió ${tipos}, pero ningún banco: la cuenta de Belvo no tiene habilitado el producto de banca (agregación bancaria) en este entorno. Hay que pedírselo a Belvo; no se resuelve desde el código.`;
  return { total: lista.length, porTipo, bancos, hayBancos, mensaje };
}
