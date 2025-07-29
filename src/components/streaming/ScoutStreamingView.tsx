// src/components/streaming/ScoutStreamingView.tsx
'use client';

import { useState, useEffect } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
} from 'agora-rtc-sdk-ng';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { InstructionOverlay } from './InstructionOverlay';

type ScoutStreamingViewProps = {
  missionDetails: {
    channelName: string;
    userId: string;
  };
};

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

export function ScoutStreamingView({
  missionDetails,
}: ScoutStreamingViewProps) {
  const { channelName, userId } = missionDetails;

  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<ILocalVideoTrack | null>(null);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    // Inicializamos el cliente de Agora. Se ejecuta solo una vez.
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);

    // Limpieza al desmontar el componente
    return () => {
      // Dejamos el canal y liberamos recursos de cámara/micrófono
      localAudioTrack?.close();
      localVideoTrack?.close();
      agoraClient.leave();
    };
  }, []); // El array vacío asegura que se ejecute solo al montar/desmontar.

  const handleJoin = async () => {
    if (!client) {
      toast.error('El cliente de Agora no está inicializado.');
      return;
    }

    try {
      // Unirse al canal. En "Testing Mode", el token es null.
      await client.join(APP_ID, channelName, null, userId);
      toast.success(`Unido al canal: ${channelName}`);

      // Pedir permisos y crear pistas de audio y video
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      // Publicamos nuestras pistas para que otros las vean
      await client.publish([audioTrack, videoTrack]);
      toast.success('¡Transmisión iniciada!');

      // Reproducimos el video localmente para que el Scout se vea
      videoTrack.play('local-video-player');
      setIsJoined(true);
    } catch (error: unknown) {
      let errorMessage = 'Ocurrió un error desconocido.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error('Error al unirse al canal', { description: errorMessage });
      console.error(error);
    }
  };

  const handleLeave = async () => {
    if (localAudioTrack) {
      localAudioTrack.close();
      setLocalAudioTrack(null);
    }
    if (localVideoTrack) {
      localVideoTrack.close();
      setLocalVideoTrack(null);
    }
    if (client) {
      await client.leave();
    }
    setIsJoined(false);
    toast.info('Has finalizado la transmisión.');
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-gray-900">
      <div id="local-video-player" className="h-full w-full"></div>

      {/* El overlay que escuchará y mostrará las instrucciones del Explorer */}
      <InstructionOverlay channelName={channelName} />

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-4">
        {!isJoined ? (
          <Button onClick={handleJoin} size="lg">
            Iniciar Transmisión
          </Button>
        ) : (
          <Button onClick={handleLeave} variant="destructive" size="lg">
            Finalizar Transmisión
          </Button>
        )}
      </div>
    </div>
  );
}
