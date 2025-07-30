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
  const marker = useRef<mapboxgl.Marker | null>(null);

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
        if (marker.current) {
          marker.current.setLngLat(coords);
        } else {
          marker.current = new mapboxgl.Marker()
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

  // Draw route on the map
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;

    const handleLoad = () => {
      if (route && !mapInstance.getSource('route')) {
        mapInstance.addSource('route', {
          type: 'geojson',
          data: route,
        });
        mapInstance.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6', // blue-500
            'line-width': 5,
            'line-opacity': 0.75,
          },
        });
      }
    };

    if (mapInstance.isStyleLoaded()) {
      handleLoad();
    } else {
      mapInstance.on('load', handleLoad);
    }

    return () => {
      // Clean up the event listener
      mapInstance.off('load', handleLoad);
    };
  }, [route]);

  // Update map view when props change
  useEffect(() => {
    if (!map.current) return;

    // Smoothly transition to the new view
    map.current.flyTo({
      center: [center.lng, center.lat],
      zoom: zoom,
      speed: 1.5,
    });

    // Update marker for scout location
    if (scoutLocation) {
      if (marker.current) {
        marker.current.setLngLat([scoutLocation.lng, scoutLocation.lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: '#3b82f6' }) // Blue for scout
          .setLngLat([scoutLocation.lng, scoutLocation.lat])
          .addTo(map.current);
      }
    }
    // Update marker for mission destination (only if no scout location)
    else if (markerLocation) {
      if (marker.current) {
        marker.current.setLngLat([markerLocation.lng, markerLocation.lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: '#f43f5e' }) // Red for destination
          .setLngLat([markerLocation.lng, markerLocation.lat])
          .addTo(map.current);
      }
    } else if (marker.current) {
      // Remove marker if location is no longer provided
      marker.current.remove();
      marker.current = null;
    }
  }, [center, markerLocation, scoutLocation, zoom]);

  return (
    <div
      ref={mapContainer}
      className={`h-[400px] w-full rounded-lg ${
        onMapClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    />
  );
}
