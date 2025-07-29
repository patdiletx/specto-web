// src/components/missions/RatingModal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

type RatingModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  missionId: number;
  currentUser: User;
  otherParticipantId: string;
};

export function RatingModal({
  isOpen,
  onOpenChange,
  missionId,
  currentUser,
  otherParticipantId,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Por favor, selecciona al menos una estrella.');
      return;
    }
    setIsSubmitting(true);

    const { error } = await supabase.from('ratings').insert({
      mission_id: missionId,
      rater_id: currentUser.id,
      ratee_id: otherParticipantId,
      score: rating,
      comment: comment,
    });

    if (error) {
      toast.error('Error al enviar la calificación', {
        description: error.message,
      });
    } else {
      toast.success('¡Gracias por tu calificación!');
      onOpenChange(false); // Cierra el modal
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Califica tu experiencia</DialogTitle>
          <DialogDescription>
            Tu feedback ayuda a la comunidad de Specto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rating" className="text-right">
              Calificación
            </Label>
            <div className="col-span-3 flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'h-8 w-8 cursor-pointer',
                    (hoverRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-400'
                  )}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comment" className="text-right">
              Comentario
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="col-span-3"
              placeholder="(Opcional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Calificación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
