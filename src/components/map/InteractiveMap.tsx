// src/components/map/InteractiveMap.tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

type InteractiveMapProps = {
  onMapClick?: (coords: { lng: number; lat: number }) => void;
};

export default function InteractiveMap({ onMapClick }: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [lng, setLng] = useState(-74.5);
  const [lat, setLat] = useState(40);
  const [zoom, setZoom] = useState(9);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Aquí está la nueva lógica
    map.current.on('click', (e) => {
      const coords = { lng: e.lngLat.lng, lat: e.lngLat.lat };

      // Si hay un marcador, lo movemos. Si no, lo creamos.
      if (marker.current) {
        marker.current.setLngLat(coords);
      } else {
        marker.current = new mapboxgl.Marker()
          .setLngLat(coords)
          .addTo(map.current!);
      }

      // Llamamos a la función callback si existe
      if (onMapClick) {
        onMapClick(coords);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [lng, lat, zoom, onMapClick]);

  return (
    <div
      ref={mapContainer}
      className="h-[400px] w-full cursor-pointer rounded-lg"
    />
  );
}
