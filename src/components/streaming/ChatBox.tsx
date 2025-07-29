// src/components/streaming/ChatBox.tsx
'use client';

import { useEffect, useState, useRef, ElementRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Database } from '@/types/supabase';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type ChatBoxProps = {
  missionId: number;
  currentUser: User;
};

export function ChatBox({ missionId, currentUser }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewportRef = useRef<ElementRef<typeof ScrollArea>>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    const viewport = scrollViewportRef.current?.children[1] as HTMLDivElement;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at', { ascending: true });

      if (error) {
        toast.error('Error al cargar los mensajes', {
          description: error.message,
        });
      } else {
        setMessages(data || []);
      }
    };
    fetchMessages();
  }, [missionId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-mission-${missionId}`)
      .on<ChatMessage>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `mission_id=eq.${missionId}`,
        },
        (payload) => {
          setMessages((currentMessages) => [...currentMessages, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [missionId, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const { error } = await supabase.from('chat_messages').insert({
      mission_id: missionId,
      profile_id: currentUser.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast.error('Error al enviar el mensaje', { description: error.message });
    } else {
      setNewMessage('');
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg bg-gray-900/50">
      <p className="border-b border-gray-700 p-2 text-center font-semibold text-white">
        Chat de la Misión
      </p>
      <ScrollArea className="flex-grow p-4" ref={scrollViewportRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.profile_id === currentUser.id ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-xs rounded-lg px-3 py-2 ${
                  msg.profile_id === currentUser.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-gray-700 p-4"
      >
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="border-gray-600 bg-gray-800 text-white"
        />
        <Button type="submit">Enviar</Button>
      </form>
    </div>
  );
}
