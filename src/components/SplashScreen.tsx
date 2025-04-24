
import React, { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'react-router-dom';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const isMobile = useIsMobile();
  const [fadeOut, setFadeOut] = useState(false);
  
  useEffect(() => {
    // Start fade out after 1.5 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1500);
    
    // Complete animation and call onFinish after 2 seconds
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2000);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);
  
  return (
    <div 
      className={`fixed inset-0 bg-primary-50 flex items-center justify-center z-50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-pulse-slow">
          <Logo size={isMobile ? "md" : "lg"} showText={false} />
        </div>
        <h1 className="text-2xl font-bold text-primary">SmartPark</h1>
        <div className="w-16 h-1 bg-primary-300 rounded animate-pulse" />
      </div>
    </div>
  );
};

export default SplashScreen;
