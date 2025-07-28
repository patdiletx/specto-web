// src/app/page.tsx
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-6xl">
          Bienvenido a {process.env.NEXT_PUBLIC_APP_NAME}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg leading-8">
          Conectando Exploradores y Scouts en tiempo real.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button size="lg">Comenzar</Button>
        </div>
      </div>
    </main>
  );
}
