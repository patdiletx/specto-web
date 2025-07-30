// src/app/dashboard/create-mission/page.tsx
'use client';

import { useForm, SubmitHandler } from 'react-hook-form'; // Importar SubmitHandler
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import InteractiveMap from '@/components/map/InteractiveMap';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';

// =================================================================
// SOLUCIÓN DEFINITIVA - PARTE 1: SCHEMAS Y TIPOS EXPLÍCITOS
// =================================================================

// Este schema representa los DATOS CRUDOS del formulario.
// Aquí, la duración es un STRING, porque eso es lo que da un <input>.
const FormValuesSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres.'),
  description: z.string().max(500).optional(),
  location: z
    .object({
      lng: z.number(),
      lat: z.number(),
    })
    .refine((val) => val.lat !== 0 && val.lng !== 0, {
      message: 'Debes seleccionar una ubicación en el mapa.',
    }),
  requested_duration_minutes: z
    .string()
    .min(1, 'Debes especificar una duración.'),
});

// Este es el tipo para nuestros campos de formulario.
type FormValues = z.infer<typeof FormValuesSchema>;

// Este es el tipo de los datos DESPUÉS de una transformación manual.
// Aquí, la duración es un NÚMERO.
type ProcessedMissionData = Omit<FormValues, 'requested_duration_minutes'> & {
  requested_duration_minutes: number;
};

export default function CreateMissionPage() {
  const router = useRouter();
  const supabase = createClient();

  // =================================================================
  // SOLUCIÓN DEFINITIVA - PARTE 2: useForm
  // =================================================================

  const form = useForm<FormValues>({
    // El resolver valida los datos CRUDOS (string para la duración)
    resolver: zodResolver(FormValuesSchema),
    defaultValues: {
      title: '',
      description: '',
      location: { lat: 0, lng: 0 },
      requested_duration_minutes: '15', // El valor por defecto es un STRING
    },
  });

  // =================================================================
  // SOLUCIÓN DEFINITIVA - PARTE 3: onSubmit
  // =================================================================

  // Usamos SubmitHandler para tipar correctamente la función.
  const onSubmit: SubmitHandler<FormValues> = async (formData) => {
    // Transformación y validación manual de la duración.
    const duration = parseInt(formData.requested_duration_minutes, 10);
    if (isNaN(duration)) {
      toast.error('La duración debe ser un número válido.');
      return;
    }
    if (duration < 5) {
      toast.error('La duración mínima es de 5 minutos.');
      return;
    }
    if (duration > 120) {
      toast.error('La duración máxima es de 120 minutos.');
      return;
    }

    // Creamos el objeto de datos final y procesado.
    const processedData: ProcessedMissionData = {
      ...formData,
      requested_duration_minutes: duration,
    };

    // El resto de la lógica usa los datos procesados.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Debes estar logueado para crear una misión.');
      return router.push('/auth/login');
    }

    const { error } = await supabase.from('missions').insert({
      title: processedData.title,
      description: processedData.description,
      location: `POINT(${processedData.location.lng} ${processedData.location.lat})`,
      location_name: 'Ubicación seleccionada en mapa',
      requested_duration_minutes: processedData.requested_duration_minutes,
      price_cents: processedData.requested_duration_minutes * 100,
      explorer_id: user.id,
    });

    if (error) {
      toast.error('Error al crear la misión', { description: error.message });
    } else {
      toast.success('¡Misión creada con éxito!');
      router.push('/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Crear Nueva Misión</h1>
        <p className="text-muted-foreground mt-2">
          Selecciona un punto en el mapa y completa los detalles.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-8 md:grid-cols-2"
        >
          {/* El resto del JSX no necesita cambios */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título de la Misión</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Ver la puesta de sol en la playa"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instrucciones adicionales para el Scout"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requested_duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración (minutos)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormLabel>Ubicación en el Mapa</FormLabel>
            <div className="rounded-lg border p-1">
              <InteractiveMap
                center={{ lat: 40.416775, lng: -3.70379 }}
                zoom={10}
                onMapClick={(coords) =>
                  form.setValue('location', coords, { shouldValidate: true })
                }
              />
            </div>
            {form.watch('location.lat') !== 0 && (
              <p className="text-muted-foreground text-center text-sm">
                Ubicación seleccionada: {form.watch('location.lat').toFixed(4)},{' '}
                {form.watch('location.lng').toFixed(4)}
              </p>
            )}
          </div>

          <div className="text-right md:col-span-2">
            <Button
              type="submit"
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Creando...' : 'Crear Misión'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
