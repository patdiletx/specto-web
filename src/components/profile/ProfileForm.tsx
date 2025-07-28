// src/components/profile/ProfileForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner'; // <-- ¡Cambio importante aquí!
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

const profileFormSchema = z.object({
  username: z
    .string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres.')
    .max(20, 'El nombre de usuario no puede tener más de 20 caracteres.'),
  full_name: z
    .string()
    .max(50, 'El nombre no puede tener más de 50 caracteres.')
    .optional(),
  // Simplemente definimos el enum aquí
  role: z.enum(['explorer', 'scout']),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm({ profile }: { profile: Profile }) {
  const supabase = createClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: profile.username || '',
      full_name: profile.full_name || '',
      role: profile.role || 'explorer',
    },
    mode: 'onChange',
  });

  async function onSubmit(data: ProfileFormValues) {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: data.username,
        full_name: data.full_name,
        role: data.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) {
      // Usamos el nuevo 'toast' de sonner
      toast.error('¡Oh no! Algo salió mal.', {
        description: error.message,
      });
    } else {
      // Usamos el nuevo 'toast' de sonner
      toast.success('¡Perfil actualizado!', {
        description: 'Tus datos han sido guardados correctamente.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de usuario</FormLabel>
              <FormControl>
                <Input placeholder="tu_usuario" {...field} />
              </FormControl>
              <FormDescription>
                Este es tu nombre público en Specto.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input placeholder="Tu nombre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>¿Cuál es tu rol principal?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-y-0 space-x-3">
                    <FormControl>
                      <RadioGroupItem value="explorer" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      🌎 Explorer (Quiero ver un lugar)
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-y-0 space-x-3">
                    <FormControl>
                      <RadioGroupItem value="scout" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      🏃 Scout (Quiero transmitir desde un lugar)
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Actualizar perfil</Button>
      </form>
    </Form>
  );
}
