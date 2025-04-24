
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";
import { fetchParkingSpaces } from "@/services/parkingSpaces";
import { Loader2 } from 'lucide-react';

interface ParkingSpace {
  id: string;
  name: string;
  address: string;
  hourly_rate: number;
  total_spots: number;
  longitude: number;
  latitude: number;
  description?: string;
  distance?: number;
}

const ParkingMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);

  // Fetch Mapbox token from Supabase
  useEffect(() => {
    const fetchMapboxToken = async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'mapbox_token')
        .single();

      if (error) {
        console.error('Error fetching Mapbox token:', error);
        return;
      }

      if (data) {
        setMapboxToken(data.value);
      }
      setIsLoading(false);
    };

    fetchMapboxToken();
  }, []);

  // Load parking spaces from the database
  useEffect(() => {
    const loadParkingSpaces = async () => {
      try {
        const spaces = await fetchParkingSpaces();
        setParkingSpaces(spaces as ParkingSpace[]);
      } catch (error) {
        console.error('Error loading parking spaces:', error);
      }
    };

    loadParkingSpaces();
  }, []);

  // Get user's location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation([longitude, latitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Initialize map and add parking space markers
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || parkingSpaces.length === 0) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: userLocation || [-74.5, 40], // Use user location if available
      zoom: 13
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add and trigger geolocate control
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    });

    map.current.addControl(geolocateControl);

    // When map loads, add markers and trigger geolocation
    map.current.on('load', () => {
      // Add markers for all parking spaces
      parkingSpaces.forEach(space => {
        if (space.longitude && space.latitude) {
          // Create custom popup content with styled HTML
          const popupContent = `
            <div class="p-2 min-w-[180px]">
              <div class="font-semibold text-gray-800 mb-1">${space.name}</div>
              <div class="text-xs text-gray-600 mb-2">${space.address}</div>
              <div class="flex justify-between text-xs">
                <div class="text-primary font-medium">UGX ${space.hourly_rate.toFixed(2)}/hr</div>
                <div class="font-medium">${space.total_spots} spots</div>
              </div>
            </div>
          `;

          const popup = new mapboxgl.Popup({ 
            offset: 25,
            closeButton: false,
            className: 'map-popup'
          }).setHTML(popupContent);

          // Create a custom marker element with logo
          const el = document.createElement('div');
          el.className = 'flex items-center justify-center relative';
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.cursor = 'pointer';
          
          // Create a circular background
          const circleEl = document.createElement('div');
          circleEl.style.position = 'absolute';
          circleEl.style.backgroundColor = '#0000FF';
          circleEl.style.width = '34px';
          circleEl.style.height = '34px';
          circleEl.style.borderRadius = '50%';
          circleEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          el.appendChild(circleEl);
          
          // Add the logo image
          const logoImg = document.createElement('img');
          logoImg.src = "/parking-uploads/93a5b455-43ff-425c-a6f3-bebda9207f17.png";
          logoImg.style.width = '24px';
          logoImg.style.height = '24px';
          logoImg.style.position = 'absolute';
          logoImg.style.objectFit = 'contain';
          el.appendChild(logoImg);

          new mapboxgl.Marker({ element: el })
            .setLngLat([space.longitude, space.latitude])
            .setPopup(popup)
            .addTo(map.current!);
        }
      });

      // Trigger geolocation
      geolocateControl.trigger();
    });

    // Add user location marker if we have it
    if (userLocation) {
      // Create a custom marker for user location
      const userEl = document.createElement('div');
      userEl.className = 'flex items-center justify-center';
      userEl.style.backgroundColor = '#FFFFFF';
      userEl.style.border = '2px solid #0000FF';
      userEl.style.width = '20px';
      userEl.style.height = '20px';
      userEl.style.borderRadius = '50%';
      userEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

      // Add inner blue dot
      const innerDot = document.createElement('div');
      innerDot.style.backgroundColor = '#0000FF';
      innerDot.style.width = '10px';
      innerDot.style.height = '10px';
      innerDot.style.borderRadius = '50%';
      userEl.appendChild(innerDot);

      new mapboxgl.Marker({ element: userEl })
        .setLngLat(userLocation)
        .addTo(map.current);

      // Center map on user location
      map.current.flyTo({
        center: userLocation,
        zoom: 14,
        essential: true
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, userLocation, parkingSpaces]);

  return (
    <div className="relative w-full h-[400px]">
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
          <div className="text-gray-600">Loading map...</div>
        </div>
      ) : (
        <div ref={mapContainer} className="h-full rounded-lg overflow-hidden" />
      )}
    </div>
  );
};

export default ParkingMap;
