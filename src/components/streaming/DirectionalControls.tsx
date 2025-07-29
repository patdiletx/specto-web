// src/components/streaming/DirectionalControls.tsx
'use client';

import { Button } from '@/components/ui/button';
import { RealtimeChannel } from '@supabase/supabase-js';
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
import { toast } from 'sonner';

type DirectionalControlsProps = {
  channel: RealtimeChannel | null;
};

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

export function DirectionalControls({ channel }: DirectionalControlsProps) {
  const sendInstruction = (instruction: Instruction) => {
    if (!channel) {
      toast.error('No se ha establecido el canal de comunicación.');
      return;
    }
    console.log(`Enviando instrucción: ${instruction}`);
    channel.send({
      type: 'broadcast',
      event: 'instruction',
      payload: { instruction },
    });
  };

  return (
    <div className="rounded-lg bg-gray-800/50 p-4 backdrop-blur-sm">
      <p className="mb-4 text-center font-semibold text-white">
        Controles del Scout
      </p>
      <div className="grid grid-cols-3 justify-items-center gap-2">
        <div></div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => sendInstruction('forward')}
        >
          <ArrowUp />
        </Button>
        <div></div>

        <Button
          size="icon"
          variant="outline"
          onClick={() => sendInstruction('turn-left')}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <div className="flex items-center text-xs text-white">DIRECCIÓN</div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => sendInstruction('turn-right')}
        >
          <RotateCw className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          variant="outline"
          onClick={() => sendInstruction('left')}
        >
          <ArrowLeft />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => sendInstruction('backward')}
        >
          <ArrowDown />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => sendInstruction('right')}
        >
          <ArrowRight />
        </Button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => sendInstruction('zoom-in')}>
          <ZoomIn className="mr-2 h-4 w-4" /> Acercar
        </Button>
        <Button variant="outline" onClick={() => sendInstruction('zoom-out')}>
          <ZoomOut className="mr-2 h-4 w-4" /> Alejar
        </Button>
      </div>
    </div>
  );
}
