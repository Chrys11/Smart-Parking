
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Building, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

const MobileNavBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useAuth();
  const [hasOwnedParkingSpaces, setHasOwnedParkingSpaces] = useState(false);

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

  // If user is not logged in, don't show the mobile navigation bar
  if (!user) return null;

  const navItems = [
    {
      label: "Home",
      icon: Home,
      href: "/",
    },
    hasOwnedParkingSpaces ? {
      label: "Owner Dashboard",
      icon: Building,
      href: "/owner",
    } : {
      label: "Smartpark",
      icon: Building,
      href: "#",
      onClick: (e: React.MouseEvent) => e.preventDefault(),
    },
    {
      label: "Profile",
      icon: UserCog,
      href: "/profile",
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={item.onClick}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full px-2 py-1",
              (currentPath === item.href || 
               (item.href === "/owner" && currentPath.startsWith("/owner")) ||
               (item.href === "/profile" && currentPath.startsWith("/profile")))
                ? "text-primary" 
                : "text-gray-500"
            )}
          >
            {item.href === "/profile" ? (
              <div className="relative">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary text-white">
                    {user?.email?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {currentPath === "/profile" && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </div>
            ) : (
              <item.icon className="h-6 w-6" />
            )}
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MobileNavBar;
