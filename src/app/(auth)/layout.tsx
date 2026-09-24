import Link from 'next/link';
import { Logo } from '@/components/shell/Logo';
import { PanelMarca } from '@/components/auth/PanelMarca';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-surface md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <PanelMarca />
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-[70px] items-center justify-between px-5 md:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-[15px] font-bold">MoneyMaker</span>
          </Link>

        </header>
        <main className="mx-auto flex w-full max-w-form flex-1 flex-col justify-center px-5 pb-16 pt-4 md:pb-24">{children}</main>
        <footer className="px-5 pb-6 text-center text-[11px] text-txt-3 md:hidden">Sin claves del banco. El PDF se descarta.</footer>
      </div>
    </div>
  );
}
