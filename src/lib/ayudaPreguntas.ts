// Preguntas frecuentes. Las usa el centro de ayuda (/app/ayuda) y la landing (las primeras cuatro).

export const PREGUNTAS: { q: string; a: string }[] = [
  { q: '¿Es seguro? ¿Ven mi contraseña del banco?', a: 'No. La conexión la hace Belvo, un agregador regulado por la Ley Fintech; nosotros solo recibimos movimientos. El PDF se lee en memoria y se descarta. Puedes borrar tu cuenta y todos tus datos desde Ajustes → Cuenta y seguridad.' },
  { q: '¿Cómo conecto mi banco?', a: 'Inicio → Agregar → Conectar mi banco. Escribes tus datos en la ventana segura de Belvo, nunca en MoneyMaker. Solo lectura: no podemos mover dinero. Si tu banco no aparece, sube el PDF de tu estado de cuenta.' },
  { q: '¿Cómo cancelo una suscripción?', a: 'Suscripciones → toca la suscripción → "Cancelar en …" te lleva directo a la página de cancelación, o "Mandar carta por correo" envía una carta formal en tu nombre con copia a ti. Cuando esté cancelada, marca "Ya la cancelé" y vigilamos que el cargo no regrese.' },
  { q: '¿Qué incluye Gratis y qué incluye Plus?', a: 'Gratis: un banco conectado o un PDF al mes, movimientos, suscripciones y presupuesto. Plus ($149 al mes o $1,290 al año): bancos y PDF ilimitados, cancelación y negociación por carta, resumen del domingo, avisos de cobros y exportar. Los primeros 7 días son Plus completo.' },
  { q: 'Subí mi estado de cuenta y no se leyó', a: 'Revisa que sea el PDF original que manda tu banco (no una foto ni un escaneo). Si tiene contraseña, escríbela cuando la pidamos. Si sigue fallando, mándanos un reporte aquí abajo con el banco y el mes; no adjuntes el PDF.' },
  { q: '¿Cómo cancelo Plus o pido reembolso?', a: 'Ajustes → Plan → "Administrar mi suscripción" abre el portal de pago; cancelas cuando quieras y sigues en Gratis. Garantía: si en tu primer mes de Plus no encuentras un ahorro mayor que su costo, escríbenos dentro de los 30 días y te devolvemos ese mes.' },
  { q: 'Un movimiento tiene la categoría equivocada', a: 'Ábrelo y cambia la categoría. Si marcas "siempre así", todos los cargos de ese comercio se van a esa categoría desde ese momento.' },
  { q: 'Detectó como suscripción algo que no lo es', a: 'Ábrela en Suscripciones y toca "No es recurrente". Deja de contar y no la volvemos a detectar.' },
  { q: '¿Cómo recibo avisos en mi teléfono?', a: 'Ajustes → Avisos → "Activar avisos aquí". En Android, instala MoneyMaker desde Chrome (menú → Agregar a pantalla de inicio) para recibirlos con la app cerrada. En iPhone, agrégala a la pantalla de inicio desde Safari.' },
  { q: '¿Cómo borro mi cuenta?', a: 'Ajustes → Cuenta y seguridad → "Borrar mi cuenta". Se eliminan tus cuentas, movimientos, conexiones y suscripciones de inmediato. No hay periodo de espera.' },
];
