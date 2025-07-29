// src/components/missions/AvailableMissionsList.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Mission = Tables<'missions'>;

export function AvailableMissionsList() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // 1. Obtener la geolocalización del navegador
    if (!navigator.geolocation) {
      setError('La geolocalización no es soportada por tu navegador.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // 2. Llamar a la función RPC de Supabase
        const { data, error: rpcError } = await supabase.rpc(
          'get_available_missions',
          {
            scout_lat: latitude,
            scout_lng: longitude,
            search_radius_meters: 50000, // Buscar en un radio de 50km
          }
        );

        if (rpcError) {
          setError(`Error al buscar misiones: ${rpcError.message}`);
        } else {
          setMissions(data || []);
        }
        setIsLoading(false);
      },
      (error) => {
        setError(`Error de geolocalización: ${error.message}`);
        setIsLoading(false);
      }
    );
  }, [supabase]);

  const handleAcceptMission = async (missionId: number) => {
    // Estado para deshabilitar el botón mientras se procesa
    // Esto previene dobles clics y da feedback visual.
    // Necesitarías añadir un estado en tu componente: const [isAccepting, setIsAccepting] = useState(false);
    // y luego en el botón: disabled={isAccepting}

    console.log(
      `[1] Iniciando handleAcceptMission para la misión ID: ${missionId}`
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Debes estar logueado.');
      return;
    }

    // Mostramos un toast de "cargando" para dar feedback inmediato.
    const promise = new Promise(async (resolve, reject) => {
      console.log(`[2] Ejecutando la actualización de Supabase...`);
      const { error: updateError } = await supabase
        .from('missions')
        .update({
          scout_id: user.id,
          status: 'accepted',
        })
        .eq('id', missionId);

      if (updateError) {
        console.error(
          `[ERROR] Falló la actualización de Supabase:`,
          updateError
        );
        reject(updateError);
      } else {
        console.log(`[3] Actualización de Supabase exitosa.`);
        resolve(true);
      }
    });

    toast.promise(promise, {
      loading: 'Aceptando misión...',
      success: () => {
        console.log(`[4] Toast 'success'. Procediendo a la redirección...`);
        // Usamos un pequeño timeout para asegurar que el toast se vea antes de navegar.
        setTimeout(() => {
          const targetUrl = `/dashboard/mission/${missionId}`;
          console.log(`[5] Redirigiendo a: ${targetUrl}`);
          router.push(targetUrl);
        }, 500); // 500ms de espera

        return '¡Misión aceptada! Preparando transmisión...';
      },
      error: (err) => {
        console.error(`[ERROR] Toast 'error'.`, err);
        return `Error al aceptar la misión: ${err.message}`;
      },
    });
  };

  if (isLoading) return <p>Buscando misiones cercanas...</p>;
  if (error) return <p className="text-destructive">{error}</p>;
  if (missions.length === 0)
    return <p>No hay misiones disponibles cerca de ti.</p>;

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {missions.map((mission) => (
        <Card key={mission.id}>
          <CardHeader>
            <CardTitle>{mission.title}</CardTitle>
            <CardDescription>
              {mission.description || 'Sin descripción'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Duración:</strong> {mission.requested_duration_minutes}{' '}
              min
            </p>
            <p>
              <strong>Recompensa:</strong>{' '}
              {(mission.price_cents / 100).toFixed(2)} €
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => handleAcceptMission(mission.id)}
            >
              Aceptar Misión
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
