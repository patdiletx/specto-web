// src/app/dashboard/profile/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Vamos a usar Alertas

// Puede que necesites instalar el componente 'alert'
// npx shadcn@latest add alert

export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Esto es correcto, redirect() interrumpe la ejecución.
    redirect('/auth/login');
  }

  // Obtenemos el perfil del usuario desde nuestra tabla 'profiles'
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Si hay un error o el perfil no se encuentra, mostramos un estado de error.
  if (error || !profile) {
    console.error('Error fetching profile:', error?.message);

    // ESTA ES LA CORRECCIÓN: Devolvemos un componente de React válido.
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configuración del Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona la configuración de tu cuenta y establece tu rol.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Error al cargar el perfil</AlertTitle>
          <AlertDescription>
            No pudimos recuperar tus datos. Esto puede ocurrir si es la primera
            vez que inicias sesión y el perfil aún se está creando. Por favor,
            recarga la página en unos segundos o contacta con soporte.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Si todo va bien, devolvemos el formulario con los datos.
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración del Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona la configuración de tu cuenta y establece tu rol.
        </p>
      </div>
      <div className="rounded-lg border p-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
