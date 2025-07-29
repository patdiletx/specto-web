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

  // Efecto para cargar las misiones iniciales
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('La geolocalización no es soportada por tu navegador.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const { data, error: rpcError } = await supabase.rpc(
          'get_available_missions',
          {
            scout_lat: latitude,
            scout_lng: longitude,
            search_radius_meters: 50000,
          }
        );

        if (rpcError) {
          setError(`Error al buscar misiones: ${rpcError.message}`);
        } else {
          setMissions(data || []);
        }
        setIsLoading(false);
      },
      (geoError) => {
        setError(`Error de geolocalización: ${geoError.message}`);
        setIsLoading(false);
      }
    );
  }, [supabase]);

  // --- ¡NUEVO EFECTO PARA ESCUCHAR NUEVAS MISIONES! ---
  useEffect(() => {
    const channel = supabase
      .channel('new-missions-listener')
      .on<Mission>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'missions',
        },
        (payload) => {
          console.log('¡Nueva misión creada!', payload.new);
          toast.info(`Nueva misión disponible: "${payload.new.title}"`);
          // Añadimos la nueva misión al principio de la lista
          setMissions((currentMissions) => [payload.new, ...currentMissions]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleAcceptMission = async (missionId: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Debes estar logueado.');
      return;
    }

    const { error: updateError } = await supabase
      .from('missions')
      .update({
        scout_id: user.id,
        status: 'accepted',
      })
      .eq('id', missionId);

    if (updateError) {
      toast.error('No se pudo aceptar la misión', {
        description: updateError.message,
      });
    } else {
      toast.success('¡Misión aceptada! Preparando transmisión...');
      router.push(`/dashboard/mission/${missionId}`);
    }
  };

  if (isLoading) return <p>Buscando misiones cercanas...</p>;
  if (error) return <p className="text-destructive">{error}</p>;
  if (missions.length === 0)
    return <p>No hay misiones disponibles cerca de ti en este momento.</p>;

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
