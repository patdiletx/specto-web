// src/components/map/InteractiveMap.tsx
'use client';

import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

type MapCoordinates = {
  lng: number;
  lat: number;
};

type InteractiveMapProps = {
  center: MapCoordinates;
  markerLocation?: MapCoordinates;
  zoom?: number;
  onMapClick?: (coords: MapCoordinates) => void;
  // If a map is for display only, it should not be interactive.
  isInteractive?: boolean;
  route?: any; // GeoJSON object for the route
  scoutLocation?: { lat: number; lng: number }; // Real-time scout location
};

export default function InteractiveMap({
  center,
  markerLocation,
  zoom = 14,
  onMapClick,
  // Default to non-interactive if showing a fixed marker, otherwise interactive.
  isInteractive = !markerLocation,
  route,
  scoutLocation,
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const scoutMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: zoom,
      interactive: isInteractive,
    });

    if (isInteractive) {
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    // Add click listener for interactive mode
    if (onMapClick) {
      map.current.on('click', (e) => {
        const coords = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        if (destinationMarkerRef.current) {
          destinationMarkerRef.current.setLngLat(coords);
        } else {
          destinationMarkerRef.current = new mapboxgl.Marker({
            color: '#f43f5e',
          })
            .setLngLat(coords)
            .addTo(map.current!);
        }
        onMapClick(coords);
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // We want to re-run this effect only if the container ref itself changes,
    // not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapContainer.current]);

useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapInstance.isStyleLoaded()) {
      // Si el mapa no está listo, no hagas nada todavía.
      // Se re-ejecutará cuando esté listo.
      return;
    }

    // --- Lógica para el marcador de Destino (rojo) ---
    if (markerLocation) {
      const missionLngLat: mapboxgl.LngLatLike = [markerLocation.lng, markerLocation.lat];
      // Solo crea el marcador de destino si NO existe
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new mapboxgl.Marker({ color: '#f43f5e' })
          .setLngLat(missionLngLat)
          .addTo(mapInstance);
      }
    }

    // --- Lógica para el marcador del Scout (azul) ---
    if (scoutLocation) {
      const scoutLngLat: mapboxgl.LngLatLike = [scoutLocation.lng, scoutLocation.lat];
      // Si el marcador del scout ya existe, solo actualiza su posición
      if (scoutMarkerRef.current) {
        scoutMarkerRef.current.setLngLat(scoutLngLat);
      } else {
        // Si no existe, créalo
        scoutMarkerRef.current = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat(scoutLngLat)
          .addTo(mapInstance);
      }
    }

    // --- Lógica para la ruta (sin cambios) ---
    if (route && !mapInstance.getSource('route')) {
      mapInstance.addSource('route', { type: 'geojson', data: route });
      mapInstance.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.75 },
      });
    } else if (route && mapInstance.getSource('route')) {
      // Asegura que la ruta se actualice si cambia
      (mapInstance.getSource('route') as mapboxgl.GeoJSONSource).setData(route);
    }

}, [scoutLocation, markerLocation, route, map.current]); // Asegúrate de que el efecto se ejecute si el mapa cambia

  return (
    <div
      ref={mapContainer}
      className={`h-[400px] w-full rounded-lg ${
        onMapClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    />
  );
}
