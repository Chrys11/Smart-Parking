
import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Clock, DollarSign, Car, Mail, Phone, Info, X } from 'lucide-react';
import { createParkingSpace } from "@/services/parkingSpaces";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";

interface ParkingSpaceFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const ParkingSpaceForm = ({ onClose, onSuccess }: ParkingSpaceFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    totalSpots: '',
    rate: '',
    description: '',
    ownerEmail: '',
    ownerPhone: ''
  });
  const [currentTab, setCurrentTab] = useState('location');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [formError, setFormError] = useState('');
  const [formProgress, setFormProgress] = useState(0);

  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
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
      } catch (error) {
        console.error('Unexpected error fetching Mapbox token:', error);
      } finally {
        setIsLoadingMap(false);
      }
    };

    fetchMapboxToken();
    
    const fetchUserEmail = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && user.email && !error) {
        setFormData(prev => ({ ...prev, ownerEmail: user.email }));
      }
    };
    
    fetchUserEmail();
  }, []);

  useEffect(() => {
    // Calculate form progress
    let fields = 0;
    let filledFields = 0;
    
    if (formData.name) filledFields++;
    fields++;
    
    if (formData.address) filledFields++;
    fields++;
    
    if (formData.totalSpots) filledFields++;
    fields++;
    
    if (formData.rate) filledFields++;
    fields++;
    
    if (formData.description) filledFields++;
    fields++;
    
    if (formData.ownerEmail) filledFields++;
    fields++;
    
    if (formData.ownerPhone) filledFields++;
    fields++;
    
    if (selectedLocation) filledFields++;
    fields++;
    
    setFormProgress(Math.floor((filledFields / fields) * 100));
  }, [formData, selectedLocation]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-74.5, 40], // Default center
      zoom: 9
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    });

    map.current.addControl(geolocateControl);

    map.current.on('load', () => {
      geolocateControl.trigger();
    });

    marker.current = new mapboxgl.Marker({
      color: '#F97316',
      draggable: true
    });

    map.current.on('click', (e) => {
      const lngLat = [e.lngLat.lng, e.lngLat.lat] as [number, number];
      placeMarker(lngLat);
      reverseGeocode(lngLat);
    });

    if (marker.current) {
      marker.current.on('dragend', () => {
        if (marker.current) {
          const lngLat = marker.current.getLngLat();
          const newLocation: [number, number] = [lngLat.lng, lngLat.lat];
          setSelectedLocation(newLocation);
          reverseGeocode(newLocation);
        }
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  const placeMarker = (location: [number, number]) => {
    if (!marker.current || !map.current) return;
    
    marker.current.setLngLat({ lng: location[0], lat: location[1] });
    marker.current.addTo(map.current);
    setSelectedLocation(location);
  };

  const reverseGeocode = async (location: [number, number]) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location[0]},${location[1]}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const address = data.features[0].place_name;
        setFormData(prev => ({ ...prev, address }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const validateForm = () => {
    if (!formData.name) {
      setFormError('Please enter a parking space name');
      setCurrentTab('details');
      return false;
    }
    if (!formData.address) {
      setFormError('Please select a location on the map');
      setCurrentTab('location');
      return false;
    }
    if (!formData.totalSpots) {
      setFormError('Please enter the number of parking spots');
      setCurrentTab('details');
      return false;
    }
    if (!formData.rate) {
      setFormError('Please enter an hourly rate');
      setCurrentTab('details');
      return false;
    }
    if (!selectedLocation) {
      setFormError('Please select a location on the map');
      setCurrentTab('location');
      return false;
    }
    if (!formData.ownerEmail) {
      setFormError('Please enter a contact email');
      setCurrentTab('contact');
      return false;
    }
    if (!formData.ownerPhone) {
      setFormError('Please enter a contact phone number');
      setCurrentTab('contact');
      return false;
    }

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formData.ownerPhone)) {
      setFormError('Please enter a phone number with a country code (e.g., +1234567890)');
      setCurrentTab('contact');
      return false;
    }

    setFormError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      await createParkingSpace({
        name: formData.name,
        address: formData.address,
        totalSpots: parseInt(formData.totalSpots),
        rate: parseFloat(formData.rate),
        description: formData.description,
        longitude: selectedLocation![0],
        latitude: selectedLocation![1],
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone
      });
      
      toast({
        title: "Success!",
        description: "Your parking space has been registered.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to register your parking space. Please try again.",
        variant: "destructive"
      });
      setFormError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-0 rounded-xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto relative">
      {/* Close button */}
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 z-10 p-1 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5 text-gray-500" />
      </button>
      
      {/* Header with progress */}
      <div className="bg-gradient-to-r from-primary to-primary-400 text-white p-6 rounded-t-xl">
        <h2 className="text-2xl font-bold mb-1">Register Your Parking Space</h2>
        <p className="text-white/80 text-sm mb-3">Fill in the details to list your parking space on our platform</p>
        
        <div className="w-full bg-white/20 rounded-full h-2 mb-1">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-500 ease-in-out" 
            style={{ width: `${formProgress}%` }}
          ></div>
        </div>
        <p className="text-xs text-white/70">{formProgress}% complete</p>
      </div>
      
      {formError && (
        <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r">
          <div className="flex">
            <Info className="h-5 w-5 mr-2" />
            <p>{formError}</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <Tabs 
          defaultValue="location" 
          value={currentTab} 
          onValueChange={setCurrentTab}
          className="p-6"
        >
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="location" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <MapPin className="h-4 w-4 mr-2" />
              Location
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Car className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Phone className="h-4 w-4 mr-2" />
              Contact
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="location" className="space-y-4 pt-2">
            <div className="rounded-lg overflow-hidden border border-gray-200">
              {isLoadingMap ? (
                <div className="bg-gray-100 rounded-lg flex items-center justify-center h-[300px]">
                  <div className="animate-pulse text-center">
                    <Car className="h-12 w-12 text-primary mx-auto mb-2 animate-pulse" />
                    <p>Loading map...</p>
                  </div>
                </div>
              ) : !mapboxToken ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <Info className="h-5 w-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-700">
                      Mapbox API key not found. Please contact the administrator.
                    </p>
                  </div>
                </div>
              ) : (
                <div ref={mapContainer} className="h-[350px] rounded-lg" />
              )}
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-700 flex items-start">
                <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Click on the map to select your parking location. The marker can be dragged for precise positioning.</span>
              </p>
            </div>

            <div>
              <Label htmlFor="address" className="text-sm font-medium mb-1 block">Address (auto-filled from map)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-primary" />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
                  placeholder="Address will be populated when you select a location"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                type="button" 
                onClick={() => setCurrentTab('details')}
                className="bg-primary hover:bg-primary-600"
              >
                Next: Details
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4 pt-2">
            <div>
              <Label htmlFor="name" className="text-sm font-medium mb-1 block">Parking Name</Label>
              <div className="relative">
                <Car className="absolute left-3 top-3 h-5 w-5 text-primary" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
                  placeholder="Enter a distinctive name for your space"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalSpots" className="text-sm font-medium mb-1 block">Total Spots</Label>
                <div className="relative">
                  <Car className="absolute left-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    id="totalSpots"
                    type="number"
                    value={formData.totalSpots}
                    onChange={(e) => setFormData({ ...formData, totalSpots: e.target.value })}
                    className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
                    placeholder="Number of spots"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rate" className="text-sm font-medium mb-1 block">Hourly Rate (UGX)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
                    placeholder="Price per hour"
                    min="0.01"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium mb-1 block">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-gray-300 focus:border-primary focus:ring-primary min-h-[100px]"
                placeholder="Describe your parking space, its features, security, accessibility, etc."
              />
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentTab('location')}
              >
                Back: Location
              </Button>
              <Button 
                type="button" 
                onClick={() => setCurrentTab('contact')}
                className="bg-primary hover:bg-primary-600"
              >
                Next: Contact
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="contact" className="space-y-4 pt-2">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Contact Information</h3>
              <p className="text-sm text-gray-600">
                These details will be used to reach you regarding bookings and inquiries about your parking space.
              </p>
            </div>
            
            <div>
              <Label htmlFor="ownerEmail" className="text-sm font-medium mb-1 block">Contact Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-primary" />
                <Input
                  id="ownerEmail"
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
                  placeholder="Email for booking notifications"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ownerPhone" className="text-sm font-medium mb-1 block">Parking Manager Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-primary" />
                <Input
                  id="ownerPhone"
                  type="tel"
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  className="pl-10 border-gray-300 focus:border-primary focus:ring-primary"
                  placeholder="+256 700000000"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Must include country code with + sign (e.g., +256 for Uganda)
              </p>
            </div>
            
            <div className="flex justify-between pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentTab('details')}
              >
                Back: Details
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary-600 text-white px-6"
              >
                {isSubmitting ? 'Registering...' : 'Register Parking Space'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
};

export default ParkingSpaceForm;
