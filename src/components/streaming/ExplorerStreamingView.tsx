// src/components/streaming/ExplorerStreamingView.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { DirectionalControls } from './DirectionalControls';
import { ChatBox } from './ChatBox';
import { Database } from '@/types/supabase';

type Mission = Database['public']['Tables']['missions']['Row'];

type ExplorerStreamingViewProps = {
  missionDetails: { channelName: string; userId: string; missionId: number };
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

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const [supabaseChannel, setSupabaseChannel] =
    useState<RealtimeChannel | null>(null);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(
    null
  );
  const [showPlayButton, setShowPlayButton] = useState(false);

  useEffect(() => {
    if (isCompleted) return;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    AgoraRTC.onAutoplayFailed = () => setShowPlayButton(true);

    const handleUserPublished = async (
      user: IAgoraRTCRemoteUser,
      mediaType: 'video' | 'audio'
    ) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'video' && videoPlayerRef.current) {
        user.videoTrack?.play(videoPlayerRef.current);
      }
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
      setRemoteUser(user);
    };

    const handleUserLeft = () => {
      setRemoteUser(null);
      toast.info('El Scout ha finalizado la transmisión.');
    };

    const joinChannel = async () => {
      client.on('user-published', handleUserPublished);
      client.on('user-left', handleUserLeft);
      await client.join(APP_ID, channelName, null, userId);
    };

    joinChannel();

    const supabase = createClient();
    const channel = supabase.channel(`mission-comms-${channelName}`);
    channel.on('broadcast', { event: 'quick_reply' }, ({ payload }) =>
      toast.info(`Respuesta del Scout: ${payload.text}`)
    );
    setSupabaseChannel(channel);
    channel.subscribe();

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-left', handleUserLeft);
      client.leave();
      supabase.removeChannel(channel);
      AgoraRTC.onAutoplayFailed = () => {};
    };
  }, [channelName, userId, isCompleted]);

  const handlePlay = async () => {
    if (remoteUser && videoPlayerRef.current) {
      try {
        await remoteUser.audioTrack?.play();
        await remoteUser.videoTrack?.play(videoPlayerRef.current);
        setShowPlayButton(false);
      } catch (e) {
        toast.error('No se pudo iniciar la reproducción.');
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-black md:flex-row">
      <div className="relative flex flex-grow items-center justify-center bg-gray-900">
        <div
          ref={videoPlayerRef}
          id="remote-video-player"
          className="h-full w-full bg-black"
        ></div>

        {!remoteUser && !showPlayButton && (
          <div className="pointer-events-none absolute p-4 text-center text-white">
            <p className="text-2xl font-semibold">Esperando al Scout...</p>
          </div>
        )}

        {showPlayButton && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <Button size="lg" onClick={handlePlay}>
              <Play className="mr-2 h-5 w-5" /> Iniciar Video
            </Button>
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
