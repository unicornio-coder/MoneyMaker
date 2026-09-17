// Repositorio en memoria para el modo mock. Un solo estado por proceso (globalThis) para sobrevivir
// al hot reload de Next en desarrollo. Se pierde al reiniciar: es a propósito.

import type { Activo, Cuenta, EventoCalendario, Insight, Movimiento, Objetivo, Pasivo, Perfil, Presupuesto, Recurrente } from '@/lib/domain/tipos';
import type { FiltroMovimientos, Link, NuevoInsight, NuevoMovimiento, NuevoRecurrente, Repo } from './repo';

type Correccion = { patron: string; nombre: string; dominio: string | null; categoriaId: string; esSuscripcion: boolean };

type EstadoUsuario = {
  perfil: Perfil | null;
  links: Link[];
  cuentas: (Cuenta & { externalId?: string | null })[];
  movimientos: Movimiento[];
  correcciones: Correccion[];
  recurrentes: Recurrente[];
  cancelaciones: { id: string; recurrenteId: string; notas?: string }[];
  presupuestos: Presupuesto[];
  activos: Activo[];
  pasivos: Pasivo[];
  objetivos: Objetivo[];
  insights: Insight[];
  eventos: EventoCalendario[];
  estados: { id: string }[];
};

const g = globalThis as unknown as { __mmMemoria?: Map<string, EstadoUsuario> };
const estados = (g.__mmMemoria ??= new Map());

let contador = 0;
const nuevoId = () => `m-${Date.now().toString(36)}-${(++contador).toString(36)}`;

function estadoDe(userId: string): EstadoUsuario {
  let e = estados.get(userId);
  if (!e) {
    e = { perfil: null, links: [], cuentas: [], movimientos: [], correcciones: [], recurrentes: [], cancelaciones: [], presupuestos: [], activos: [], pasivos: [], objetivos: [], insights: [], eventos: [], estados: [] };
    estados.set(userId, e);
  }
  return e;
}

/** Borra todo el estado de un usuario (pruebas / "borrar mi cuenta"). */
export function reiniciarMemoria(userId?: string) {
  if (userId) estados.delete(userId);
  else estados.clear();
}

