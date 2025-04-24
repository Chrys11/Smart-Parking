import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Car, DollarSign, ParkingCircle, CheckCircle, XCircle, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [parkingSpaces, setParkingSpaces] = useState<any[]>([]);
  const [parkingRequests, setParkingRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parkingStats, setParkingStats] = useState({
    totalSpaces: 0,
    activeRequests: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    if (!user) return;

    const fetchOwnerData = async () => {
      try {
        setIsLoading(true);
        
        const { data: spaces, error: spacesError } = await supabase
          .from('parking_spaces')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        
        if (spacesError) throw spacesError;
        
        if (spaces && spaces.length > 0) {
          const spaceIds = spaces.map(space => space.id);
          
          const { data: requests, error: requestsError } = await supabase
            .from('parking_requests')
            .select('*')
            .in('parking_space_id', spaceIds)
            .order('created_at', { ascending: false });
          
          if (requestsError) throw requestsError;
          
          if (requests && requests.length > 0) {
            const enhancedRequests = await Promise.all(requests.map(async (request) => {
              const { data: userData } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', request.user_id)
                .single();
              
              const { data: userAuth } = await supabase.auth.admin.getUserById(
                request.user_id
              );
              
              const { data: spaceData, error: spaceError } = await supabase
                .from('parking_spaces')
                .select('id, name, address, hourly_rate')
                .eq('id', request.parking_space_id)
                .single();
              
              return {
                ...request,
                user: {
                  id: userData?.id,
                  email: userAuth?.user?.email || 'Unknown'
                },
                parking_space: spaceError ? null : spaceData
              };
            }));
            
            setParkingRequests(enhancedRequests || []);
            
            const activeReqs = enhancedRequests?.filter(req => 
              ['pending', 'active', 'end_requested'].includes(req.status)
            ).length || 0;
            
            const earnings = enhancedRequests?.reduce((sum, req) => 
              req.is_paid ? sum + parseFloat(String(req.total_amount) || '0') : sum, 0
            ) || 0;
            
            setParkingStats({
              totalSpaces: spaces.length,
              activeRequests: activeReqs,
              totalEarnings: earnings
            });
          } else {
            setParkingRequests([]);
            setParkingStats({
              totalSpaces: spaces.length,
              activeRequests: 0,
              totalEarnings: 0
            });
          }
        }
        
        setParkingSpaces(spaces || []);
      } catch (error) {
        console.error('Error fetching owner data:', error);
        toast({
          title: "Error",
          description: "Failed to load your data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOwnerData();
  }, [user]);

  const handleRequestAction = async (action: 'approve' | 'deny' | 'end', request: any) => {
    if (!user) return;
    
    try {
      setIsProcessing(true);
      
      let updateData: any = {};
      let successMessage = '';
      
      if (action === 'approve') {
        updateData = { 
          status: 'active',
          start_time: new Date().toISOString()
        };
        successMessage = 'Parking request approved';
      } else if (action === 'deny') {
        updateData = { status: 'cancelled' };
        successMessage = 'Parking request denied';
      } else if (action === 'end') {
        const startTime = new Date(request.start_time);
        const endTime = new Date();
        const hoursDiff = Math.max(1, Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)));
        const hourlyRate = parseFloat(request.parking_space.hourly_rate);
        const totalAmount = hourlyRate * hoursDiff;
        
        updateData = {
          status: 'ended',
          end_time: endTime.toISOString(),
          total_amount: totalAmount
        };
        successMessage = 'Parking has been ended';
      }
      
      const { data: updatedRequest, error: updateError } = await supabase
        .from('parking_requests')
        .update(updateData)
        .eq('id', request.id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      setParkingRequests(parkingRequests.map(req => 
        req.id === request.id ? {...req, ...updateData} : req
      ));
      
      toast({
        title: "Success",
        description: successMessage
      });
      
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error processing request:', error);
      toast({
        title: "Action Failed",
        description: "Failed to process the request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string, text: string, icon: JSX.Element }> = {
      'pending': { 
        color: 'bg-yellow-100 text-yellow-800 border border-yellow-200', 
        text: 'Pending Approval',
        icon: <Clock className="h-3 w-3" />
      },
      'active': { 
        color: 'bg-green-100 text-green-800 border border-green-200', 
        text: 'Currently Parking',
        icon: <Car className="h-3 w-3" />
      },
      'end_requested': { 
        color: 'bg-blue-100 text-blue-800 border border-blue-200', 
        text: 'End Requested',
        icon: <Clock className="h-3 w-3" />
      },
      'completed': { 
        color: 'bg-gray-100 text-gray-800 border border-gray-200', 
        text: 'Completed',
        icon: <CheckCircle className="h-3 w-3" />
      },
      'cancelled': { 
        color: 'bg-red-100 text-red-800 border border-red-200', 
        text: 'Cancelled',
        icon: <XCircle className="h-3 w-3" />
      },
      'ended': { 
        color: 'bg-purple-100 text-purple-800 border border-purple-200', 
        text: 'Ended (Payment Due)',
        icon: <DollarSign className="h-3 w-3" />
      }
    };

    const style = statusMap[status] || { 
      color: 'bg-gray-100 text-gray-800 border border-gray-200', 
      text: status,
      icon: <Clock className="h-3 w-3" />
    };
    
    return (
      <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit ${style.color}`}>
        {style.icon}
        {style.text}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-10 w-10 bg-primary/20 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-primary/10 rounded mb-3"></div>
            <div className="h-3 w-24 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-500">Please sign in to view your dashboard</p>
          <Button className="mt-4" onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-primary text-white p-4 shadow-md">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)} 
                className="text-white hover:bg-white/10"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Owner Dashboard</h1>
              </div>
            </div>
            <Logo size="sm" showText={false} className="ml-auto" />
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-md transition-all border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <div className="bg-primary/10 rounded-full p-2">
                  <ParkingCircle className="h-5 w-5 text-primary" />
                </div>
                Parking Spaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-800">{parkingStats.totalSpaces}</p>
              <p className="text-sm text-muted-foreground">Total spaces you manage</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-all border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <div className="bg-primary/10 rounded-full p-2">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                Active Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-800">{parkingStats.activeRequests}</p>
              <p className="text-sm text-muted-foreground">Currently active parking requests</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-all border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <div className="bg-primary/10 rounded-full p-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-800">UGX {parkingStats.totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Revenue from all parking spaces</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Parking Requests
          </h2>
          {parkingRequests.length > 0 && (
            <div className="text-sm text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
              {parkingRequests.length} requests
            </div>
          )}
        </div>
        
        {parkingRequests.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="mx-auto bg-muted rounded-full flex items-center justify-center w-16 h-16 mb-6">
                <Car className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-gray-600 mb-2">No Parking Requests</p>
              <p className="text-muted-foreground max-w-md mx-auto">You don't have any parking requests yet. Once you receive requests, they will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Parking Space</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parkingRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium text-gray-900">{request.parking_space?.name}</div>
                        <div className="text-sm text-muted-foreground">{request.parking_space?.address}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{request.user?.email || 'Unknown User'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.start_time ? (
                          <div className="text-sm font-medium">
                            {request.end_time ? (
                              `${Math.round((new Date(request.end_time).getTime() - new Date(request.start_time).getTime()) / (1000 * 60 * 60))} hours`
                            ) : (
                              'In progress'
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">-</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleRequestAction('approve', request)}
                              disabled={isProcessing}
                              className="h-8 rounded-full"
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRequestAction('deny', request)}
                              disabled={isProcessing}
                              className="h-8 rounded-full"
                            >
                              Deny
                            </Button>
                          </div>
                        )}
                        
                        {request.status === 'end_requested' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleRequestAction('end', request)}
                            disabled={isProcessing}
                            className="h-8 rounded-full"
                          >
                            End Parking
                          </Button>
                        )}
                        
                        {request.status === 'ended' && !request.is_paid && (
                          <span className="flex items-center text-yellow-600 text-sm">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Awaiting payment (UGX {parseFloat(request.total_amount).toFixed(2)})
                          </span>
                        )}
                        
                        {request.is_paid && (
                          <span className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Paid
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;

