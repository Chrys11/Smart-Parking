
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ParkingSpaceData {
  name: string;
  address: string;
  totalSpots: number;
  rate: number;
  description: string;
  longitude: number;
  latitude: number;
  ownerEmail?: string;
  ownerPhone?: string;
}

export async function createParkingSpace(data: ParkingSpaceData) {
  try {
    // Get the current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting current user:', userError);
      throw userError;
    }
    
    const userId = userData.user?.id;
    
    if (!userId) {
      throw new Error('User is not authenticated');
    }
    
    console.log('Creating parking space for user:', userId);
    console.log('Parking space data:', data);
    
    // Create the parking space
    const { data: parkingSpace, error } = await supabase
      .from('parking_spaces')
      .insert({
        name: data.name,
        address: data.address,
        total_spots: parseInt(String(data.totalSpots)),
        hourly_rate: parseFloat(String(data.rate)),
        description: data.description,
        longitude: data.longitude,
        latitude: data.latitude,
        owner_id: userId,
        owner_phone: data.ownerPhone
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating parking space:', error);
      throw error;
    }

    console.log('Parking space created successfully:', parkingSpace);

    // Update user's email if provided
    if (data.ownerEmail) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: data.ownerEmail
      });
      
      if (emailError) {
        console.error('Error updating user email:', emailError);
        // Continue even if email update fails, as the parking space was created
      }
    }

    return { success: true, data: parkingSpace };
  } catch (error) {
    console.error('Error in createParkingSpace:', error);
    throw error;
  }
}

export async function fetchParkingSpaces() {
  try {
    const { data, error } = await supabase
      .from('parking_spaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching parking spaces:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchParkingSpaces:', error);
    throw error;
  }
}

export async function fetchParkingSpaceDetails(id: string) {
  try {
    // First get the parking space details
    const { data: parkingSpace, error: parkingError } = await supabase
      .from('parking_spaces')
      .select('*')
      .eq('id', id)
      .single();

    if (parkingError) {
      console.error('Error fetching parking space details:', parkingError);
      throw parkingError;
    }

    if (!parkingSpace) {
      throw new Error('Parking space not found');
    }

    // Then get the owner details separately
    const { data: ownerData, error: ownerError } = await supabase
      .from('profiles')
      .select('id, email:auth.users.email')
      .eq('id', parkingSpace.owner_id)
      .single();

    // Return combined data
    return {
      ...parkingSpace,
      owners: ownerError ? null : ownerData
    };
  } catch (error) {
    console.error('Error in fetchParkingSpaceDetails:', error);
    throw error;
  }
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}
