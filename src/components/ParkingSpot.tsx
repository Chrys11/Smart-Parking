
import React from 'react';
import { MapPin, Clock, Car, ChevronRight, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParkingSpotProps {
  name: string;
  address: string;
  rate: string;
  available: number;
  distance: string;
  onClick: () => void;
}

const ParkingSpot = ({ name, address, rate, available, distance, onClick }: ParkingSpotProps) => {
  return (
    <div 
      className="parking-card-pro animate-enter cursor-pointer group w-full bg-white rounded-xl shadow-md p-5 sm:p-6 transition-all duration-300 border border-gray-100/50 hover:border-primary-200/60"
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-800 group-hover:text-primary-600 transition-colors truncate font-heading">{name}</h3>
          <div className="flex items-center mt-1.5 text-gray-500">
            <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-gray-400" />
            <p className="text-sm truncate max-w-full">{address}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Navigation className="w-3.5 h-3.5 mr-1.5 text-primary-500" />
          <span className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 border border-primary-100/50">
            {distance}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between mt-5 gap-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100/50">
            <Car className="w-4 h-4 text-primary-700" />
            <span className="text-sm font-medium text-primary-800">{available} spots</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100/50">
            <Clock className="w-4 h-4 text-primary-700" />
            <span className="text-sm font-medium text-primary-800">{rate}</span>
          </div>
        </div>
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 group-hover:bg-primary-50 transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default ParkingSpot;
