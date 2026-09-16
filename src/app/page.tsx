import { redirect } from 'next/navigation';

// La landing pública llega en la Fase 4. Mientras, la raíz manda a la app.
export default function Home() {
  redirect('/app');
}
