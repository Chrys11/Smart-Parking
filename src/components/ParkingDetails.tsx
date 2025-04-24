
import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Clock, DollarSign, Car, Mail, Phone, ArrowLeft, Navigation, Route, Star, Calendar, Shield, MessageCircle, CheckCircle, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchParkingSpaceDetails, calculateDistance } from '@/services/parkingSpaces';
import { toast } from '@/hooks/use-toast';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from 'react-router-dom';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface ParkingDetailsProps {
  parkingId: string;
  userLocation: [number, number] | null;
  onBack: () => void;
}

const ParkingDetails: React.FC<ParkingDetailsProps> = ({ parkingId, userLocation, onBack }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [isShowingRoute, setIsShowingRoute] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const routeGeometry = useRef<any>(null);

  useEffect(() => {
    const fetchMapboxToken = async () => {
      const { data: tokenData, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'mapbox_token')
        .single();

      if (error) {
        console.error('Error fetching Mapbox token:', error);
        return;
      }

      if (tokenData) {
        setMapboxToken(tokenData.value);
      }
      setIsLoadingMap(false);
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    const loadParkingDetails = async () => {
      try {
        setIsLoading(true);
        const details = await fetchParkingSpaceDetails(parkingId);
        setData(details);
        
        if (user && details.owner_id === user.id) {
          setIsOwner(true);
        }
        
        if (userLocation && details.latitude && details.longitude) {
          const distanceValue = calculateDistance(
            userLocation[1], userLocation[0], 
            details.latitude, details.longitude
          );
          setDistance(`${distanceValue.toFixed(1)} km away`);
        }
      } catch (error) {
        console.error('Error loading parking details:', error);
        toast({
          title: "Error",
          description: "Failed to load parking details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadParkingDetails();
  }, [parkingId, userLocation, user]);

  useEffect(() => {
    if (!user || !parkingId) return;

    const fetchActiveRequests = async () => {
      try {
        const { data: requests, error } = await supabase
          .from('parking_requests')
          .select('*')
          .eq('parking_space_id', parkingId)
          .eq('user_id', user.id)
          .in('status', ['pending', 'active'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setActiveRequests(requests || []);
      } catch (error) {
        console.error('Error fetching active requests:', error);
      }
    };

    fetchActiveRequests();
  }, [parkingId, user]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !data || !data.latitude || !data.longitude) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [data.longitude, data.latitude],
      zoom: 15
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const el = document.createElement('div');
    el.className = 'flex items-center justify-center relative parking-marker';
    el.style.width = '50px';
    el.style.height = '50px';
    el.style.cursor = 'pointer';
    
    const markerPulse = document.createElement('div');
    markerPulse.className = 'marker-pulse';
    el.appendChild(markerPulse);
    
    const circleEl = document.createElement('div');
    circleEl.className = 'marker-circle';
    el.appendChild(circleEl);
    
    const logoImg = document.createElement('img');
    logoImg.src = "/parking-uploads/93a5b455-43ff-425c-a6f3-bebda9207f17.png";
    logoImg.className = 'marker-logo';
    el.appendChild(logoImg);

    new mapboxgl.Marker({ element: el })
      .setLngLat([data.longitude, data.latitude])
      .addTo(map.current);

    if (userLocation) {
      const userMarkerEl = document.createElement('div');
      userMarkerEl.className = 'user-location-marker';
      
      new mapboxgl.Marker({ element: userMarkerEl })
        .setLngLat(userLocation)
        .addTo(map.current);

      const bounds = new mapboxgl.LngLatBounds()
        .extend(userLocation)
        .extend([data.longitude, data.latitude]);

      map.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 15
      });
    }

    map.current.on('load', () => {
      if (isShowingRoute) {
        displayRoute();
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, data, userLocation]);

  useEffect(() => {
    if (map.current && map.current.loaded() && isShowingRoute) {
      displayRoute();
    }
  }, [isShowingRoute]);

  const displayRoute = async () => {
    if (!map.current || !userLocation || !data || !data.latitude || !data.longitude || !mapboxToken) {
      return;
    }

    try {
      if (map.current.getSource('route')) {
        map.current.removeLayer('route-layer');
        map.current.removeSource('route');
      }

      const userCoords = `${userLocation[0]},${userLocation[1]}`;
      const parkingCoords = `${data.longitude},${data.latitude}`;
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userCoords};${parkingCoords}?geometries=geojson&access_token=${mapboxToken}`;
      
      const response = await fetch(url);
      const json = await response.json();
      
      if (json.routes && json.routes.length > 0) {
        routeGeometry.current = json.routes[0].geometry;
        
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routeGeometry.current
          }
        });
        
        map.current.addLayer({
          id: 'route-layer',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3887be',
            'line-width': 5,
            'line-opacity': 0.75
          }
        });

        const bounds = new mapboxgl.LngLatBounds();
        routeGeometry.current.coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
        
        map.current.fitBounds(bounds, {
          padding: 50
        });

        toast({
          title: "Route Displayed",
          description: "Showing the route to the parking space.",
        });
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.error('Error displaying route:', error);
      toast({
        title: "Error",
        description: "Could not display route. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGetDirections = () => {
    if (!data || !data.latitude || !data.longitude) {
      toast({
        title: "Error",
        description: "Location coordinates not available for directions.",
        variant: "destructive"
      });
      return;
    }

    const directionsUrl = userLocation 
      ? `https://www.google.com/maps/dir/${userLocation[1]},${userLocation[0]}/${data.latitude},${data.longitude}`
      : `https://www.google.com/maps/dir//${data.latitude},${data.longitude}`;
    
    window.open(directionsUrl, '_blank');
  };

  const handleShowRoute = () => {
    setIsShowingRoute(true);
  };

  const handleRequestParking = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to request parking.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (isOwner) {
      toast({
        title: "Action Not Allowed",
        description: "You cannot request parking for your own space.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRequestLoading(true);
      
      const { data: request, error } = await supabase
        .from('parking_requests')
        .insert({
          parking_space_id: parkingId,
          user_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Request Sent",
        description: "Your parking request has been sent to the owner."
      });
      
      setActiveRequests([request, ...activeRequests]);
    } catch (error) {
      console.error('Error sending parking request:', error);
      toast({
        title: "Request Failed",
        description: "Failed to send parking request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRequestLoading(false);
    }
  };

  const handleEndParking = async (requestId: string) => {
    if (!user) return;

    try {
      setIsRequestLoading(true);
      
      const { data: request, error } = await supabase
        .from('parking_requests')
        .update({ 
          status: 'end_requested' 
        })
        .eq('id', requestId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "End Request Sent",
        description: "Your request to end parking has been sent to the owner."
      });
      
      setActiveRequests(activeRequests.map(req => 
        req.id === requestId ? request : req
      ));
    } catch (error) {
      console.error('Error requesting end of parking:', error);
      toast({
        title: "Request Failed",
        description: "Failed to request end of parking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRequestLoading(false);
    }
  };

  const getRequestStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string, text: string }> = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Approval' },
      'active': { color: 'bg-green-100 text-green-800', text: 'Currently Parking' },
      'end_requested': { color: 'bg-blue-100 text-blue-800', text: 'End Requested' },
      'completed': { color: 'bg-gray-100 text-gray-800', text: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };

    const style = statusMap[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.color}`}>
        {style.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4 animate-pulse">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
          <Car className="w-12 h-12 text-primary/40" />
        </div>
        <div className="h-6 w-48 bg-gray-200 rounded-md"></div>
        <div className="h-4 w-64 bg-gray-100 rounded-md"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-8 text-center">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md mx-auto">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Parking Space Not Found</h2>
          <p className="text-gray-600 mb-6">The parking space you're looking for doesn't exist or has been removed.</p>
          <Button onClick={onBack} variant="default" className="button-primary">
            Back to listings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Button 
        variant="outline" 
        onClick={onBack} 
        className="mb-6 flex items-center gap-1.5 shadow-sm border border-gray-200 hover:bg-primary/5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listings
      </Button>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="h-[50vh] relative">
          {isLoadingMap ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-pulse flex flex-col items-center gap-3">
                <MapPin className="h-12 w-12 text-primary/40" />
                <p className="text-gray-500">Loading map...</p>
              </div>
            </div>
          ) : (
            <div ref={mapContainer} className="h-full w-full" />
          )}
          <div className="absolute left-4 top-4 z-10">
            <div className="glass-effect px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="font-medium text-gray-800 text-sm">{distance || 'Location details'}</span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="sm:flex sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary-50 text-primary border-primary-200 px-2 py-1">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  24/7
                </Badge>
                <Badge variant="outline" className="bg-primary-50 text-primary border-primary-200 px-2 py-1">
                  <Car className="w-3.5 h-3.5 mr-1" />
                  {data.total_spots} spots
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 font-heading">{data?.name}</h1>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm sm:text-base">{data?.address}</span>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="bg-primary/5 px-5 py-3 rounded-lg border border-primary/10 text-center">
                <p className="text-sm text-primary-700 mb-1">Hourly Rate</p>
                <p className="text-2xl font-bold text-primary-800">UGX {data?.hourly_rate}</p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {activeRequests.length > 0 && (
            <Alert className="mb-6 border-primary/20 bg-primary/10">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-primary mb-1">Active Parking Request</h4>
                  <AlertDescription>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span>Status: {getRequestStatusBadge(activeRequests[0].status)}</span>
                        {activeRequests[0].status === 'active' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEndParking(activeRequests[0].id)}
                            disabled={isRequestLoading}
                            className="border-primary/20 text-primary hover:bg-primary/5"
                          >
                            Request End
                          </Button>
                        )}
                      </div>
                      {activeRequests[0].start_time && (
                        <span className="text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Started: {new Date(activeRequests[0].start_time).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <MessageCircle className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
                <p className="text-gray-700">{data?.description || 'No description provided for this parking space.'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-primary-50 rounded-xl p-5 border border-primary-100/50 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02] duration-300">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-primary-800 mb-1">Secure Parking</h3>
              <p className="text-sm text-primary-700">Your vehicle is safe with our 24/7 security monitoring</p>
            </div>
            <div className="bg-primary-50 rounded-xl p-5 border border-primary-100/50 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02] duration-300">
              <Locate className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-primary-800 mb-1">Easy Access</h3>
              <p className="text-sm text-primary-700">Conveniently located with simple entry and exit</p>
            </div>
          </div>

          {!isOwner && (
            <Button 
              className="w-full mb-6 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary-400"
              onClick={handleRequestParking}
              disabled={isRequestLoading || activeRequests.length > 0}
            >
              {activeRequests.length > 0 ? 'Request Already Sent' : 'Request Parking Space'}
            </Button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Button 
              variant="outline"
              onClick={handleShowRoute}
              className="flex justify-center items-center gap-2 h-12 bg-white border-primary/20 text-primary-700 hover:bg-primary/5"
              disabled={!userLocation}
            >
              <Route className="h-5 w-5" />
              Show Route on Map
            </Button>
            <Button 
              onClick={handleGetDirections}
              className="flex justify-center items-center gap-2 h-12 bg-primary/90 hover:bg-primary text-white"
            >
              <Navigation className="h-5 w-5" />
              Open in Google Maps
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2 text-gray-800 font-heading">
              <Phone className="h-5 w-5 text-primary" />
              Contact Information
            </h3>
            <Separator className="mb-5" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {data?.owners && data?.owners.email && (
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <a href={`mailto:${data.owners.email}`} className="text-primary-700 hover:text-primary hover:underline">
                      {data.owners.email}
                    </a>
                  </div>
                </div>
              )}
              
              {data?.owner_phone && (
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Phone</p>
                    <a href={`tel:${data.owner_phone}`} className="text-primary-700 hover:text-primary hover:underline">
                      {data.owner_phone}
                    </a>
                  </div>
                </div>
              )}
              
              {!data?.owner_phone && !data?.owners?.email && (
                <div className="col-span-2 flex items-center justify-center py-8 text-gray-500">
                  <p>Contact information not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParkingDetails;
