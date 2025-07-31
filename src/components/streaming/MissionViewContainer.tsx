// src/components/streaming/MissionViewContainer.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { ScoutStreamingView } from './ScoutStreamingView';
import { ExplorerStreamingView } from './ExplorerStreamingView';
import { RatingModal } from '../missions/RatingModal';
import { useMissionStatus } from '@/hooks/useMissionStatus';

type Mission = Database['public']['Tables']['missions']['Row'];

// Definimos un nuevo componente interno aquí mismo.
function MissionContent({
  mission,
  currentUser,
}: {
  mission: Mission;
  currentUser: User;
}) {
  // Ahora, useMissionStatus solo se llama cuando 'mission' y 'currentUser' existen.
  const { showRatingModal, setShowRatingModal, isCompleted } = useMissionStatus(
    mission,
    currentUser
  );

  const isScout = currentUser.id === mission.scout_id;
  const otherParticipantId = isScout ? mission.explorer_id : mission.scout_id;

  const missionDetails = {
    channelName: mission.agora_channel_name || `specto-mission-${mission.id}`,
    userId: currentUser.id,
    missionId: mission.id,
  };

  return (
    <>
      {isScout ? (
        <ScoutStreamingView
          missionDetails={missionDetails}
          currentUser={currentUser}
          mission={mission}
        />
      ) : (
        <ExplorerStreamingView
          missionDetails={missionDetails}
          currentUser={currentUser}
          mission={mission}
          isCompleted={isCompleted}
        />
      )}
      {otherParticipantId && (
        <RatingModal
          isOpen={showRatingModal}
          onOpenChange={setShowRatingModal}
          missionId={mission.id}
          currentUser={currentUser}
          otherParticipantId={otherParticipantId}
        />
      )}
    </>
  );
}

export default function MissionViewContainer() {
  const params = useParams();
  const router = useRouter();
  const missionIdParam = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // La lógica de fetchData se mantiene igual
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setCurrentUser(user);
      const { data: missionData, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionIdParam)
        .single();

      console.log('Fetched mission data:', missionData); // DEBUGGING

      if (error || !missionData) {
        router.push('/dashboard?error=not_found');
        return;
      }
      const isAuthorized =
        user.id === missionData.explorer_id || user.id === missionData.scout_id;
      if (!isAuthorized) {
        router.push('/dashboard?error=unauthorized');
        return;
      }
      setMission(missionData);
      setIsLoading(false);
    };
    if (missionIdParam) {
      fetchData();
    }
  }, [missionIdParam, supabase, router]);

  // --- LA SOLUCIÓN ESTÁ AQUÍ ---
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-white">
        Cargando Datos de la Misión...
      </div>
    );
  }

  // Renderizamos el contenido solo cuando los datos están listos,
  // pasando los datos al componente interno que SÍ usa el hook.
  if (mission && currentUser) {
    return <MissionContent mission={mission} currentUser={currentUser} />;
  }

  return (
    <div className="flex h-full items-center justify-center text-white">
      No se pudo cargar la misión.
    </div>
  );
}
