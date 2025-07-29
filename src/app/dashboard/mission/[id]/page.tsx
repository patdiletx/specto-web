// src/app/dashboard/mission/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ScoutStreamingView } from '@/components/streaming/ScoutStreamingView';
// import { ExplorerStreamingView } from "@/components/streaming/ExplorerStreamingView"; // Lo usaremos más tarde

type MissionDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function MissionDetailPage({
  params,
}: MissionDetailPageProps) {
  const supabase = await createClient(); // No olvides el await

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  const { data: mission, error } = await supabase
    .from('missions')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !mission) {
    notFound();
  }

  // Lógica para determinar el rol del usuario en ESTA misión
  const isExplorer = user.id === mission.explorer_id;
  const isScout = user.id === mission.scout_id;

  if (!isExplorer && !isScout) {
    redirect('/dashboard?error=unauthorized');
  }

  // Generamos un nombre de canal único para la misión si no existe
  // En un sistema real, esto debería hacerse al aceptar la misión.
  const channelName =
    mission.agora_channel_name || `specto-mission-${mission.id}`;

  // Vamos a actualizar la misión con este nombre de canal si no lo tenía.
  // Esto asegura que ambos usuarios usen el mismo nombre de canal.
  if (!mission.agora_channel_name) {
    const { error: updateError } = await supabase
      .from('missions')
      .update({ agora_channel_name: channelName })
      .eq('id', mission.id);

    if (updateError) {
      console.error('Error updating channel name:', updateError);
      // No bloqueamos, pero lo registramos.
    }
  }

  const missionDetails = {
    channelName: channelName,
    userId: user.id,
  };

  return (
    // Quitamos los márgenes y paddings del layout del dashboard para una experiencia inmersiva
    <div className="-m-4 h-[calc(100vh-4rem)] w-full bg-black md:-m-8">
      {isScout ? (
        <ScoutStreamingView missionDetails={missionDetails} />
      ) : (
        <div className="p-8 text-white">Vista del Explorer (Próximamente)</div>
      )}
    </div>
  );
}
