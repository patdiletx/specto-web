// src/hooks/useAgoraScout.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
} from 'agora-rtc-sdk-ng';
import { toast } from 'sonner';

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

type AgoraScoutConfig = {
  channelName: string;
  userId: string;
};

// Este hook encapsula TODA la lógica de Agora para el Scout.
export function useAgoraScout() {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTracksRef = useRef<{
    audio: ILocalAudioTrack | null;
    video: ILocalVideoTrack | null;
  }>({ audio: null, video: null });

  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Inicializa el cliente una sola vez.
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    }
  }, []);

  const join = async (config: AgoraScoutConfig) => {
    const client = clientRef.current;
    if (!client || isJoined || isJoining) return;

    setIsJoining(true);
    try {
      await client.join(APP_ID, config.channelName, null, config.userId);

      const [audioTrack, videoTrack] =
        await AgoraRTC.createMicrophoneAndCameraTracks();
      localTracksRef.current = { audio: audioTrack, video: videoTrack };

      await client.publish([audioTrack, videoTrack]);

      videoTrack.play('local-video-player');
      setIsJoined(true);
      toast.success('Transmisión iniciada.');
    } catch (error) {
      let errorMessage =
        'Ocurrió un error. Revisa los permisos de cámara/micrófono.';
      if (error instanceof Error) errorMessage = error.message;
      toast.error('Error al iniciar transmisión', {
        description: errorMessage,
      });
      console.error(error);
    } finally {
      setIsJoining(false);
    }
  };

  const leave = async () => {
    const client = clientRef.current;
    if (!client || !isJoined) return;

    const tracks = localTracksRef.current;
    tracks.audio?.close();
    tracks.video?.close();
    localTracksRef.current = { audio: null, video: null };

    await client.leave();
    setIsJoined(false);
    toast.info('Transmisión finalizada.');
  };

  return { join, leave, isJoined, isJoining };
}
