// src/components/streaming/ExplorerStreamingView.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';
import { toast } from 'sonner';

type ExplorerStreamingViewProps = {
  missionDetails: {
    channelName: string;
    userId: string;
  };
};

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

// Mantenemos una instancia del cliente FUERA del componente.
// Esto garantiza que es un singleton y que no se recreará NUNCA.
let agoraClient: IAgoraRTCClient | null = null;

export function ExplorerStreamingView({
  missionDetails,
}: ExplorerStreamingViewProps) {
  const { channelName, userId } = missionDetails;
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(
    null
  );

  // Usamos useRef para un flag que nos indique si ya se ha intentado la conexión.
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    // --- LÓGICA DE INICIALIZACIÓN SINGLETON ---
    if (!agoraClient) {
      agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      console.log('Cliente de Agora singleton inicializado por primera vez.');
    }
    const client = agoraClient;

    const handleUserPublished = async (
      user: IAgoraRTCRemoteUser,
      mediaType: 'video' | 'audio'
    ) => {
      console.log(`Scout [${user.uid}] publicó media: ${mediaType}`);
      await client.subscribe(user, mediaType);

      if (mediaType === 'video' && user.videoTrack) {
        user.videoTrack.play('remote-video-player');
      }
      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.play();
      }
      setRemoteUser(user);
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      console.log(`Scout [${user.uid}] abandonó el canal.`);
      toast.info('El Scout ha finalizado la transmisión.');
      setRemoteUser(null);
    };

    const joinAndSetup = async () => {
      // --- CONTROL DE DOBLE EJECUCIÓN ---
      // Si ya hemos intentado unirnos (o estamos en proceso), no hacemos nada más.
      if (hasJoinedRef.current) {
        console.log(
          'Ya se ha intentado la unión, saltando ejecución duplicada.'
        );
        return;
      }
      hasJoinedRef.current = true; // Marcamos que estamos intentando unirnos.

      console.log('Configurando listeners y uniéndose al canal...');
      client.on('user-published', handleUserPublished);
      client.on('user-left', handleUserLeft);

      try {
        await client.join(APP_ID, channelName, null, userId);
        console.log(`Explorer [${userId}] unido al canal: ${channelName}`);
        toast.success('Conectado al canal.');
      } catch (error) {
        console.error('Error al unirse al canal:', error);
        toast.error('No se pudo conectar al canal.');
        hasJoinedRef.current = false; // Reseteamos si falla para poder reintentar.
      }
    };

    joinAndSetup();

    return () => {
      console.log('Limpiando efecto del ExplorerView...');
      // La limpieza solo debe desuscribir listeners.
      // Dejaremos que el usuario abandone el canal de forma explícita al salir de la página.
      client.off('user-published', handleUserPublished);
      client.off('user-left', handleUserLeft);
      // No llamamos a leave() aquí para evitar la condición de carrera.
      // La mejor práctica es un 'leave' explícito (ej. al navegar fuera)
    };
  }, [channelName, userId]);

  // Este useEffect adicional maneja la salida del canal de forma segura.
  useEffect(() => {
    return () => {
      if (agoraClient && hasJoinedRef.current) {
        console.log(
          'Componente desmontado permanentemente. Abandonando el canal.'
        );
        agoraClient.leave();
        // Opcional: destruir el cliente si no se va a volver a usar.
        // agoraClient = null;
        hasJoinedRef.current = false;
      }
    };
  }, []); // Array vacío para que solo se ejecute al desmontar permanentemente.

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gray-900">
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
  );
}