export const repoMemoria: Repo = {
  async perfil(userId) {
    return estadoDe(userId).perfil;
  },
  async guardarPerfil(userId, cambios) {
    const e = estadoDe(userId);
    const base: Perfil = e.perfil ?? { id: userId, email: cambios.email ?? '', nombre: null, diasPago: [5, 20], ingresoQuincenal: null, metas: [], plan: 'trial', trialTermina: new Date(Date.now() + 7 * 86_400_000).toISOString(), onboardingCompleto: false };
    e.perfil = { ...base, ...cambios, id: userId };
    return e.perfil;
  },

  async links(userId) {
    return estadoDe(userId).links;
  },
  async guardarLink(userId, link) {
    const e = estadoDe(userId);
    const existente = link.id ? e.links.find((l) => l.id === link.id) : e.links.find((l) => l.proveedor === link.proveedor && l.externalId && l.externalId === link.externalId);
    if (existente) {
      Object.assign(existente, link);
      return existente;
    }
    const nuevo: Link = { ...link, id: link.id ?? nuevoId() };
    e.links.push(nuevo);
    return nuevo;
  },
  async eliminarLink(userId, linkId) {
    const e = estadoDe(userId);
    e.links = e.links.filter((l) => l.id !== linkId);
    const cuentas = e.cuentas.filter((c) => c.linkId === linkId).map((c) => c.id);
    e.cuentas = e.cuentas.filter((c) => c.linkId !== linkId);
    e.movimientos = e.movimientos.filter((m) => !cuentas.includes(m.cuentaId));
  },

  async cuentas(userId) {
    return estadoDe(userId).cuentas.filter((c) => c.activo);
  },
  async cuenta(userId, cuentaId) {
    return estadoDe(userId).cuentas.find((c) => c.id === cuentaId) ?? null;
  },
  async guardarCuenta(userId, cuenta) {
    const e = estadoDe(userId);
    const existente = cuenta.id ? e.cuentas.find((c) => c.id === cuenta.id) : cuenta.externalId ? e.cuentas.find((c) => c.externalId === cuenta.externalId) : undefined;
    if (existente) {
      Object.assign(existente, cuenta, { id: existente.id });
      return existente;
    }
    const nueva = { ...cuenta, id: cuenta.id ?? nuevoId() };
    e.cuentas.push(nueva);
    return nueva;
  },
  async eliminarCuenta(userId, cuentaId) {
    const e = estadoDe(userId);
    e.cuentas = e.cuentas.filter((c) => c.id !== cuentaId);
    e.movimientos = e.movimientos.filter((m) => m.cuentaId !== cuentaId);
  },

  async movimientos(userId, filtro = {}) {
    const lista = estadoDe(userId)
      .movimientos.filter((m) => (!filtro.desde || m.fecha >= filtro.desde) && (!filtro.hasta || m.fecha <= filtro.hasta) && (!filtro.cuentaId || m.cuentaId === filtro.cuentaId) && (!filtro.categoriaId || m.categoriaId === filtro.categoriaId) && (!filtro.tipo || m.tipo === filtro.tipo))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.monto - a.monto);
    return filtro.limite ? lista.slice(0, filtro.limite) : lista;
  },
  async insertarMovimientos(userId, movs) {
    const e = estadoDe(userId);
    const hashes = new Set(e.movimientos.map((m) => m.hash));
    const insertados: Movimiento[] = [];
    for (const m of movs) {
      if (hashes.has(m.hash)) continue;
      hashes.add(m.hash);
      const nuevo = { ...m, id: nuevoId() };
      e.movimientos.push(nuevo);
      insertados.push(nuevo);
    }
    return insertados;
  },
  async actualizarMovimiento(userId, id, cambios) {
    const m = estadoDe(userId).movimientos.find((x) => x.id === id);
    if (!m) return null;
    Object.assign(m, cambios);
    return m;
  },
  async eliminarMovimiento(userId, id) {
    const e = estadoDe(userId);
    e.movimientos = e.movimientos.filter((m) => m.id !== id);
  },

  async correccionesComercio(userId) {
    return estadoDe(userId).correcciones;
  },
  async guardarCorreccionComercio(userId, c) {
    const e = estadoDe(userId);
    const i = e.correcciones.findIndex((x) => x.patron === c.patron);
    if (i >= 0) e.correcciones[i] = c;
    else e.correcciones.push(c);
  },

  async recurrentes(userId) {
    return estadoDe(userId).recurrentes;
  },
  async conciliarRecurrentes(userId, detectados) {
    const e = estadoDe(userId);
    const clave = (r: Pick<Recurrente, 'cuentaId' | 'nombre' | 'tipo'>) => `${r.cuentaId ?? ''}|${r.nombre.toLowerCase()}|${r.tipo}`;
    const salida: Recurrente[] = [];
    for (const d of detectados) {
      const { movimientoIds, ...datos } = d;
      const existente = e.recurrentes.find((r) => clave(r) === clave(d));
      let r: Recurrente;
      if (existente) {
        if (existente.origen === 'manual' || existente.canceladoAt) {
          r = existente;
        } else {
          Object.assign(existente, datos, { id: existente.id });
          r = existente;
        }
      } else {
        r = { ...datos, id: nuevoId() };
        e.recurrentes.push(r);
      }
      for (const m of e.movimientos) if (movimientoIds.includes(m.id)) m.recurrenteId = r.id;
      salida.push(r);
    }
    // Detectados que ya no aparecen: se desactivan (no se borran) salvo manuales.
    const vistos = new Set(salida.map((r) => r.id));
    for (const r of e.recurrentes) if (!vistos.has(r.id) && r.origen === 'detectado' && !r.canceladoAt) r.activo = false;
    return e.recurrentes;
  },
  async guardarRecurrente(userId, r) {
    const e = estadoDe(userId);
    const existente = r.id ? e.recurrentes.find((x) => x.id === r.id) : undefined;
    if (existente) {
      Object.assign(existente, r);
      return existente;
    }
    const nuevo = { ...r, id: r.id ?? nuevoId() };
    e.recurrentes.push(nuevo);
    return nuevo;
  },
  async eliminarRecurrente(userId, id) {
    const e = estadoDe(userId);
    e.recurrentes = e.recurrentes.filter((r) => r.id !== id);
  },
  async crearSolicitudCancelacion(userId, recurrenteId, notas) {
    const e = estadoDe(userId);
    const s = { id: nuevoId(), recurrenteId, notas };
    e.cancelaciones.push(s);
    return { id: s.id };
  },

  async presupuesto(userId, periodo, inicio) {
    return estadoDe(userId).presupuestos.find((p) => p.periodo === periodo && p.inicio === inicio) ?? null;
  },
  async guardarPresupuesto(userId, p) {
    const e = estadoDe(userId);
    const existente = e.presupuestos.find((x) => x.periodo === p.periodo && x.inicio === p.inicio);
    const lineas = p.lineas.map((l) => ({ ...l, id: nuevoId() }));
    if (existente) {
      Object.assign(existente, { fin: p.fin, ingreso: p.ingreso, lineas });
      return existente;
    }
    const nuevo: Presupuesto = { id: nuevoId(), periodo: p.periodo, inicio: p.inicio, fin: p.fin, ingreso: p.ingreso, lineas };
    e.presupuestos.push(nuevo);
    return nuevo;
  },
  async actualizarLineaPresupuesto(userId, presupuestoId, categoriaId, limite) {
    const p = estadoDe(userId).presupuestos.find((x) => x.id === presupuestoId);
    if (!p) return;
    const l = p.lineas.find((x) => x.categoriaId === categoriaId);
    if (l) l.limite = limite;
    else p.lineas.push({ id: nuevoId(), categoriaId, limite, orden: p.lineas.length + 1 });
  },

  async activos(userId) {
    return estadoDe(userId).activos;
  },
  async guardarActivo(userId, a) {
    return upsert(estadoDe(userId).activos, a);
  },
  async eliminarActivo(userId, id) {
    const e = estadoDe(userId);
    e.activos = e.activos.filter((x) => x.id !== id);
  },
  async pasivos(userId) {
    return estadoDe(userId).pasivos;
  },
  async guardarPasivo(userId, p) {
    return upsert(estadoDe(userId).pasivos, p);
  },
  async eliminarPasivo(userId, id) {
    const e = estadoDe(userId);
    e.pasivos = e.pasivos.filter((x) => x.id !== id);
  },
  async objetivos(userId) {
    return estadoDe(userId).objetivos;
  },
  async guardarObjetivo(userId, o) {
    return upsert(estadoDe(userId).objetivos, o);
  },
  async eliminarObjetivo(userId, id) {
    const e = estadoDe(userId);
    e.objetivos = e.objetivos.filter((x) => x.id !== id);
  },

  async insights(userId) {
    return estadoDe(userId)
      .insights.filter((i) => !i.descartado)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async guardarInsights(userId, lista) {
    const e = estadoDe(userId);
    const claves = new Set(e.insights.map((i) => String(i.referencia.clave ?? '')));
    const nuevos: Insight[] = [];
    for (const n of lista) {
      if (claves.has(n.clave)) continue;
      claves.add(n.clave);
      const { clave, ...datos } = n;
      const i: Insight = { ...datos, id: nuevoId(), leido: false, descartado: false, referencia: { ...datos.referencia, clave }, createdAt: new Date().toISOString() };
      e.insights.push(i);
      nuevos.push(i);
    }
    return nuevos;
  },
  async marcarInsight(userId, id, cambios) {
    const i = estadoDe(userId).insights.find((x) => x.id === id);
    if (i) Object.assign(i, cambios);
  },

  async eventos(userId, desde, hasta) {
    return estadoDe(userId).eventos.filter((ev) => ev.fecha >= desde && ev.fecha <= hasta);
  },
  async guardarEvento(userId, ev) {
    return upsert(estadoDe(userId).eventos, ev);
  },
  async eliminarEvento(userId, id) {
    const e = estadoDe(userId);
    e.eventos = e.eventos.filter((x) => x.id !== id);
  },

  async registrarEstadoDeCuenta(userId) {
    const s = { id: nuevoId() };
    estadoDe(userId).estados.push(s);
    return s;
  },
};

function upsert<T extends { id: string }>(lista: T[], item: Omit<T, 'id'> & { id?: string }): T {
  const existente = item.id ? lista.find((x) => x.id === item.id) : undefined;
  if (existente) {
    Object.assign(existente, item);
    return existente;
  }
  const nuevo = { ...item, id: item.id ?? nuevoId() } as T;
  lista.push(nuevo);
  return nuevo;
}
