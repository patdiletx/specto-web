// src/components/streaming/ExplorerStreamingView.tsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
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
import InteractiveMap from '../map/InteractiveMap';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

type Mission = Database['public']['Tables']['missions']['Row'];

type ExplorerStreamingViewProps = {
  missionDetails: { channelName: string; userId: string; missionId: number };
  currentUser: User;
  mission: Mission;
  isCompleted: boolean;
};

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

function parseLocation(location: any): { lng: number; lat: number } | null {
  if (
    location &&
    typeof location === 'object' &&
    location.type === 'Point' &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2
  ) {
    return { lng: location.coordinates[0], lat: location.coordinates[1] };
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
  const remoteUserRef = useRef<IAgoraRTCRemoteUser | null>(null); // Ref para el usuario remoto
  const [supabaseChannel, setSupabaseChannel] = useState<RealtimeChannel | null>(null);
  const [scoutLocation, setScoutLocation] = useState<{ lat: number; lng: number } | null>(null);
  const missionLocation = useMemo(() => parseLocation(mission.location), [mission.location]);
  const [showPlayButton, setShowPlayButton] = useState(false); // Estado para el botón de Play

  useEffect(() => {
    remoteUserRef.current = remoteUser;
  }, [remoteUser]);

  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    }
    const client = clientRef.current;

    // Listener para el fallo de autoplay
    const handleAutoplayFailed = () => {
      setShowPlayButton(true);
      toast.warning('El navegador bloqueó la reproducción automática. Presiona Play para iniciar.');
    };
    AgoraRTC.onAutoplayFailed = handleAutoplayFailed;

    if (isCompleted) {
      if (client.connectionState === 'CONNECTED') client.leave();
      setRemoteUser(null);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`mission-comms-${channelName}`);

    channel.on('broadcast', { event: 'quick_reply' }, ({ payload }) => {
      toast.info(`Respuesta del Scout: ${payload.text}`);
    });

    channel.on('broadcast', { event: 'scout_location_update' }, ({ payload }) => {
      setScoutLocation({ lat: payload.lat, lng: payload.lng });
    });

    channel.subscribe();
    setSupabaseChannel(channel);

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'video') user.videoTrack?.play('remote-video-player');
      if (mediaType === 'audio') user.audioTrack?.play();
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
      AgoraRTC.onAutoplayFailed = () => {}; // Limpiar el listener
    };
  }, [channelName, userId, isCompleted]);

  // Función para manejar el clic del botón Play
  const handlePlay = async () => {
    if (remoteUserRef.current) {
      try {
        if (remoteUserRef.current.audioTrack) await remoteUserRef.current.audioTrack.play();
        if (remoteUserRef.current.videoTrack) await remoteUserRef.current.videoTrack.play('remote-video-player');
        setShowPlayButton(false);
      } catch (error) {
        toast.error('No se pudo iniciar la reproducción.');
        console.error('Error al reproducir manualmente:', error);
      }
    }
  };

  const renderMainContent = () => {
    // 1. Mostrar video si está activo.
    if (remoteUser && remoteUser.videoTrack) {
      return (
        <>
          <div id="remote-video-player" className="h-full w-full bg-black"></div>
          {showPlayButton && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
              <Button size="lg" onClick={handlePlay}>
                <Play className="mr-2 h-5 w-5" /> Iniciar Video
              </Button>
            </div>
          )}
        </>
      );
    }
    // ... resto de la lógica de renderMainContent ...
    if (isCompleted) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="rounded-lg bg-black/50 p-4 text-center text-white">
            <p className="text-2xl font-semibold">Misión Completada</p>
          </div>
        </div>
      );
    }

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

    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-4 text-center text-white">
          <p className="text-2xl font-semibold">Esperando al Scout...</p>
          <p className="text-lg text-gray-400">La transmisión comenzará automáticamente.</p>
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
