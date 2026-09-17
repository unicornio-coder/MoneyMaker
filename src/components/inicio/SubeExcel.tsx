import Link from 'next/link';
import { Upload, ChevronRight } from 'lucide-react';

export function SubeExcel() {
  return (
    <Link href="/app/importar" className="flex h-11 items-center gap-2.5 rounded-input bg-ink px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-green dark:bg-white dark:text-ink dark:hover:bg-green-light">
      <Upload size={15} />
      <span className="flex-1">Sube tu estado de cuenta</span>
      <ChevronRight size={16} />
    </Link>
  );
}
