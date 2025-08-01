// src/components/streaming/DirectionalControls.tsx
'use client';

import { useState } from 'react';
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

// Definimos un tipo para nuestras instrucciones para mantenerlo consistente en toda la app
type Instruction =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'turn-left'
  | 'turn-right'
  | 'zoom-in'
  | 'zoom-out';

type DirectionalControlsProps = {
  channel: RealtimeChannel | null;
};

export function DirectionalControls({ channel }: DirectionalControlsProps) {
  // Estado para gestionar si los botones están en período de enfriamiento (cooldown)
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  const sendInstruction = (instruction: Instruction) => {
    if (!channel) {
      toast.error('No se ha establecido el canal de comunicación.');
      return;
    }
    // Si estamos en cooldown, mostramos un aviso y no hacemos nada más.
    if (isCoolingDown) {
      toast.info('Espera un momento para enviar otra instrucción.');
      return;
    }

    console.log(`Enviando instrucción: ${instruction}`);
    channel.send({
      type: 'broadcast',
      event: 'instruction', // El evento que el Scout escuchará
      payload: { instruction },
    });

    // Activamos el cooldown para prevenir spam
    setIsCoolingDown(true);

    // Después de 2 segundos, desactivamos el cooldown
    setTimeout(() => {
      setIsCoolingDown(false);
    }, 2000); // Cooldown de 2 segundos
  };

  /**
   * Helper para renderizar un botón de control.
   * Aplica el estado 'disabled' y un estilo de opacidad durante el cooldown.
   * @param instruction El tipo de instrucción a enviar.
   * @param icon El icono a mostrar en el botón.
   * @param isIconOnly Si el botón solo debe mostrar un icono (para el tamaño).
   */
  const renderControlButton = (
    instruction: Instruction,
    icon: React.ReactNode,
    isIconOnly: boolean = true
  ) => (
    <Button
      size={isIconOnly ? 'icon' : 'default'}
      variant="outline"
      onClick={() => sendInstruction(instruction)}
      disabled={isCoolingDown}
      className="transition-opacity disabled:opacity-50"
    >
      {icon}
    </Button>
  );

  return (
    <div className="rounded-lg bg-gray-800/50 p-4 backdrop-blur-sm">
      <p className="mb-4 text-center font-semibold text-black">
        Controles del Scout
      </p>

      {/* Controles de movimiento y rotación */}
      <div className="grid grid-cols-3 items-center justify-items-center gap-2">
        {renderControlButton(
          'turn-left',
          <RotateCcw className="h-5 w-5 text-black" />
        )}
        {renderControlButton('forward', <ArrowUp className="text-black" />)}
        {renderControlButton(
          'turn-right',
          <RotateCw className="h-5 w-5 text-black" />
        )}

        {renderControlButton('left', <ArrowLeft className="text-black" />)}
        {renderControlButton('backward', <ArrowDown className="text-black" />)}
        {renderControlButton('right', <ArrowRight className="text-black" />)}
      </div>

      {/* Controles de Zoom */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {renderControlButton(
          'zoom-in',
          <>
            <ZoomIn className="mr-2 h-4 w-4 text-black" /> Acercar
          </>,
          false
        )}
        {renderControlButton(
          'zoom-out',
          <>
            <ZoomOut className="mr-2 h-4 w-4 text-black" /> Alejar
          </>,
          false
        )}
      </div>
    </div>
  );
}
