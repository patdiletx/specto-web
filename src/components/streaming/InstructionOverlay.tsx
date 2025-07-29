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

type Instruction =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'turn-left'
  | 'turn-right'
  | 'zoom-in'
  | 'zoom-out';

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

const instructionLabels: Record<Instruction, string> = {
  forward: 'Avanzar',
  backward: 'Retroceder',
  left: 'Izquierda',
  right: 'Derecha',
  'turn-left': 'Girar Izquierda',
  'turn-right': 'Girar Derecha',
  'zoom-in': 'Acercar',
  'zoom-out': 'Alejar',
};

type InstructionOverlayProps = {
  channelName: string;
};

export function InstructionOverlay({ channelName }: InstructionOverlayProps) {
  const [currentInstruction, setCurrentInstruction] =
    useState<Instruction | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // --- LA CORRECCIÓN ESTÁ AQUÍ ---
    // Usamos el mismo patrón de nombre de canal que el resto de la aplicación.
    const channel = supabase.channel(`mission-comms-${channelName}`);

    const handleInstruction = (payload: { instruction: Instruction }) => {
      console.log('Instrucción recibida:', payload.instruction);
      setCurrentInstruction(payload.instruction);

      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
      }

      setTimeout(() => {
        setCurrentInstruction(null);
      }, 3000);
    };

    channel.on('broadcast', { event: 'instruction' }, ({ payload }) => {
      handleInstruction(payload);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(
          `Overlay suscrito al canal de instrucciones para la misión: ${channelName}`
        );
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  if (!currentInstruction) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
      <div className="animate-ping-once flex flex-col items-center gap-4 rounded-lg bg-black/70 p-6 text-white">
        {instructionIcons[currentInstruction]}
        <span className="text-xl font-bold">
          {instructionLabels[currentInstruction]}
        </span>
      </div>
    </div>
  );
}
