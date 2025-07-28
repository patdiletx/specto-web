// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function DashboardPage() {
  // Ya no necesitamos pasarle el cookieStore, la función lo obtiene por sí misma
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-3xl font-bold">Bienvenido al Dashboard</h1>
      <p className="mt-4">Estás logueado como: {session.user.email}</p>
      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
