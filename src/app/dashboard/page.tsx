// src/app/dashboard/page.tsx
import InteractiveMap from '@/components/map/InteractiveMap';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bienvenido a Specto</h1>
          <p className="text-muted-foreground mt-2">
            Aquí podrás crear misiones o buscar misiones disponibles.
          </p>
        </div>
        <Link href="/dashboard/create-mission">
          <Button>+ Crear Nueva Misión</Button>
        </Link>
      </div>

      <div className="rounded-lg border p-2">
        <InteractiveMap />
      </div>
    </div>
  );
}
