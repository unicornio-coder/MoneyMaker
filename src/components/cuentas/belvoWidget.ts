// Carga el widget de Belvo bajo demanda y lo abre con un token de un solo uso pedido a nuestro backend.
// Cada paso reporta estado (onEstado) y cualquier falla llega a onError con el motivo real.

type Args = {
  /** Institución de Belvo a preseleccionar (p. ej. 'bbva_mx_retail'). Sin valor, el widget muestra su lista. */
  institucion?: string;
  onSuccess: (link: string, institution: string) => void;
  onError: (mensaje: string) => void;
  onExit?: () => void;
  onEstado?: (mensaje: string) => void;
};

declare global {
  interface Window {
    belvoSDK?: { createWidget: (token: string, config: Record<string, unknown>) => { build: () => void } };
  }
}

const SCRIPT = 'https://cdn.belvo.io/belvo-widget-1-stable.js';
const ID_CONTENEDOR = 'belvo';

function cargarScript(): Promise<void> {
  if (window.belvoSDK) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const previo = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const s = previo ?? document.createElement('script');
    const timer = window.setTimeout(() => reject(new Error('El widget de Belvo tardó demasiado en cargar. Revisa tu conexión o un bloqueador de anuncios.')), 15000);
    s.addEventListener('load', () => { window.clearTimeout(timer); resolve(); });
    s.addEventListener('error', () => { window.clearTimeout(timer); reject(new Error('No se pudo cargar el widget de Belvo (cdn.belvo.io). ¿Un bloqueador lo detiene?')); });
    if (!previo) {
      s.src = SCRIPT;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

function contenedor() {
  let div = document.getElementById(ID_CONTENEDOR);
  if (!div) {
    div = document.createElement('div');
    div.id = ID_CONTENEDOR;
    document.body.appendChild(div);
  }
  // Por encima de cualquier modal nuestro.
  div.style.position = 'relative';
  div.style.zIndex = '2147483000';
  return div;
}

export async function abrirWidgetBelvo({ institucion, onSuccess, onError, onExit, onEstado }: Args) {
  try {
    onEstado?.('Pidiendo acceso a Belvo…');
    const res = await fetch('/api/belvo/token', { method: 'POST' });
    const cuerpo = (await res.json().catch(() => ({}))) as { access?: string; error?: string };
    if (!res.ok || !cuerpo.access) throw new Error(cuerpo.error ? `Belvo no dio acceso: ${cuerpo.error}` : 'No pudimos iniciar la conexión con Belvo. Intenta de nuevo.');

    onEstado?.('Cargando el widget…');
    await cargarScript();
    if (!window.belvoSDK) throw new Error('El widget de Belvo no está disponible en este navegador.');
    contenedor();

    onEstado?.('Abriendo Belvo…');
    const config: Record<string, unknown> = {
      locale: 'es',
      country_codes: ['MX'],
      callback: (link: string, institution: string) => onSuccess(link, institution),
      onExit: () => onExit?.(),
      onEvent: (data: { eventName?: string; meta_data?: { error_message?: string; error_code?: string } }) => {
        if (typeof console !== 'undefined') console.info('[belvo widget]', data?.eventName, data?.meta_data ?? '');
        if (data?.eventName === 'ERROR') onError(data.meta_data?.error_message ? `Belvo: ${data.meta_data.error_message}` : 'Belvo reportó un error al conectar.');
      },
    };
    if (institucion) config.institution = institucion;
    window.belvoSDK.createWidget(cuerpo.access, config).build();
    onEstado?.('');
  } catch (e) {
    onEstado?.('');
    onError(e instanceof Error ? e.message : 'Error al abrir el widget de Belvo.');
  }
}
