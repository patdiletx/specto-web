// src/components/streaming/ScoutStreamingView.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAgoraScout } from '@/hooks/useAgoraScout'; // <-- IMPORTAMOS EL NUEVO HOOK

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

export function ScoutStreamingView({
  missionDetails,
  currentUser,
  mission,
}: ScoutStreamingViewProps) {
  const { channelName, userId, missionId } = missionDetails;

  // Usamos el hook de Agora para toda la lógica de streaming
  const { join, leave, isJoined, isJoining } = useAgoraScout();

  const [showChat, setShowChat] = useState(false);
  const [supabaseChannel, setSupabaseChannel] =
    useState<RealtimeChannel | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  const { isCompleted } = useMissionStatus(mission, currentUser);

  // Efecto para gestionar el canal de Supabase
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`mission-comms-${channelName}`);
    channel.subscribe();
    setSupabaseChannel(channel);
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  // Efecto que reacciona a la finalización de la misión
  useEffect(() => {
    if (isCompleted) {
      // Si la misión se completa, abandonamos el canal de Agora
      leave().then(() => {
        router.push('/dashboard');
      });
    }
  }, [isCompleted, leave, router]);

  const handleJoin = () => {
    join({ channelName, userId });
  };

  const handleCompleteMission = async () => {
    setIsCompleting(true);
    const supabase = createClient(); // Instancia fresca
    const { error } = await supabase
      .from('missions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', missionId);

    if (error) {
      console.error('Error al actualizar la misión en Supabase:', error);
      toast.error('Error al completar la misión', {
        description: error.message,
      });
      setIsCompleting(false);
    }
    // Si tiene éxito, el hook 'useMissionStatus' se encargará del resto.
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
          <Button onClick={handleJoin} disabled={isJoining} size="lg">
            {isJoining ? 'Iniciando...' : 'Iniciar Transmisión'}
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
