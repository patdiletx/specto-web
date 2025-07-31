// src/components/streaming/ExplorerStreamingView.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
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

// Helper function to parse location from Supabase
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
  // Fallback for string-based location
  if (typeof location === 'string' && location.includes('POINT')) {
    const match = location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match && match.length >= 3) {
      return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }
  }
  return null;
}

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

export function ExplorerStreamingView({
  missionDetails,
  currentUser,
  mission,
  isCompleted,
}: ExplorerStreamingViewProps) {
  const { channelName, userId, missionId } = missionDetails;

  // --- SOLUCIÓN 1: Usar useRef para el cliente de Agora ---
  const clientRef = useRef<IAgoraRTCClient | null>(null);

  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(
    null
  );
  const [supabaseChannel, setSupabaseChannel] =
    useState<RealtimeChannel | null>(null);
  const [scoutLocation, setScoutLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    // Inicializamos el cliente una sola vez y lo guardamos en la referencia.
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    }
    const client = clientRef.current;

    // Si la misión se completa, limpiamos.
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

    const handleUserPublished = async (
      user: IAgoraRTCRemoteUser,
      mediaType: 'video' | 'audio'
    ) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'video' && user.videoTrack)
        user.videoTrack.play('remote-video-player');
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

  const missionLocation = parseLocation(mission.location);
  return (
    <div className="flex h-full w-full flex-col bg-black md:flex-row">
      <div className="relative flex flex-grow items-center justify-center bg-gray-900">
        {!remoteUser && !isCompleted && missionLocation ? (
          <InteractiveMap
            center={scoutLocation || missionLocation}
            scoutLocation={scoutLocation ?? undefined}
            markerLocation={missionLocation}
            isInteractive={true}
            zoom={15}
          />
        ) : (
          <>
            <div
              id="remote-video-player"
              className="h-full w-full bg-black"
            ></div>
            {isCompleted && (
              <div className="absolute rounded-lg bg-black/50 p-4 text-center text-white">
                <p className="text-2xl font-semibold">Misión Completada</p>
              </div>
            )}
          </>
        )}
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
