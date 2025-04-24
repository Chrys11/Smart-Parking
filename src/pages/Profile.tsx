import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import Logo from '@/components/Logo';
import UserProfile from '@/components/UserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LogOut, User, Car, ParkingCircle, Settings, Wallet, Clock, 
  CreditCard, ArrowRight, Plus, Phone, CheckCircle, XCircle, 
  BarChart3, MapPin, Shield, Bell, HelpCircle, UserCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type PaymentMethod = {
  id: string;
  type: 'card' | 'mobile';
  details: string;
  isDefault: boolean;
};

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<string | null>(null);
  const [hasOwnedParkingSpaces, setHasOwnedParkingSpaces] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'mobile'>('card');
  const [activeTab, setActiveTab] = useState("overview");

  const cardSchema = z.object({
    cardNumber: z.string().min(16, "Card number must be at least 16 digits"),
    cardName: z.string().min(2, "Cardholder name is required"),
    expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, "Expiry date must be in MM/YY format"),
    cvv: z.string().min(3, "CVV must be at least 3 digits"),
  });

  const mobileSchema = z.object({
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    provider: z.string().min(1, "Provider is required"),
  });

  const formSchema = paymentMethodType === 'card' ? cardSchema : mobileSchema;

  const form = useForm<z.infer<typeof cardSchema> | z.infer<typeof mobileSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: paymentMethodType === 'card' 
      ? { cardNumber: '', cardName: '', expiryDate: '', cvv: '' }
      : { phoneNumber: '', provider: '' },
  });

  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) return;
      
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
      if (!user) return;
      
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

  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_wallets')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setWalletBalance(data[0].balance);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }
    };
    
    fetchWalletBalance();
  }, [user]);

  const handleAddPaymentMethod = (values: any) => {
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: paymentMethodType,
      details: paymentMethodType === 'card' 
        ? `**** **** **** ${values.cardNumber.slice(-4)}` 
        : `${values.provider}: ${values.phoneNumber}`,
      isDefault: paymentMethods.length === 0,
    };

    setPaymentMethods([...paymentMethods, newMethod]);
    setAddingPaymentMethod(false);
    
    toast({
      title: "Payment method added",
      description: "Your payment method has been added successfully",
    });
    
    form.reset();
  };

  const setDefaultPaymentMethod = (id: string) => {
    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id
    }));
    setPaymentMethods(updatedMethods);
    
    toast({
      title: "Default payment method updated",
    });
  };

  const removePaymentMethod = (id: string) => {
    const updatedMethods = paymentMethods.filter(method => method.id !== id);
    
    if (paymentMethods.find(m => m.id === id)?.isDefault && updatedMethods.length > 0) {
      updatedMethods[0].isDefault = true;
    }
    
    setPaymentMethods(updatedMethods);
    
    toast({
      title: "Payment method removed",
    });
  };

  const handlePaymentTypeChange = (type: 'card' | 'mobile') => {
    setPaymentMethodType(type);
    form.reset(
      type === 'card' 
        ? { cardNumber: '', cardName: '', expiryDate: '', cvv: '' }
        : { phoneNumber: '', provider: '' }
    );
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  const menuItems = [
    { id: "overview", label: "Overview", icon: <UserCircle className="h-5 w-5" /> },
    { id: "wallet", label: "Wallet & Payments", icon: <Wallet className="h-5 w-5" /> },
    { id: "activity", label: "Activity", icon: <Clock className="h-5 w-5" /> },
    { id: "security", label: "Security", icon: <Shield className="h-5 w-5" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-5 w-5" /> },
    { id: "help", label: "Help & Support", icon: <HelpCircle className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-500 to-primary-400 text-white p-6 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">My Profile</h1>
            <p className="text-white/80 text-sm">Manage your account settings and preferences</p>
          </div>
          <Logo size="md" className="hidden md:flex" />
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          <div className="lg:col-span-1">
            <UserProfile />
            
            <Card className="mt-6 border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <nav className="flex flex-col">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 border-l-2 ${
                        activeTab === item.id
                          ? "border-primary text-primary font-medium bg-primary/5"
                          : "border-transparent"
                      }`}
                      onClick={() => setActiveTab(item.id)}
                    >
                      <span className={activeTab === item.id ? "text-primary" : "text-gray-500"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle>Dashboards</CardTitle>
                <CardDescription>Quick access to your dashboards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <Card className="bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow border border-gray-100">
                    <Link to="/dashboard" className="block p-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-500/10 p-3 rounded-full">
                          <BarChart3 className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">User Dashboard</h3>
                          <p className="text-gray-500 text-sm">Manage your parking requests and wallet</p>
                        </div>
                      </div>
                    </Link>
                  </Card>
                  
                  {(userType === 'parkowner' || hasOwnedParkingSpaces) && (
                    <Card className="bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow border border-gray-100">
                      <Link to="/owner" className="block p-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-green-500/10 p-3 rounded-full">
                            <MapPin className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Owner Dashboard</h3>
                            <p className="text-gray-500 text-sm">Manage your parking spaces and requests</p>
                          </div>
                        </div>
                      </Link>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle>Quick Access</CardTitle>
                <CardDescription>Frequently used features and tools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-100">
                        <div className="flex flex-col items-center justify-center p-4">
                          <Wallet className="h-6 w-6 text-primary mb-2" />
                          <span className="text-sm text-center">My Wallet</span>
                        </div>
                      </Card>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-white shadow-lg border-gray-200 p-0 overflow-hidden">
                      <div className="bg-gradient-to-br from-primary-100 to-primary-50 p-4">
                        <h3 className="font-medium text-lg text-gray-800">My Wallet</h3>
                        <p className="text-sm text-gray-600">Your current balance and transactions</p>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Current Balance</div>
                          <div className="text-2xl font-bold text-gray-900">${walletBalance ? (walletBalance / 100).toFixed(2) : '0.00'}</div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button size="sm" className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Add Funds
                          </Button>
                          <Button variant="outline" size="sm" className="w-full bg-white hover:bg-gray-50" asChild>
                            <Link to="/dashboard">
                              View Transaction History <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-100">
                        <div className="flex flex-col items-center justify-center p-4">
                          <Clock className="h-6 w-6 text-primary mb-2" />
                          <span className="text-sm text-center">Parking History</span>
                        </div>
                      </Card>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-white shadow-lg border-gray-200 p-0 overflow-hidden">
                      <div className="bg-gradient-to-br from-primary-100 to-primary-50 p-4">
                        <h3 className="font-medium text-lg text-gray-800">Parking History</h3>
                        <p className="text-sm text-gray-600">View your complete parking history</p>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                          <div className="text-sm text-gray-600">
                            View your complete parking history including active, past, and upcoming parking sessions.
                          </div>
                        </div>
                        <Button className="w-full" asChild>
                          <Link to="/dashboard">
                            View Full History <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-100">
                        <div className="flex flex-col items-center justify-center p-4">
                          <CreditCard className="h-6 w-6 text-primary mb-2" />
                          <span className="text-sm text-center">Payment Methods</span>
                        </div>
                      </Card>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-white shadow-lg border-gray-200 p-0 overflow-hidden">
                      <div className="bg-gradient-to-br from-primary-100 to-primary-50 p-4">
                        <h3 className="font-medium text-lg text-gray-800">Payment Methods</h3>
                        <p className="text-sm text-gray-600">Manage your payment options</p>
                      </div>
                      <div className="p-4 space-y-4">
                        {paymentMethods.length > 0 ? (
                          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 space-y-3">
                            {paymentMethods.map((method) => (
                              <div key={method.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                <div className="flex items-center gap-2">
                                  {method.type === 'card' ? (
                                    <CreditCard className="h-4 w-4 text-gray-600" />
                                  ) : (
                                    <Phone className="h-4 w-4 text-gray-600" />
                                  )}
                                  <span className="text-sm font-medium">{method.details}</span>
                                  {method.isDefault && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {!method.isDefault && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 w-8 p-0" 
                                      onClick={() => setDefaultPaymentMethod(method.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0" 
                                    onClick={() => removePaymentMethod(method.id)}
                                  >
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600">No payment methods added yet.</p>
                          </div>
                        )}
                        
                        {addingPaymentMethod ? (
                          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                            <div className="flex justify-between mb-4">
                              <h4 className="font-medium text-gray-800">Add Payment Method</h4>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0" 
                                onClick={() => setAddingPaymentMethod(false)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="flex gap-2 mb-4">
                              <Button 
                                size="sm" 
                                variant={paymentMethodType === 'card' ? 'default' : 'outline'} 
                                className="flex-1"
                                onClick={() => handlePaymentTypeChange('card')}
                              >
                                <CreditCard className="mr-1 h-4 w-4" />
                                Card
                              </Button>
                              <Button 
                                size="sm" 
                                variant={paymentMethodType === 'mobile' ? 'default' : 'outline'} 
                                className="flex-1"
                                onClick={() => handlePaymentTypeChange('mobile')}
                              >
                                <Phone className="mr-1 h-4 w-4" />
                                Mobile Money
                              </Button>
                            </div>
                            
                            <Form {...form}>
                              <form onSubmit={form.handleSubmit(handleAddPaymentMethod)} className="space-y-3">
                                {paymentMethodType === 'card' ? (
                                  <>
                                    <FormField
                                      control={form.control}
                                      name="cardNumber"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Card Number</FormLabel>
                                          <FormControl>
                                            <Input placeholder="1234 5678 9012 3456" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="cardName"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Cardholder Name</FormLabel>
                                          <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <FormField
                                        control={form.control}
                                        name="expiryDate"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">Expiry Date</FormLabel>
                                            <FormControl>
                                              <Input placeholder="MM/YY" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name="cvv"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">CVV</FormLabel>
                                            <FormControl>
                                              <Input placeholder="123" type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <FormField
                                      control={form.control}
                                      name="phoneNumber"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Phone Number</FormLabel>
                                          <FormControl>
                                            <Input placeholder="+256 700000000" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="provider"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Provider</FormLabel>
                                          <FormControl>
                                            <Select
                                              onValueChange={field.onChange}
                                              defaultValue={field.value}
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select provider" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                                                <SelectItem value="airtel">Airtel Money</SelectItem>
                                                <SelectItem value="lyca">Lycamobile</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </>
                                )}
                                <Button type="submit" className="w-full mt-2">Save Payment Method</Button>
                              </form>
                            </Form>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setAddingPaymentMethod(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Payment Method
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-100">
                        <div className="flex flex-col items-center justify-center p-4">
                          <Settings className="h-6 w-6 text-primary mb-2" />
                          <span className="text-sm text-center">Settings</span>
                        </div>
                      </Card>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-white shadow-lg border-gray-200 p-0 overflow-hidden">
                      <div className="bg-gradient-to-br from-primary-100 to-primary-50 p-4">
                        <h3 className="font-medium text-lg text-gray-800">Account Settings</h3>
                        <p className="text-sm text-gray-600">Manage your account preferences</p>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Email</span>
                              <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{user.email}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Account Type</span>
                              <span className="text-sm font-medium text-gray-800">
                                {userType === 'parkowner' ? 'Parking Owner' : 'Regular User'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2">
                          <Button variant="outline" size="sm" className="w-full bg-white hover:bg-gray-50">
                            Update Profile
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
