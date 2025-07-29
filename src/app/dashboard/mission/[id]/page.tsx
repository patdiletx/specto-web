// src/app/dashboard/mission/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ScoutStreamingView } from '@/components/streaming/ScoutStreamingView';
import { ExplorerStreamingView } from '@/components/streaming/ExplorerStreamingView';

type MissionDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function MissionDetailPage({
  params,
}: MissionDetailPageProps) {
  const supabase = await createClient();

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

  const isExplorer = user.id === mission.explorer_id;
  const isScout = user.id === mission.scout_id;

  if (!isExplorer && !isScout) {
    redirect('/dashboard?error=unauthorized');
  }

  const channelName =
    mission.agora_channel_name || `specto-mission-${mission.id}`;

  if (!mission.agora_channel_name) {
    await supabase
      .from('missions')
      .update({ agora_channel_name: channelName })
      .eq('id', mission.id);
  }

  const missionDetails = {
    channelName: channelName,
    userId: user.id,
    missionId: mission.id,
  };

  return (
    <div className="-m-4 h-[calc(100vh-4rem)] w-full bg-black md:-m-8">
      {isScout ? (
        <ScoutStreamingView
          missionDetails={missionDetails}
          currentUser={user}
        />
      ) : (
        <ExplorerStreamingView
          missionDetails={missionDetails}
          currentUser={user}
        />
      )}
    </div>
  );
}
