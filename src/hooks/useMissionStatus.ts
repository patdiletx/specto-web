// src/hooks/useMissionStatus.ts
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

type Mission = Database['public']['Tables']['missions']['Row'];

export function useMissionStatus(mission: Mission, currentUser: User) {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    mission.status === 'completed'
  );
  const supabase = createClient();

  useEffect(() => {
    // Sincronizar el estado inicial una vez, en caso de que la misión ya esté completada al cargar.
    if (mission.status === 'completed') {
      setIsCompleted(true);
    }

    // Crear el canal de Supabase para esta misión específica.
    const channel = supabase.channel(`mission-status-${mission.id}`);

    // Definir la función que manejará los eventos de actualización.
    const handleUpdate = async (payload: { new: Mission }) => {
      console.log(
        `[useMissionStatus] Evento UPDATE recibido. Nuevo estado: ${payload.new.status}`
      );

      if (payload.new.status === 'completed') {
        console.log(
          "[useMissionStatus] El estado es 'completed'. Actualizando estado y comprobando calificación."
        );
        setIsCompleted(true);

        // Comprobar si el usuario ya ha calificado para evitar mostrar el modal de nuevo.
        const { data, error } = await supabase
          .from('ratings')
          .select('id')
          .eq('mission_id', mission.id)
          .eq('rater_id', currentUser.id)
          .maybeSingle();

        if (error) {
          console.error(
            '[useMissionStatus] Error al comprobar calificación existente:',
            error
          );
        }

        if (!data) {
          console.log(
            '[useMissionStatus] El usuario no ha calificado. Se mostrará el modal.'
          );
          setShowRatingModal(true);
        }
      }
    };

    // Suscribirse a los cambios de UPDATE en la tabla 'missions' para esta misión.
    channel
      .on<Mission>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'missions',
          filter: `id=eq.${mission.id}`,
        },
        handleUpdate
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(
            `[useMissionStatus] Error al suscribirse al canal para la misión ${mission.id}:`,
            err
          );
        }
      });

    // La función de limpieza se encarga de remover el canal cuando el componente se desmonta.
    return () => {
      supabase.removeChannel(channel);
    };

    // --- LA CORRECCIÓN CLAVE ESTÁ AQUÍ ---
    // Las dependencias son estables y solo dependen del ID de la misión y del usuario.
    // Quitar `mission.status` previene que el efecto se vuelva a ejecutar innecesariamente,
    // lo que causaba el error de "mismatch".
  }, [mission.id, supabase, currentUser.id]);

  return { showRatingModal, setShowRatingModal, isCompleted };
}
