// src/components/streaming/ScoutQuickReplies.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

type ScoutQuickRepliesProps = {
  channel: RealtimeChannel | null;
};

const replies = ['OK', 'Entendido', 'Un momento', 'No puedo', '¿Aquí?'];

export function ScoutQuickReplies({ channel }: ScoutQuickRepliesProps) {
  const [isSending, setIsSending] = useState(false);

  const sendQuickReply = (reply: string) => {
    if (!channel) return;
    if (isSending) return;

    setIsSending(true);

    // Usaremos el mismo evento 'instruction' pero con un tipo de payload diferente
    // O mejor, un nuevo evento para no mezclar lógicas.
    channel.send({
      type: 'broadcast',
      event: 'quick_reply', // Nuevo evento
      payload: { text: reply },
    });

    toast.success(`Respuesta rápida enviada: "${reply}"`);

    setTimeout(() => setIsSending(false), 2000); // Cooldown
  };

  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="flex flex-col gap-2">
        {replies.map((reply) => (
          <Button
            key={reply}
            variant="secondary"
            size="sm"
            onClick={() => sendQuickReply(reply)}
            disabled={isSending}
          >
            {reply}
          </Button>
        ))}
      </div>
    </div>
  );
}
