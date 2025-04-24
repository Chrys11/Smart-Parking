
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ParkingMap from '../components/ParkingMap';
import ParkingSpot from '../components/ParkingSpot';
import ParkingDetails from '../components/ParkingDetails';
import ParkingSpaceForm from '../components/ParkingSpaceForm';
import Logo from '../components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, List, Plus, LogIn, Car, ParkingCircle, Search, MapPinned, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchParkingSpaces, calculateDistance } from '@/services/parkingSpaces';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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

const Index = () => {
  const [view, setView] = useState<'map' | 'list'>('map');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<ParkingSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedParkingId, setSelectedParkingId] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [hasOwnedParkingSpaces, setHasOwnedParkingSpaces] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const isMobile = useIsMobile();

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

  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) {
        setUserType(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        setUserType(data.user_type);
      } catch (error) {
        console.error('Error fetching user type:', error);
      }
    };
    
    fetchUserType();
  }, [user]);

  useEffect(() => {
    const checkUserParkingSpaces = async () => {
      if (!user) {
        setHasOwnedParkingSpaces(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('parking_spaces')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1);
        
        if (error) throw error;
        
        setHasOwnedParkingSpaces(data && data.length > 0);
      } catch (error) {
        console.error('Error checking user parking spaces:', error);
      }
    };
    
    checkUserParkingSpaces();
  }, [user]);

  const loadParkingSpaces = async () => {
    try {
      setIsLoading(true);
      const spaces = await fetchParkingSpaces();
      
      let processedSpaces = (spaces as ParkingSpace[]).map(space => {
        if (userLocation) {
          const distance = calculateDistance(
            userLocation[1], userLocation[0], // Lat, Lng for user
            space.latitude, space.longitude // Lat, Lng for parking space
          );
          return { ...space, distance };
        }
        return space;
      });
      
      if (userLocation) {
        processedSpaces.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }
      
      setParkingSpaces(processedSpaces);
      setFilteredSpaces(processedSpaces);
    } catch (error) {
      console.error('Error loading parking spaces:', error);
      toast({
        title: "Error",
        description: "Failed to load parking spaces. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadParkingSpaces();
  }, [userLocation]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSpaces(parkingSpaces);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = parkingSpaces.filter(space => 
      space.name.toLowerCase().includes(query) || 
      space.address.toLowerCase().includes(query)
    );
    
    setFilteredSpaces(filtered);
  }, [searchQuery, parkingSpaces]);

  const handleSpotClick = (id: string) => {
    console.log('Selected parking spot:', id);
    setSelectedParkingId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegistrationSuccess = () => {
    loadParkingSpaces();
    setShowRegistrationForm(false);
    toast({
      title: "Success!",
      description: "Your parking space has been registered successfully.",
      variant: "default"
    });
  };

  const handleBackFromDetails = () => {
    setSelectedParkingId(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Search Results",
      description: filteredSpaces.length === 0 
        ? "No parking locations found. Try a different search term." 
        : `Found ${filteredSpaces.length} parking location(s).`
    });
  };

  const displayParkingSpots = filteredSpaces.slice(0, 10).map(space => ({
    id: space.id,
    name: space.name,
    address: space.address,
    rate: `UGX ${space.hourly_rate.toFixed(2)}`,
    available: space.total_spots,
    distance: space.distance ? `${space.distance.toFixed(1)} km` : "Unknown"
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hero-gradient-pro py-12 px-4 mb-8 shadow-sm relative">
        <div className="container max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <Logo size="md" />
            <div className="flex gap-3 items-center">
              {user ? (
                <Button
                  onClick={() => setShowRegistrationForm(true)}
                  className="pro-button pro-button-primary flex items-center gap-2"
                  variant="default"
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Register Space</span>
                </Button>
              ) : (
                <Button asChild variant="default" className="pro-button pro-button-primary" size={isMobile ? "sm" : "default"}>
                  <Link to="/auth" className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                </Button>
              )}
              
              {!selectedParkingId && (
                <div className="glass-effect p-1 rounded-lg shadow-sm border border-gray-100 flex">
                  <Button
                    variant={view === 'map' ? "secondary" : "ghost"}
                    onClick={() => setView('map')}
                    size="icon"
                    className={view === 'map' ? "bg-white shadow-sm" : ""}
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={view === 'list' ? "secondary" : "ghost"}
                    onClick={() => setView('list')}
                    size="icon"
                    className={view === 'list' ? "bg-white shadow-sm" : ""}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {user && !isMobile && (
                <Button asChild variant="outline" size="sm" className="pro-button pro-button-secondary">
                  <Link to="/profile">
                    Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {!selectedParkingId && (
            <div className="text-center mb-16 animate-fade-in max-w-3xl mx-auto">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4 leading-tight font-heading">
                Find <span className="text-primary">Parking Easily</span> Around You
              </h1>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-10">
                Discover available parking spots near you in real-time and book them instantly with our smart parking solution.
              </p>
              
              <div className="relative max-w-xl mx-auto mt-10">
                <form onSubmit={handleSearch}>
                  <div className="pro-search py-3 px-2">
                    <Search className="w-5 h-5 text-primary-500 mx-3" />
                    <input 
                      type="text" 
                      placeholder="Search for parking locations..." 
                      className="bg-transparent border-none outline-none flex-grow text-base py-1"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search 
                      onClick={handleSearch}
                      className="w-5 h-5 text-primary-500 mx-3 cursor-pointer hover:text-primary-600 transition-colors"
                    />
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4">
        {user && !isMobile && (
          <div className="mb-10 flex flex-wrap gap-2 justify-center">
            <Button asChild variant="outline" className="flex items-center gap-2 bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200">
              <Link to="/">
                <MapPin className="w-4 h-4" />
                Home
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="flex items-center gap-2 bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200">
              <Link to="/dashboard">
                <Car className="w-4 h-4" />
                User Dashboard
              </Link>
            </Button>
            
            {(hasOwnedParkingSpaces || userType === 'parkowner') && (
              <Button asChild variant="outline" className="flex items-center gap-2 bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200">
                <Link to="/owner">
                  <ParkingCircle className="w-4 h-4" />
                  Owner Dashboard
                </Link>
              </Button>
            )}
          </div>
        )}

        {showRegistrationForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="max-w-lg w-full">
              <ParkingSpaceForm 
                onClose={() => setShowRegistrationForm(false)} 
                onSuccess={handleRegistrationSuccess}
              />
            </div>
          </div>
        )}

        <div className="space-y-6">
          {selectedParkingId ? (
            <Card className="p-0 overflow-hidden animate-fade-in border-0 shadow-lg rounded-xl">
              <ParkingDetails 
                parkingId={selectedParkingId}
                userLocation={userLocation}
                onBack={handleBackFromDetails}
              />
            </Card>
          ) : (
            <>
              {view === 'map' && (
                <div className="rounded-xl overflow-hidden shadow-lg animate-fade-in border border-gray-100">
                  <ParkingMap />
                </div>
              )}
              
              <div className={`space-y-4 ${view === 'map' ? 'mt-10' : ''}`}>
                {isLoading ? (
                  <div className="text-center py-16 bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-md border border-gray-100">
                    <div className="animate-pulse-slow">
                      <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Car className="w-10 h-10 text-primary-500" />
                      </div>
                      <p className="text-gray-600">Loading parking spaces...</p>
                    </div>
                  </div>
                ) : displayParkingSpots.length > 0 ? (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800 font-heading">
                          {searchQuery ? 'Search Results' : 'Nearest Parking Spots'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Find the best parking spot for your needs</p>
                      </div>
                      <Badge variant="outline" className="bg-primary-50 text-primary border-primary-200 font-medium">
                        {displayParkingSpots.length} spots found
                      </Badge>
                    </div>
                    
                    <div className="grid gap-5">
                      {displayParkingSpots.map((spot) => (
                        <ParkingSpot
                          key={spot.id}
                          name={spot.name}
                          address={spot.address}
                          rate={spot.rate}
                          available={spot.available}
                          distance={spot.distance}
                          onClick={() => handleSpotClick(spot.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-xl shadow-md animate-fade-in border border-gray-100">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MapPinned className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2 font-heading">No Parking Spaces Found</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {searchQuery 
                        ? "We couldn't find any parking spaces matching your search. Try different keywords." 
                        : "No parking spaces available in your area yet."}
                    </p>
                    {user && !searchQuery && (
                      <Button 
                        onClick={() => setShowRegistrationForm(true)}
                        variant="default" 
                        className="pro-button pro-button-primary mt-2"
                      >
                        Register the first parking space
                      </Button>
                    )}
                    {searchQuery && (
                      <Button 
                        onClick={() => setSearchQuery('')}
                        variant="outline" 
                        className="pro-button pro-button-secondary mt-2"
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
