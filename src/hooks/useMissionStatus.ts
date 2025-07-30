// src/hooks/useMissionStatus.ts
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

type Mission = Database['public']['Tables']['missions']['Row'];

export function useMissionStatus(mission: Mission, currentUser: User) {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    mission.status === 'completed'
  );
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Sincronizar estado inicial por si la misión ya estaba completada al cargar
    if (mission.status === 'completed') {
      setIsCompleted(true);
    }

    const channel = supabase
      .channel(`mission-status-${mission.id}`)
      .on<Mission>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'missions',
          filter: `id=eq.${mission.id}`,
        },
        async (payload) => {
          console.log(
            'Hook: Estado de la misión actualizado a',
            payload.new.status
          );

          // Si el nuevo estado es 'completed', activamos nuestra lógica
          if (payload.new.status === 'completed') {
            setIsCompleted(true);

            // Comprobamos si el usuario actual ya ha calificado esta misión
            const { data, error } = await supabase
              .from('ratings')
              .select('id')
              .eq('mission_id', mission.id)
              .eq('rater_id', currentUser.id)
              .maybeSingle();

            if (error) {
              console.error(
                'Hook: Error al comprobar calificación existente:',
                error
              );
            }

            // Si no hay datos (la consulta no devolvió filas), significa que no ha calificado.
            // Por lo tanto, mostramos el modal.
            if (!data) {
              console.log(
                'Hook: El usuario no ha calificado. Mostrando modal.'
              );
              setShowRatingModal(true);
            } else {
              console.log(
                'Hook: El usuario ya ha calificado. No se muestra el modal.'
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mission.id, supabase, currentUser.id]);

  // Devolvemos ambos estados para que los componentes los puedan usar
  return { showRatingModal, setShowRatingModal, isCompleted };
}
