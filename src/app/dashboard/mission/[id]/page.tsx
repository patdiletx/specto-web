// src/app/dashboard/mission/[id]/page.tsx
'use client'; // <-- Volvemos a marcarlo como Componente de Cliente

import dynamic from 'next/dynamic';

// --- LA SOLUCIÓN ESTÁ AQUÍ ---
// Ahora que estamos en un Componente de Cliente, podemos usar 'ssr: false'.
// Cargamos dinámicamente un "contenedor" que manejará toda la lógica.
const MissionViewContainer = dynamic(
  () => import('@/components/streaming/MissionViewContainer'),
  {
    ssr: false, // Esto es CRUCIAL
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        Cargando Misión...
      </div>
    ),
  }
);

export default function MissionDetailPage() {
  return (
    <div className="-m-4 h-[calc(100vh-4rem)] w-full bg-black md:-m-8">
      <MissionViewContainer />
    </div>
  );
}
