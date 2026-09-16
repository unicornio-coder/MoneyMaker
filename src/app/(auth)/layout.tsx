import Link from 'next/link';
import { Logo } from '@/components/shell/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-[70px] items-center px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-[15px] font-bold">MoneyMaker</span>
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-form flex-1 flex-col px-5 pb-16 pt-6">{children}</main>
    </div>
  );
}
