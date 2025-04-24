
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, LogOut, Settings, Shield } from 'lucide-react';
import { signOut } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
      });
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        variant: "destructive",
      });
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user.email) return "U";
    const parts = user.email.split('@');
    if (parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="bg-white shadow-md border-none overflow-hidden">
      <div className="bg-gradient-primary h-16 w-full"></div>
      <CardContent className="pt-0 relative">
        <div className="flex flex-col items-center -mt-10">
          <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
            <AvatarFallback className="bg-primary text-white text-xl font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          <div className="mt-4 text-center">
            <h2 className="text-xl font-bold text-gray-800">{user.email}</h2>
            <div className="flex justify-center mt-1.5 space-x-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                Premium Account
              </Badge>
              <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                <Shield className="h-3.5 w-3.5 mr-1" /> Verified
              </Badge>
            </div>
            
            <p className="text-gray-500 text-sm mt-3 max-w-xs mx-auto">
              Manage your user preferences, payment methods, and security settings.
            </p>
          </div>
          
          <div className="flex mt-6 gap-3 w-full">
            <Button variant="outline" className="flex-1" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" className="flex-1" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
