// src/app/dashboard/layout.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserNav } from '@/components/layout/UserNav';

// Este es el layout para todas las rutas autenticadas
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="bg-background sticky top-0 flex h-16 items-center gap-4 border-b px-4 md:px-6">
        <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <span className="font-bold">Specto</span>
          </Link>
        </nav>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <div className="ml-auto flex-1 sm:flex-initial">
            {/* Pasamos el objeto 'user' al componente cliente */}
            <UserNav user={user} />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
