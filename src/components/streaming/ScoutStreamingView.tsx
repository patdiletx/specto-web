// src/components/streaming/ScoutStreamingView.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
} from 'agora-rtc-sdk-ng';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { InstructionOverlay } from './InstructionOverlay';
import { ScoutQuickReplies } from './ScoutQuickReplies';
import { MessageSquare, Navigation } from 'lucide-react';
import { ChatBox } from './ChatBox';
import { User, RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import { useMissionStatus } from '@/hooks/useMissionStatus';
import InteractiveMap from '../map/InteractiveMap';

type Mission = Database['public']['Tables']['missions']['Row'];

type ScoutStreamingViewProps = {
  missionDetails: {
    channelName: string;
    userId: string;
    missionId: number;
  };
  currentUser: User;
  mission: Mission;
};

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// Se define un tipo para el objeto de ubicación para resolver el error de 'any'
type PointLocation = {
  type: 'Point';
  coordinates: [number, number];
};

// --- ESTA ES LA FUNCIÓN CORREGIDA ---
function parseLocation(
  location: PointLocation | string | unknown
): { lng: number; lat: number } | null {
  const loc = location as PointLocation;
  if (
    loc &&
    typeof loc === 'object' &&
    loc.type === 'Point' &&
    Array.isArray(loc.coordinates) &&
    loc.coordinates.length === 2
  ) {
    return { lng: loc.coordinates[0], lat: loc.coordinates[1] };
  }

  if (typeof location === 'string' && location.includes('POINT')) {
    const match = location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match && match.length >= 3) {
      return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }
  }
  return null;
}

export function ScoutStreamingView({
  missionDetails,
  currentUser,
  mission,
}: ScoutStreamingViewProps) {
  const { channelName, userId, missionId } = missionDetails;
  const router = useRouter();

  const [mode, setMode] = useState<'navigation' | 'streaming'>('navigation');
  const [isJoined, setIsJoined] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [scoutLocation, setScoutLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [route, setRoute] = useState<any>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);
  const supabaseChannel = useRef<RealtimeChannel | null>(null);
  const videoPlayerRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => createClient(), []);
  const { isCompleted } = useMissionStatus(mission, currentUser);
  const missionLocation = useMemo(
    () => parseLocation(mission.location),
    [mission.location]
  );

  useEffect(() => {
    clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    supabaseChannel.current = supabase.channel(`mission-comms-${channelName}`);
    supabaseChannel.current.subscribe();

    return () => {
      supabase.removeChannel(supabaseChannel.current!);
      localAudioTrackRef.current?.close();
      localVideoTrackRef.current?.close();
      if (clientRef.current?.connectionState === 'CONNECTED') {
        clientRef.current.leave();
      }
    };
  }, [channelName, supabase]);

  useEffect(() => {
    if (mode !== 'navigation' || !missionLocation) return;

    const fetchRoute = async (start: { lat: number; lng: number }) => {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${missionLocation.lng},${missionLocation.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes) {
          setRoute(data.routes[0].geometry);
        }
      } catch (error) {
        console.error('Error fetching Mapbox route:', error);
        toast.error('No se pudo calcular la ruta.');
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setScoutLocation(newLocation);

        if (supabaseChannel.current) {
          supabaseChannel.current.send({
            type: 'broadcast',
            event: 'scout_location_update',
            payload: { lat: newLocation.lat, lng: newLocation.lng },
          });
        }

        if (!scoutLocation) {
          fetchRoute(newLocation);
        }
      },
      (error) => {
        console.error('Error de geolocalización:', error);
        toast.error('No se pudo obtener tu ubicación.');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [mode, missionLocation, scoutLocation]);

  useEffect(() => {
    if (isCompleted) {
      router.push('/dashboard');
    }
  }, [isCompleted, router]);

  useEffect(() => {
    if (
      mode === 'streaming' &&
      isJoined &&
      localVideoTrackRef.current &&
      videoPlayerRef.current
    ) {
      localVideoTrackRef.current.play(videoPlayerRef.current);
    }
  }, [mode, isJoined]);

  const handleJoin = async () => {
    const client = clientRef.current;
    if (!client || isJoined) return;

    try {
      await client.join(APP_ID, channelName, null, userId);

      const [audioTrack, videoTrack] =
        await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;

      await client.publish([audioTrack, videoTrack]);

      await supabase
        .from('missions')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', missionId);

      setIsJoined(true);
      toast.success('¡Transmisión iniciada!');
    } catch (error: unknown) {
      let errorMessage =
        'Ocurrió un error. Revisa los permisos de cámara/micrófono.';
      if (error instanceof Error) errorMessage = error.message;
      toast.error('Error al iniciar transmisión', {
        description: errorMessage,
      });
      setMode('navigation');
    }
  };

  const handleArrivedAndStartStream = () => {
    setMode('streaming');
    setTimeout(() => {
      handleJoin();
    }, 100);
  };

  const handleCompleteMission = async () => {
    setIsCompleting(true);
    const { error } = await supabase
      .from('missions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', missionId);

    if (error) {
      toast.error('Error al completar la misión', {
        description: error.message,
      });
      setIsCompleting(false);
    } else {
      toast.success('Misión completada. Redirigiendo al dashboard...');
      router.push('/dashboard');
    }
  };

  if (!missionLocation) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-white">
        Error: La ubicación de la misión no es válida.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-gray-900">
      {mode === 'navigation' ? (
        <InteractiveMap
          center={scoutLocation || missionLocation}
          scoutLocation={scoutLocation || undefined}
          markerLocation={missionLocation}
          route={route}
          zoom={15}
          isInteractive={true}
        />
      ) : (
        <>
          <div
            ref={videoPlayerRef}
            id="local-video-player"
            className="h-full w-full bg-black"
          ></div>
          <InstructionOverlay channelName={channelName} />
        </>
      )}

      {isJoined && mode === 'streaming' && (
        <ScoutQuickReplies channel={supabaseChannel.current} />
      )}

      {showChat && (
        <div className="absolute top-4 right-4 bottom-24 z-20 w-80 rounded-lg bg-black/70 backdrop-blur-md">
          <ChatBox missionId={missionId} currentUser={currentUser} />
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 transform gap-4">
        {mode === 'navigation' && (
          <Button onClick={handleArrivedAndStartStream} size="lg">
            <Navigation className="mr-2 h-4 w-4" />
            He llegado, iniciar Stream
          </Button>
        )}

        {mode === 'streaming' && isJoined && (
          <>
            <Button
              onClick={() => setShowChat(!showChat)}
              variant="outline"
              size="icon"
            >
              <MessageSquare />
            </Button>
            <Button
              onClick={handleCompleteMission}
              variant="destructive"
              size="lg"
              disabled={isCompleting}
            >
              {isCompleting ? 'Finalizando...' : 'Completar Misión'}
            </Button>
          </>
        )}
      </div>

      {!scoutLocation && mode === 'navigation' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <p className="text-xl">Obteniendo tu ubicación...</p>
            <p className="text-sm">Por favor, acepta los permisos.</p>
          </div>
        </div>
      )}

      {mode === 'streaming' && !isJoined && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <p className="text-xl">Iniciando transmisión...</p>
          </div>
        </div>
      )}
    </div>
  );
}
