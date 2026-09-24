import { Landing } from '@/components/landing/Landing';
import { haySesion } from '@/lib/auth/session';

export const metadata = {
  title: 'MoneyMaker · Sabe cuánto te queda esta quincena',
  description: 'Sube el estado de cuenta de tu banco y en dos minutos ves tus suscripciones, tus meses sin intereses y cuánto puedes invertir. Sin claves del banco. 7 días gratis.',
};

export const dynamic = 'force-dynamic';

export default async function Home() {
  return <Landing sesion={await haySesion()} />;
}
