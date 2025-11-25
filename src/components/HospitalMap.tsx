import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";

interface HospitalMapProps {
  latitude: number;
  longitude: number;
  hospitalName: string;
}

const HospitalMap: React.FC<HospitalMapProps> = ({ latitude, longitude, hospitalName }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError('Token do Mapbox não disponível');
        }
      } catch (err) {
        console.error('Erro ao buscar token do Mapbox:', err);
        setError('Não foi possível carregar o mapa');
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [longitude, latitude],
      zoom: 15,
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add marker for hospital
    const marker = new mapboxgl.Marker({ color: '#8B5CF6' })
      .setLngLat([longitude, latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<div style="color: #000; font-weight: 600;">${hospitalName}</div>`)
      )
      .addTo(map.current);

    // Show popup by default
    marker.togglePopup();

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [latitude, longitude, hospitalName, mapboxToken]);

  if (error) {
    return (
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-border/20 bg-muted/50 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-border/20 bg-muted/50 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-border/20 shadow-lg my-4">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border/20">
        <p className="text-sm text-foreground">
          📍 <span className="font-semibold">{hospitalName}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Lat: {latitude.toFixed(6)}, Long: {longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
};

export default HospitalMap;
