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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import InteractiveMap from '../map/InteractiveMap';

type MissionWithDistance = Tables<'missions'> & {
  distance_meters?: number;
};

function formatDistance(meters: number | undefined): string | null {
  if (meters === undefined || meters === null) {
    return null;
  }
  if (meters < 1000) {
    return `A ${Math.round(meters)} m`;
  }
  return `A ${(meters / 1000).toFixed(1)} km`;
}

function parseLocation(location: any): { lng: number; lat: number } | null {
  if (
    location &&
    typeof location === 'object' &&
    location.type === 'Point' &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2
  ) {
    return {
      lng: location.coordinates[0],
      lat: location.coordinates[1],
    };
  }

  // Mantenemos el parseo de string como fallback por si acaso
  if (typeof location === 'string' && location.includes('POINT')) {
    const match = location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match && match.length >= 3) {
      return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }
  }

  return null;
}

export function AvailableMissionsList() {
  const [missions, setMissions] = useState<MissionWithDistance[]>([]);
  const [selectedMission, setSelectedMission] =
    useState<MissionWithDistance | null>(null);
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
      .on<MissionWithDistance>(
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
    <>
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
              {mission.distance_meters !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {formatDistance(mission.distance_meters)}
                </p>
              )}
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedMission(mission)}
              >
                Ver Detalles
              </Button>
              <Button onClick={() => handleAcceptMission(mission.id)}>
                Aceptar
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedMission && (
        <Dialog
          open={selectedMission !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedMission(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{selectedMission.title}</DialogTitle>
              <DialogDescription>
                {selectedMission.description || 'No hay descripción.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {(() => {
                const missionLocation = parseLocation(selectedMission.location);
                if (missionLocation) {
                  return (
                    <InteractiveMap
                      center={missionLocation}
                      markerLocation={missionLocation}
                      isInteractive={true}
                      zoom={15}
                    />
                  );
                }
                return (
                  <p>La información de la ubicación no está disponible.</p>
                );
              })()}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedMission(null)}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => handleAcceptMission(selectedMission.id)}
              >
                Aceptar Misión
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
