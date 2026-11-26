import { Landing } from '@/components/landing/Landing';
import { haySesion } from '@/lib/auth/session';

export const metadata = {
  title: 'MoneyMaker · Todo tu dinero en un solo lugar',
  description: 'Sube el estado de cuenta de tu banco y en dos minutos ves tus suscripciones, tus meses sin intereses y cuánto puedes invertir. Sin claves del banco. Gratis.',
};

export const dynamic = 'force-dynamic';

export default async function Home() {
  return <Landing sesion={await haySesion()} />;
}
