import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Car, DollarSign, User, Wallet, Plus, Check, X, ArrowLeft, LayoutDashboard } from 'lucide-react';
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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Wallet {
  id?: string;
  user_id: string;
  balance: number;
}

interface ParkingRequest {
  id: string;
  created_at: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  total_amount: number | null;
  is_paid: boolean;
  parking_space: {
    id: string;
    name: string;
    address: string;
    hourly_rate: number;
  } | null;
}

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<ParkingRequest[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [amountToAdd, setAmountToAdd] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      const { data: requestsData, error: requestsError } = await supabase
        .from('parking_requests')
        .select('*, parking_space:parking_spaces(id, name, address, hourly_rate)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (requestsError) throw requestsError;
      
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (walletError) throw walletError;
      
      setRequests(requestsData || []);
      setWallet(walletData || null);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFunds = async () => {
    if (!user || !amountToAdd || isNaN(Number(amountToAdd)) || Number(amountToAdd) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessingPayment(true);
      
      const amount = Number(amountToAdd);
      let operation;
      let newBalance;
      
      if (wallet) {
        newBalance = wallet.balance + amount;
        
        operation = supabase
          .from('user_wallets')
          .update({ balance: newBalance })
          .eq('user_id', user.id)
          .select();
      } 
      else {
        newBalance = amount;
        
        operation = supabase
          .from('user_wallets')
          .insert({ user_id: user.id, balance: amount })
          .select();
      }
      
      const { data, error } = await operation;
      
      if (error) throw error;
      
      setWallet(data && data.length > 0 ? data[0] : { user_id: user.id, balance: newBalance });
      
      toast({
        title: "Funds Added",
        description: `UGX ${amount.toFixed(2)} has been added to your wallet.`
      });
      
      setIsAddFundsOpen(false);
      setAmountToAdd('');
    } catch (error) {
      console.error('Error adding funds:', error);
      toast({
        title: "Transaction Failed",
        description: "Failed to add funds. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayForParking = async (request: ParkingRequest) => {
    if (!user || !wallet || !request.total_amount) return;
    
    try {
      setIsProcessingPayment(true);
      
      const totalAmount = request.total_amount;
      const currentBalance = wallet.balance;
      
      if (currentBalance < totalAmount) {
        toast({
          title: "Insufficient Funds",
          description: "Please add more funds to your wallet.",
          variant: "destructive"
        });
        return;
      }
      
      const newBalance = currentBalance - totalAmount;
      
      if (wallet.id) {
        const { error: walletError } = await supabase
          .from('user_wallets')
          .update({ balance: newBalance })
          .eq('user_id', user.id);
        
        if (walletError) throw walletError;
        
        setWallet({ ...wallet, balance: newBalance });
      }
      
      const { data: updatedRequest, error: requestError } = await supabase
        .from('parking_requests')
        .update({ is_paid: true })
        .eq('id', request.id)
        .select('*, parking_space:parking_spaces(id, name, address, hourly_rate)')
        .single();
      
      if (requestError) throw requestError;
      
      setRequests(requests.map(req => 
        req.id === request.id ? updatedRequest : req
      ));
      
      toast({
        title: "Payment Successful",
        description: `You have paid UGX ${totalAmount.toFixed(2)} for parking at ${request.parking_space?.name}.`
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        icon: <Check className="h-3 w-3" />
      },
      'cancelled': { 
        color: 'bg-red-100 text-red-800 border border-red-200', 
        text: 'Cancelled',
        icon: <X className="h-3 w-3" />
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

  const handleEndParking = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('parking_requests')
        .update({ status: 'end_requested' })
        .eq('id', requestId)
        .select('*, parking_space:parking_spaces(id, name, address, hourly_rate)')
        .single();
      
      if (error) throw error;
      
      setRequests(requests.map(req => 
        req.id === requestId ? data : req
      ));
      
      toast({
        title: "End Requested",
        description: "Parking space owner has been notified."
      });
    } catch (error) {
      console.error('Error ending parking:', error);
      toast({
        title: "Request Failed",
        description: "Failed to request parking end. Please try again.",
        variant: "destructive"
      });
    }
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
                <h1 className="text-2xl font-bold">User Dashboard</h1>
              </div>
            </div>
            <Logo size="sm" showText={false} className="ml-auto" />
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="col-span-1 md:col-span-2 hover:shadow-md transition-all border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <div className="bg-primary/10 rounded-full p-2">
                  <User className="h-5 w-5 text-primary" />
                </div>
                Welcome
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-gray-800">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">Manage your parking requests and payments</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-all border-none">
            <CardHeader className="pb-2 flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  Wallet Balance
                </CardTitle>
              </div>
              <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-1 h-8 rounded-full">
                    <Plus className="h-4 w-4" />
                    Add Funds
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Funds to Wallet</DialogTitle>
                    <DialogDescription>
                      Enter the amount you would like to add to your wallet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-6">
                    <Label htmlFor="amount" className="text-sm font-medium mb-2 block">Amount (UGX)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amountToAdd}
                      onChange={(e) => setAmountToAdd(e.target.value)}
                      placeholder="Enter amount"
                      className="mt-1"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddFunds}
                      disabled={isProcessingPayment || !amountToAdd || Number(amountToAdd) <= 0}
                      className="w-full sm:w-auto"
                    >
                      {isProcessingPayment ? 'Processing...' : 'Add Funds'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-800">
                UGX {wallet ? wallet.balance.toFixed(2) : '0.00'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Available balance for payments</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Your Parking Requests
          </h2>
          {requests.length > 0 && (
            <div className="text-sm text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
              {requests.length} requests
            </div>
          )}
        </div>
        
        {requests.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="mx-auto bg-muted rounded-full flex items-center justify-center w-16 h-16 mb-6">
                <Car className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-gray-600 mb-2">No Parking Requests</p>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">You don't have any parking requests yet. Start by finding a parking space.</p>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline" 
                className="rounded-full"
              >
                <Car className="h-4 w-4 mr-2" />
                Find Parking Spaces
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Parking Space</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium text-gray-900">{request.parking_space?.name}</div>
                        <div className="text-sm text-muted-foreground">{request.parking_space?.address}</div>
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
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        {request.start_time && (
                          <div className="text-sm">
                            <div className="font-medium text-gray-800">Start: {formatDate(request.start_time)}</div>
                            {request.end_time && <div className="font-medium text-gray-800">End: {formatDate(request.end_time)}</div>}
                          </div>
                        )}
                        
                        {request.total_amount !== null && (
                          <div className="mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary-600">
                            <DollarSign className="h-3 w-3 mr-1" />
                            UGX {request.total_amount.toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {request.status === 'active' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleEndParking(request.id)}
                            className="bg-blue-600 hover:bg-blue-700 h-8 rounded-full"
                          >
                            End Parking
                          </Button>
                        )}
                        
                        {request.status === 'ended' && !request.is_paid && (
                          <Button 
                            size="sm" 
                            onClick={() => handlePayForParking(request)}
                            disabled={isProcessingPayment || !wallet || wallet.balance < (request.total_amount || 0)}
                            className="h-8 rounded-full"
                          >
                            Pay Now
                          </Button>
                        )}
                        
                        {request.is_paid && (
                          <span className="flex items-center text-green-600 text-sm">
                            <Check className="h-4 w-4 mr-1" />
                            Paid
                          </span>
                        )}
                        
                        {(request.status === 'pending' || request.status === 'cancelled') && (
                          <span className="text-sm text-gray-500">-</span>
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

export default UserDashboard;
