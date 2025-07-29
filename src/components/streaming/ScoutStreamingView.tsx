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

// Props que el componente recibirá de la página del servidor
type ScoutStreamingViewProps = {
  missionDetails: {
    channelName: string;
    userId: string;
  };
};

// Obtenemos el App ID de las variables de entorno del cliente
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

export function ScoutStreamingView({
  missionDetails,
}: ScoutStreamingViewProps) {
  const { channelName, userId } = missionDetails;

  // Estados para manejar los objetos de Agora
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<ILocalVideoTrack | null>(null);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    // Inicializamos el cliente de Agora. Lo hacemos una sola vez.
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);

    // Limpieza al desmontar el componente
    return () => {
      // Dejamos el canal y liberamos recursos
      localAudioTrack?.close();
      localVideoTrack?.close();
      if (client) {
        client.leave();
      }
    };
  }, []); // El array vacío asegura que esto se ejecute solo una vez

  const handleJoin = async () => {
    if (!client) {
      toast.error('El cliente de Agora no está inicializado.');
      return;
    }
    if (!channelName) {
      toast.error('Nombre del canal no válido.');
      return;
    }

    try {
      // Nos unimos al canal.
      // Para el "Testing Mode: APP ID", el token puede ser null.
      await client.join(APP_ID, channelName, null, userId);
      toast.success(`Unido al canal: ${channelName}`);

      // Creamos las pistas de audio y video
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      // Publicamos nuestras pistas para que otros las vean
      await client.publish([audioTrack, videoTrack]);
      toast.success('¡Transmisión iniciada!');

      // Reproducimos el video localmente
      videoTrack.play('local-video-player');
      setIsJoined(true);
    } catch (error: unknown) {
      let errorMessage = 'Ocurrió un error desconocido.';
      if (error instanceof Error) {
        // Si es una instancia de Error, sabemos que tiene una propiedad 'message'
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast.error('Error al unirse al canal', { description: errorMessage });
      console.error('Detalles del error al unirse:', error);
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
    toast.info('Has abandonado el canal.');
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-gray-900">
      <div id="local-video-player" className="h-full w-full"></div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-4">
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
