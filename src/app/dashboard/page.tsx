// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AvailableMissionsList } from '@/components/missions/AvailableMissionsList';
import { MyMissionsList } from '@/components/missions/MyMissionsList'; // Crearemos este componente

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'explorer';

  return (
    <div className="space-y-8">
      {userRole === 'explorer' ? <ExplorerDashboard /> : <ScoutDashboard />}
    </div>
  );
}

// Sub-componente para el dashboard del Explorer
function ExplorerDashboard() {
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Misiones (Explorer)</h1>
          <p className="text-muted-foreground mt-2">
            Aquí puedes ver las misiones que has creado.
          </p>
        </div>
        <Link href="/dashboard/create-mission">
          <Button>+ Crear Nueva Misión</Button>
        </Link>
      </div>
      {/* Mostraremos la lista de misiones del explorer aquí */}
      <MyMissionsList />
    </div>
  );
}

// Sub-componente para el dashboard del Scout
function ScoutDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Misiones Disponibles (Scout)</h1>
      <p className="text-muted-foreground mt-2">
        Estas son las misiones cercanas a tu ubicación.
      </p>
      {/* El componente que llamará a la función RPC */}
      <AvailableMissionsList />
    </div>
  );
}
