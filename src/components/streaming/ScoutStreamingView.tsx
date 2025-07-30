// src/components/streaming/ScoutStreamingView.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
} from 'agora-rtc-sdk-ng';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { InstructionOverlay } from './InstructionOverlay';
import { ScoutQuickReplies } from './ScoutQuickReplies';
import { MessageSquare } from 'lucide-react';
import { ChatBox } from './ChatBox';
import { User, RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import { useMissionStatus } from '@/hooks/useMissionStatus';

type Mission = Database['public']['Tables']['missions']['Row'];

type ScoutStreamingViewProps = {
  missionDetails: {
    channelName: string;
    userId: string;
    missionId: number;
  };
  currentUser: User;
  mission: Mission;
};

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

export function ScoutStreamingView({
  missionDetails,
  currentUser,
  mission,
}: ScoutStreamingViewProps) {
  const { channelName, userId, missionId } = missionDetails;

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);

  const [isJoined, setIsJoined] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [supabaseChannel, setSupabaseChannel] =
    useState<RealtimeChannel | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const { isCompleted } = useMissionStatus(mission, currentUser);

  useEffect(() => {
    // Inicialización del cliente de Agora
    if (!clientRef.current) {
      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    }
    const client = clientRef.current;

    // Gestión del canal de Supabase
    const channel = supabase.channel(`mission-comms-${channelName}`);
    channel.subscribe();
    setSupabaseChannel(channel);

    // Limpieza al desmontar el componente permanentemente
    return () => {
      supabase.removeChannel(channel);
      // Limpiamos los tracks y abandonamos el canal de Agora
      localAudioTrackRef.current?.close();
      localVideoTrackRef.current?.close();
      if (client && client.connectionState === 'CONNECTED') {
        client.leave();
      }
    };
  }, [channelName, supabase]);

  useEffect(() => {
    // Cuando el hook nos dice que la misión está completada, limpiamos y redirigimos.
    if (isCompleted) {
      // No necesitamos limpiar los tracks aquí porque la función de limpieza del useEffect principal lo hará al desmontar.
      router.push('/dashboard');
    }
  }, [isCompleted, router]);

  const handleJoin = async () => {
    const client = clientRef.current;
    if (!client || isJoined) return;

    try {
      await client.join(APP_ID, channelName, null, userId);

      const [audioTrack, videoTrack] =
        await AgoraRTC.createMicrophoneAndCameraTracks();

      // Guardamos los tracks en referencias
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;

      await client.publish([audioTrack, videoTrack]);

      videoTrack.play('local-video-player');
      setIsJoined(true);
      toast.success('¡Transmisión iniciada!');
    } catch (error: unknown) {
      let errorMessage =
        'Ocurrió un error. Revisa los permisos de cámara/micrófono.';
      if (error instanceof Error) errorMessage = error.message;
      toast.error('Error al iniciar transmisión', {
        description: errorMessage,
      });
      console.error(error);
    }
  };

  const handleCompleteMission = async () => {
    console.log('[DEBUG] handleCompleteMission started.');
    toast.info('[DEBUG] 1/4: Starting mission completion...');
    setIsCompleting(true);

    console.log('[DEBUG] Calling Supabase to update mission...');
    toast.info('[DEBUG] 2/4: Sending update to server...');

    const { error } = await supabase
      .from('missions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', missionId);

    console.log('[DEBUG] Supabase call finished. Error object:', error);
    toast.info(`[DEBUG] 3/4: Server responded. Error: ${!!error}`);

    if (error) {
      toast.error('Error al completar la misión', {
        description: `[DEBUG] ${error.message}`,
      });
      console.error('[DEBUG] Supabase update error:', error);
      setIsCompleting(false);
    } else {
      toast.success('[DEBUG] 4/4: Update successful! Navigating...');
      console.log('[DEBUG] Update successful. Navigating to /dashboard...');
      router.push('/dashboard');
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-gray-900">
      <div id="local-video-player" className="h-full w-full"></div>
      <InstructionOverlay channelName={channelName} />
      {isJoined && <ScoutQuickReplies channel={supabaseChannel} />}
      {showChat && (
        <div className="absolute top-4 right-4 bottom-24 z-20 w-80 rounded-lg bg-black/70 backdrop-blur-md">
          <ChatBox missionId={missionId} currentUser={currentUser} />
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-4">
        {!isJoined ? (
          <Button onClick={handleJoin} size="lg">
            Iniciar Transmisión
          </Button>
        ) : (
          <>
            <Button
              onClick={() => setShowChat(!showChat)}
              variant="outline"
              size="icon"
            >
              <MessageSquare />
            </Button>
            <Button
              onClick={handleCompleteMission}
              variant="destructive"
              size="lg"
              disabled={isCompleting}
            >
              {isCompleting ? 'Finalizando...' : 'Completar Misión'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
