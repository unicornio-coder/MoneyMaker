import Link from 'next/link';
import { Logo } from '@/components/shell/Logo';

export const metadata = { title: 'Términos y condiciones · MoneyMaker' };

// BORRADOR para revisión legal.
export default function TerminosPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="mx-auto flex h-[70px] max-w-[760px] items-center px-5"><Link href="/" className="flex items-center gap-2.5"><Logo /><span className="font-display text-[15px] font-bold">MoneyMaker</span></Link></header>
      <main className="mx-auto max-w-[760px] px-5 pb-20 text-[14px] leading-relaxed text-fg">
        <h1 className="font-display text-[28px] font-bold tracking-[-0.8px]">Términos y condiciones</h1>
        <p className="text-txt-2">Última actualización: septiembre de 2026. <b>Borrador sujeto a revisión legal.</b></p>
        <h2 className="mt-8 font-display text-[18px] font-bold">1. El servicio</h2>
        <p>MoneyMaker es una herramienta de organización de finanzas personales. Muestra información de tus cuentas, la categoriza, detecta cargos recurrentes y compras a meses, propone un presupuesto y genera avisos. <b>No es una institución financiera, no mueve dinero, no otorga crédito y no ofrece asesoría de inversión.</b> Las cifras y recomendaciones son informativas y pueden contener errores derivados de la información que entregan los bancos.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">2. Tu cuenta</h2>
        <p>Debes ser mayor de edad y proporcionar información veraz. Eres responsable de mantener segura tu contraseña. Puedes borrar tu cuenta en cualquier momento desde Ajustes.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">3. Conexión con bancos y fuentes</h2>
        <p>Al conectar una cuenta autorizas a MoneyMaker, a través de Belvo, a leer tus movimientos con acceso de solo lectura. Al subir un estado de cuenta o autorizar la lectura de alertas de tu correo, autorizas su procesamiento con la misma finalidad. Puedes revocar cada conexión desde Ajustes.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">4. Cancelación de suscripciones</h2>
        <p>La función “Cancelar suscripción” te guía para cancelar servicios de terceros por tu cuenta. La función “Cancelar por mí” es una gestión que realiza nuestro equipo con tu autorización expresa; no garantizamos que el proveedor acepte la cancelación ni respondemos por cargos previos a la gestión.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">5. Precio y prueba</h2>
        <p>El plan Premium cuesta $250 MXN al mes o $2,500 MXN al año, IVA incluido, con 7 días de prueba gratuita. El cobro se realiza a través de Stripe al terminar la prueba y se renueva automáticamente hasta que canceles desde Ajustes → Plan. No hay reembolsos por periodos parciales, salvo que la ley aplicable lo exija.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">6. Limitación de responsabilidad</h2>
        <p>MoneyMaker se ofrece “tal cual”. No somos responsables por decisiones que tomes con base en la información mostrada, por retrasos o errores en los datos que entregan los bancos o proveedores, ni por interrupciones del servicio.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">7. Ley aplicable</h2>
        <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a los tribunales de la Ciudad de México.</p>
        <p className="mt-8"><Link href="/legal/privacidad" className="font-semibold text-green-dark dark:text-green-light">Aviso de privacidad</Link></p>
      </main>
    </div>
  );
}
