// src/components/streaming/ExplorerStreamingView.tsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react'; // Añadir useMemo
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';
import { toast } from 'sonner';
import { RealtimeChannel, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { DirectionalControls } from './DirectionalControls';
import { ChatBox } from './ChatBox';
import { Database } from '@/types/supabase';
import InteractiveMap from '../map/InteractiveMap'; // Importar el mapa

type Mission = Database['public']['Tables']['missions']['Row'];

type ExplorerStreamingViewProps = {
  missionDetails: {
    channelName: string;
    userId: string;
    missionId: number;
  };
  currentUser: User;
  mission: Mission;
  isCompleted: boolean;
};

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

// Función helper para parsear la ubicación
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
  return null;
}

export function ExplorerStreamingView({
  missionDetails,
  currentUser,
  mission,
  isCompleted,
}: ExplorerStreamingViewProps) {
  const { channelName, userId, missionId } = missionDetails;

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);
  const [supabaseChannel, setSupabaseChannel] = useState<RealtimeChannel | null>(null);

  // --- ESTADOS Y VARIABLES CORREGIDOS ---
  const [scoutLocation, setScoutLocation] = useState<{ lat: number; lng: number } | null>(null);
  const missionLocation = useMemo(() => parseLocation(mission.location), [mission.location]);

  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    }
    const client = clientRef.current;

    if (isCompleted) {
      if (client.connectionState === 'CONNECTED') client.leave();
      setRemoteUser(null);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`mission-comms-${channelName}`);

    // Listener para respuestas rápidas
    channel.on('broadcast', { event: 'quick_reply' }, ({ payload }) => {
      toast.info(`Respuesta del Scout: ${payload.text}`);
    });

    // --- LISTENER CORREGIDO PARA UBICACIÓN ---
    channel.on('broadcast', { event: 'scout_location_update' }, ({ payload }) => {
      console.log('Scout location update received:', payload); // Para depurar
      setScoutLocation({ lat: payload.lat, lng: payload.lng });
    });

    channel.subscribe();
    setSupabaseChannel(channel);

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'video' && user.videoTrack) user.videoTrack.play('remote-video-player');
      if (mediaType === 'audio' && user.audioTrack) user.audioTrack.play();
      setRemoteUser(user);
    };

    const handleUserLeft = () => {
      toast.info('El Scout ha finalizado la transmisión.');
      setRemoteUser(null);
    };

    const join = async () => {
      if (client.connectionState !== 'DISCONNECTED') return;
      client.on('user-published', handleUserPublished);
      client.on('user-left', handleUserLeft);
      await client.join(APP_ID, channelName, null, userId);
    };
    join();

    return () => {
      supabase.removeChannel(channel);
      client.off('user-published', handleUserPublished);
      client.off('user-left', handleUserLeft);
      if (client.connectionState === 'CONNECTED') client.leave();
    };
  }, [channelName, userId, isCompleted]);

const renderMainContent = () => {
  // 1. Si la misión está completada, mostrar mensaje.
  if (isCompleted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-black/50 p-4 text-center text-white">
          <p className="text-2xl font-semibold">Misión Completada</p>
        </div>
      </div>
    );
  }

  // 2. Si el Scout está en camino (estado 'accepted'), mostrar el mapa de seguimiento.
  if (mission.status === 'accepted' && missionLocation) {
    return (
      <InteractiveMap
        center={scoutLocation || missionLocation}
        scoutLocation={scoutLocation || undefined}
        markerLocation={missionLocation}
        isInteractive={true}
        zoom={15}
      />
    );
  }

  // 3. Si la misión está 'in_progress' o si ya hay un 'remoteUser',
  //    preparamos la vista de video.
  if (mission.status === 'in_progress' || remoteUser) {
    return (
      <>
        {/* El contenedor de video siempre está presente, listo para recibir el stream. */}
        <div id="remote-video-player" className="h-full w-full bg-black"></div>

        {/* El botón de Play se superpone si el autoplay falla. */}
        {showPlayButton && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <Button size="lg" onClick={handlePlay}>
              <Play className="mr-2 h-5 w-5" /> Iniciar Video
            </Button>
          </div>
        )}

        {/* Mientras el video no llegue, mostramos "Conectando..." */}
        {!remoteUser && !showPlayButton && (
           <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="p-4 text-center text-white bg-black/40 rounded-lg">
                  <p className="text-2xl font-semibold">Conectando...</p>
              </div>
           </div>
        )}
      </>
    );
  }

  // 4. Estado por defecto mientras se carga.
  return (
    <div className="flex h-full items-center justify-center">
      <div className="p-4 text-center text-white">
        <p className="text-2xl font-semibold">Cargando Misión...</p>
      </div>
    </div>
  );
};

  return (
    <div className="flex h-full w-full flex-col bg-black md:flex-row">
      <div className="relative flex flex-grow items-center justify-center bg-gray-900">
        {renderMainContent()}
      </div>

      <div className="flex w-full flex-shrink-0 flex-col border-l border-gray-800 bg-gray-950 text-white md:w-80">
        <div className="border-b border-gray-700 p-4">
          <DirectionalControls channel={supabaseChannel} />
        </div>
        <div className="min-h-0 flex-grow p-2">
          <ChatBox missionId={missionId} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
}
