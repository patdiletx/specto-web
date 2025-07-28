// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // @ts-expect-error - El linter de TS a veces infiere incorrectamente el tipo aquí.
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // @ts-expect-error - El linter de TS a veces infiere incorrectamente el tipo aquí.
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Se puede ignorar si el middleware está refrescando las sesiones.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // @ts-expect-error - El linter de TS a veces infiere incorrectamente el tipo aquí.
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Se puede ignorar si el middleware está refrescando las sesiones.
          }
        },
      },
    }
  );
};
