import Link from 'next/link';
import { Logo } from '@/components/shell/Logo';

export const metadata = { title: 'Aviso de privacidad · MoneyMaker' };

// BORRADOR para revisión legal. Cubre lo que exige la LFPDPPP (identidad del responsable, finalidades, datos
// financieros como datos sensibles con consentimiento expreso, transferencias, derechos ARCO y revocación).
export default function PrivacidadPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="mx-auto flex h-[70px] max-w-[760px] items-center px-5"><Link href="/" className="flex items-center gap-2.5"><Logo /><span className="font-display text-[15px] font-bold">MoneyMaker</span></Link></header>
      <main className="prose mx-auto max-w-[760px] px-5 pb-20 text-[14px] leading-relaxed text-fg">
        <h1 className="font-display text-[28px] font-bold tracking-[-0.8px]">Aviso de privacidad</h1>
        <p className="text-txt-2">Última actualización: septiembre de 2026. <b>Borrador sujeto a revisión legal.</b></p>
        <h2 className="mt-8 font-display text-[18px] font-bold">1. Responsable</h2>
        <p>MoneyMaker (en adelante “MoneyMaker”, “nosotros”), con domicilio en [DOMICILIO], es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y su Reglamento. Contacto: privacidad@moneymaker.mx.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">2. Datos que tratamos</h2>
        <ul className="list-disc pl-5">
          <li><b>Identificación y contacto:</b> nombre, correo electrónico.</li>
          <li><b>Datos financieros y patrimoniales (sensibles):</b> cuentas bancarias, saldos, movimientos, tarjetas, inversiones, activos y deudas que decides conectar, importar o capturar. Su tratamiento requiere tu <b>consentimiento expreso</b>, que otorgas al conectar cada fuente.</li>
          <li><b>Datos de uso:</b> pantallas visitadas, eventos de producto y dispositivo, para mejorar el servicio.</li>
        </ul>
        <p>Nunca solicitamos ni almacenamos tus contraseñas bancarias. La conexión con tu banco se realiza a través de Belvo, proveedor de agregación financiera, con acceso de solo lectura.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">3. Finalidades</h2>
        <p><b>Primarias (necesarias):</b> mostrarte tus cuentas y movimientos, categorizarlos, detectar cargos recurrentes y compras a meses, armar tu presupuesto, calcular tu patrimonio, generar avisos y recomendaciones, gestionar tu cuenta y tu suscripción. <b>Secundarias (puedes negarte):</b> comunicaciones sobre nuevas funciones y análisis agregados y anonimizados del servicio.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">4. Transferencias</h2>
        <p>Compartimos datos solo con proveedores que necesitamos para operar, bajo contrato de confidencialidad: Belvo (conexión bancaria), Supabase (infraestructura y base de datos), Vercel (alojamiento), Stripe (cobro de la suscripción), Google (inicio de sesión y, si lo autorizas, lectura de alertas bancarias de tu correo) y Anthropic (clasificación automática de descripciones de movimientos, sin datos de identificación). No vendemos tus datos ni los compartimos con bancos o terceros con fines comerciales.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">5. Derechos ARCO y revocación</h2>
        <p>Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, y revocar tu consentimiento, desde Ajustes → Cuenta y seguridad → Borrar mi cuenta (elimina tus datos y revoca las conexiones bancarias) o escribiendo a privacidad@moneymaker.mx. Respondemos en un máximo de 20 días hábiles.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">6. Seguridad y conservación</h2>
        <p>Ciframos los datos en tránsito y en reposo, aislamos la información de cada usuario en la base de datos y ciframos las credenciales de conectores con llaves que no viven en la base. Conservamos tus datos mientras tengas cuenta activa y hasta 30 días después de borrarla para respaldos.</p>
        <h2 className="mt-6 font-display text-[18px] font-bold">7. Cambios</h2>
        <p>Publicaremos cualquier cambio en esta página y te avisaremos por correo cuando sea relevante.</p>
        <p className="mt-8"><Link href="/legal/terminos" className="font-semibold text-green">Términos y condiciones</Link></p>
      </main>
    </div>
  );
}
