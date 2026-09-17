// Carga el widget de Belvo bajo demanda y lo abre con un token de un solo uso pedido a nuestro backend.

type Args = { institucion?: string; onSuccess: (link: string, institution: string) => void; onError: (mensaje: string) => void; onExit?: () => void };

declare global {
  interface Window {
    belvoSDK?: { createWidget: (token: string, config: Record<string, unknown>) => { build: () => void } };
  }
}

const SCRIPT = 'https://cdn.belvo.io/belvo-widget-1-stable.js';

function cargarScript(): Promise<void> {
  if (window.belvoSDK) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar el widget de Belvo.'));
    document.head.appendChild(s);
  });
}

export async function abrirWidgetBelvo({ institucion, onSuccess, onError, onExit }: Args) {
  try {
    const res = await fetch('/api/belvo/token', { method: 'POST' });
    if (!res.ok) throw new Error('No pudimos iniciar la conexión. Intenta de nuevo.');
    const { access } = (await res.json()) as { access: string };
    await cargarScript();
    if (!window.belvoSDK) throw new Error('Widget no disponible.');
    if (!document.getElementById('belvo')) {
      const div = document.createElement('div');
      div.id = 'belvo';
      document.body.appendChild(div);
    }
    window.belvoSDK
      .createWidget(access, {
        locale: 'es',
        country_codes: ['MX'],
        institution: institucion,
        callback: (link: string, institution: string) => onSuccess(link, institution),
        onExit: () => onExit?.(),
        onEvent: (data: { eventName?: string; meta_data?: { error_message?: string } }) => {
          if (data?.eventName === 'ERROR' && data.meta_data?.error_message) onError(data.meta_data.error_message);
        },
      })
      .build();
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Error al abrir el widget.');
  }
}
