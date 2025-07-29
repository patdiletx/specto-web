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
import { MessageSquare } from 'lucide-react';
import { ChatBox } from './ChatBox';
import { User } from '@supabase/supabase-js';

type ScoutStreamingViewProps = {
  missionDetails: {
    channelName: string;
    userId: string;
    missionId: number;
  };
  currentUser: User;
};

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

export function ScoutStreamingView({
  missionDetails,
  currentUser,
}: ScoutStreamingViewProps) {
  const { channelName, userId, missionId } = missionDetails;

  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<ILocalVideoTrack | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);

    return () => {
      localAudioTrack?.close();
      localVideoTrack?.close();
      agoraClient.leave();
    };
  }, []);

  const handleJoin = async () => {
    if (!client) return;

    try {
      await client.join(APP_ID, channelName, null, userId);
      toast.success(`Unido al canal: ${channelName}`);

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      await client.publish([audioTrack, videoTrack]);
      toast.success('¡Transmisión iniciada!');

      videoTrack.play('local-video-player');
      setIsJoined(true);
    } catch (error: unknown) {
      let errorMessage = 'Ocurrió un error desconocido.';
      if (error instanceof Error) errorMessage = error.message;
      toast.error('Error al unirse al canal', { description: errorMessage });
      console.error(error);
    }
  };

  const handleLeave = async () => {
    localAudioTrack?.close();
    localVideoTrack?.close();
    setLocalAudioTrack(null);
    setLocalVideoTrack(null);
    await client?.leave();
    setIsJoined(false);
    toast.info('Has finalizado la transmisión.');
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-gray-900">
      <div id="local-video-player" className="h-full w-full"></div>

      <InstructionOverlay channelName={channelName} />

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
            <Button onClick={handleLeave} variant="destructive" size="lg">
              Finalizar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
