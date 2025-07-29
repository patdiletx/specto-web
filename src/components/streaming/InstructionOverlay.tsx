// src/components/streaming/InstructionOverlay.tsx
'use client';

import { useState, useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

// Definimos un tipo para nuestras instrucciones para mantenerlo consistente
type Instruction =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'turn-left'
  | 'turn-right'
  | 'zoom-in'
  | 'zoom-out';

// Mapeamos cada instrucción a su icono correspondiente de lucide-react
const instructionIcons: Record<Instruction, React.ReactNode> = {
  forward: <ArrowUp size={64} />,
  backward: <ArrowDown size={64} />,
  left: <ArrowLeft size={64} />,
  right: <ArrowRight size={64} />,
  'turn-left': <RotateCcw size={64} />,
  'turn-right': <RotateCw size={64} />,
  'zoom-in': <ZoomIn size={64} />,
  'zoom-out': <ZoomOut size={64} />,
};

type InstructionOverlayProps = {
  channelName: string; // Recibimos el nombre del canal en lugar del objeto completo
};

export function InstructionOverlay({ channelName }: InstructionOverlayProps) {
  const [currentInstruction, setCurrentInstruction] =
    useState<Instruction | null>(null);

  // El useEffect ahora gestiona su propia conexión al canal de Supabase
  useEffect(() => {
    const supabase = createClient();
    // Creamos un nombre de canal único para este componente para evitar colisiones
    const channel = supabase.channel(`instructions-for-${channelName}`);

    const handleInstruction = (payload: { instruction: Instruction }) => {
      console.log('Instrucción recibida:', payload.instruction);
      setCurrentInstruction(payload.instruction);

      // Ocultar la instrucción después de 3 segundos
      setTimeout(() => {
        setCurrentInstruction(null);
      }, 3000);
    };

    // Nos suscribimos al evento 'instruction' que envía el Explorer
    channel.on('broadcast', { event: 'instruction' }, ({ payload }) => {
      handleInstruction(payload);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // --- LA CORRECCIÓN ESTÁ AQUÍ ---
        // Usamos el `channelName` que ya tenemos, en lugar de `channel.name`
        console.log(
          `Overlay suscrito al canal de instrucciones para la misión: ${channelName}`
        );
      }
    });

    // --- LA SOLUCIÓN AL ERROR ---
    // La función de limpieza se encarga de remover el canal completo, lo cual es la práctica moderna y correcta.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]); // La dependencia es el nombre del canal, así que esto se ejecuta solo una vez por misión.

  // Si no hay ninguna instrucción activa, no renderizamos nada
  if (!currentInstruction) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
      {/* 
        La animación 'animate-ping-once' requiere la configuración en tailwind.config.ts
        que ya te he proporcionado.
      */}
      <div className="animate-ping-once rounded-full bg-black/60 p-6 text-white">
        {instructionIcons[currentInstruction]}
      </div>
    </div>
  );
}
