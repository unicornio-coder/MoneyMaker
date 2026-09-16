import { redirect } from 'next/navigation';

// Onboarding de 5 pasos: se construye en el Bloque C. Mientras, manda a la app.
export default function OnboardingPage() {
  redirect('/app');
}
