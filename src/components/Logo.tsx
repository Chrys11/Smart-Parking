
import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className, showText = true, size = 'md' }) => {
  const sizes = {
    sm: {
      container: 'h-12',
      image: 'h-12 w-auto',
      text: 'text-lg'
    },
    md: {
      container: 'h-12',
      image: 'h-12 w-auto',
      text: 'text-xl'
    },
    lg: {
      container: 'h-20',
      image: 'h-20 w-auto',
      text: 'text-2xl'
    },
    xl: {
      container: 'h-28',
      image: 'h-28 w-auto',
      text: 'text-3xl'
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <div 
        className={cn(
          "flex items-center justify-center logo-container",
          sizes[size].container
        )}
      >
        <img 
          src="/parking-uploads/93a5b455-43ff-425c-a6f3-bebda9207f17.png" 
          alt="SmartPark Logo" 
          className={cn(
            sizes[size].image, 
            "object-contain logo-car-animation"
          )} 
        />
      </div>
      {showText && (
        <span className={cn("font-bold ml-2 hidden sm:inline", sizes[size].text)}>
          SmartPark
        </span>
      )}
    </div>
  );
};

export default Logo;
