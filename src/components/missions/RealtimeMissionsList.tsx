// src/components/missions/RealtimeMissionsList.tsx
'use client';

import { useEffect, useState, useRef } from 'react'; // Importar useRef
import { createClient } from '@/lib/supabase/client';
import type { MissionWithScout } from './MyMissionsList';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export function RealtimeMissionsList({
  serverMissions,
}: {
  serverMissions: MissionWithScout[];
}) {
  const [missions, setMissions] = useState(serverMissions);
  const router = useRouter();

  // Usamos useRef para almacenar los IDs de las misiones que nos interesan.
  // Esto NO causa un re-render cuando cambia, es perfecto para dependencias estables.
  const missionIdsRef = useRef(serverMissions.map((m) => m.id));

  // Sincronizamos tanto el estado como la referencia si las props del servidor cambian.
  useEffect(() => {
    setMissions(serverMissions);
    missionIdsRef.current = serverMissions.map((m) => m.id);
  }, [serverMissions]);

  useEffect(() => {
    const supabase = createClient();

    // La suscripción solo se establece UNA VEZ, cuando el componente se monta.
    const channel = supabase
      .channel('missions-channel') // Nombre simple y único
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'missions',
        },
        (payload) => {
          console.log('Payload de UPDATE recibido:', payload);
          const updatedMission = payload.new as MissionWithScout;

          // Usamos la referencia para comprobar si el cambio es relevante.
          if (missionIdsRef.current.includes(updatedMission.id)) {
            console.log(
              `Misión ${updatedMission.id} es relevante. Actualizando UI y refrescando datos.`
            );

            // Actualizamos el estado local para un cambio visual inmediato del status.
            setMissions((currentMissions) =>
              currentMissions.map((mission) =>
                mission.id === updatedMission.id
                  ? { ...mission, ...updatedMission }
                  : mission
              )
            );

            // Forzamos un refresh para obtener los datos completos del JOIN (nombre del scout).
            router.refresh();
          } else {
            console.log(
              `Misión ${updatedMission.id} no es relevante para esta lista.`
            );
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`Estado del canal 'missions-channel': ${status}`);
        if (err) {
          console.error('Error en la suscripción a Realtime:', err);
        }
      });

    // La función de limpieza se ejecuta solo cuando el componente se desmonta.
    return () => {
      console.log(
        "Desmontando componente, removiendo canal 'missions-channel'."
      );
      supabase.removeChannel(channel);
    };
  }, []); // <-- ARRAY DE DEPENDENCIAS VACÍO

  const handleMissionClick = (mission: MissionWithScout) => {
    if (mission.status === 'accepted' || mission.status === 'in_progress') {
      router.push(`/dashboard/mission/${mission.id}`);
    }
  };

  if (!missions || missions.length === 0) {
    return (
      <div className="bg-muted/20 mt-6 rounded-lg border p-6">
        <p className="text-muted-foreground">
          No has creado ninguna misión todavía.
        </p>
      </div>
    );
  }

  return (
    // ... el JSX se queda exactamente igual ...
    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {missions.map((mission) => (
        <Card
          key={mission.id}
          onClick={() => handleMissionClick(mission)}
          className="hover:border-primary cursor-pointer transition-all duration-200"
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex-1 truncate">{mission.title}</CardTitle>
              <Badge
                variant={mission.status === 'pending' ? 'outline' : 'default'}
              >
                {mission.status}
              </Badge>
            </div>
            <CardDescription className="h-10 overflow-hidden text-ellipsis">
              {mission.description || 'Sin descripción'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mission.scouts && (
              <p className="text-sm font-medium">
                <strong>Scout:</strong> {mission.scouts.username}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              Creada: {new Date(mission.created_at).toLocaleDateString()}
            </p>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
