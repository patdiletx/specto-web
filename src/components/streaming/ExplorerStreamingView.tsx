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

type ExplorerStreamingViewProps = {
  missionDetails: {
    channelName: string;
    userId: string;
    missionId: number;
  };
  currentUser: User;
};

// --- LA LÍNEA QUE FALTABA ---
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

let agoraClient: IAgoraRTCClient | null = null;

export function ExplorerStreamingView({
  missionDetails,
  currentUser,
}: ExplorerStreamingViewProps) {
  const { channelName, userId, missionId } = missionDetails;
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(
    null
  );
  const [supabaseChannel, setSupabaseChannel] =
    useState<RealtimeChannel | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`instructions-for-${channelName}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(
          `Explorer suscrito al canal de instrucciones: instructions-for-${channelName}`
        );
      }
    });
    setSupabaseChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  useEffect(() => {
    if (!agoraClient) {
      agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      console.log('Cliente de Agora singleton (Explorer) inicializado.');
    }
    const client = agoraClient;

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

    const joinAndSetup = async () => {
      if (hasJoinedRef.current) return;
      hasJoinedRef.current = true;

      client.on('user-published', handleUserPublished);
      client.on('user-left', handleUserLeft);

      try {
        await client.join(APP_ID, channelName, null, userId);
        toast.success('Conectado al canal de la misión.');
      } catch (error) {
        console.error('Error al unirse al canal de Agora:', error);
        toast.error('No se pudo conectar al canal de la misión.');
        hasJoinedRef.current = false;
      }
    };

    joinAndSetup();

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-left', handleUserLeft);
    };
  }, [channelName, userId]);

  useEffect(() => {
    return () => {
      if (agoraClient && hasJoinedRef.current) {
        agoraClient.leave();
        hasJoinedRef.current = false;
      }
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-black md:flex-row">
      <div className="relative flex flex-grow items-center justify-center bg-gray-900">
        <div id="remote-video-player" className="h-full w-full bg-black"></div>
        {!remoteUser && (
          <div className="absolute p-4 text-center text-white">
            <p className="text-2xl font-semibold">Esperando al Scout</p>
            <p className="text-lg text-gray-400">
              La transmisión comenzará automáticamente.
            </p>
          </div>
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
