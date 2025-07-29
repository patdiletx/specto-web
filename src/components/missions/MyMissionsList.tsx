// src/components/missions/MyMissionsList.tsx
import { createClient } from '@/lib/supabase/server';
import { RealtimeMissionsList } from './RealtimeMissionsList'; // Ahora sí existe este archivo
import { Database } from '@/types/supabase';

// Exportamos este tipo para que RealtimeMissionsList pueda usarlo
export type MissionWithScout =
  Database['public']['Tables']['missions']['Row'] & {
    scouts: {
      username: string;
      avatar_url: string | null;
    } | null;
  };

// Componente de Servidor
export async function MyMissionsList() {
  const supabase = await createClient(); // Con el await que añadimos antes
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p>No estás autenticado.</p>;
  }

  const { data: missions, error } = await supabase
    .from('missions')
    // ----- CORRECCIÓN DEL JOIN -----
    // Le decimos explícitamente que el join 'scouts' debe usar la clave foránea del scout.
    .select(
      `
      *,
      scouts:profiles!missions_scout_id_fkey ( username, avatar_url )
    `
    )
    .eq('explorer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    // Este log ahora debería mostrar el error real, no uno vacío.
    console.error('Error fetching missions:', error);
    return <p>Error al cargar tus misiones.</p>;
  }

  if (!missions) {
    return <p>No se encontraron misiones.</p>;
  }

  return (
    <RealtimeMissionsList serverMissions={missions as MissionWithScout[]} />
  );
}
