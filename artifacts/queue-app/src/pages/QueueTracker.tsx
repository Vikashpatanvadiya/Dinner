import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { 
  useGetQueueEntry, 
  useLeaveQueue, 
  useListMenuItems, 
  useCreateOrder,
  useGetOrder
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { removeSessionToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Clock, MapPin, Coffee, CheckCircle, ChevronLeft, Bell, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function QueueTracker() {
  const params = useParams();
  const sessionToken = params.sessionToken || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isPreorderOpen, setIsPreorderOpen] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});

  const { data: queueData, isLoading } = useGetQueueEntry(sessionToken, {
    query: {
      refetchInterval: 7000,
    }
  });

  const { data: menuItems } = useListMenuItems(queueData?.restaurant.id || 0, {
    query: {
      enabled: !!queueData?.restaurant.id,
    }
  });

  // If there's an active order, fetch its latest status
  const { data: orderData } = useGetOrder(queueData?.order?.id || 0, {
    query: {
      enabled: !!queueData?.order?.id,
      refetchInterval: 7000,
    }
  });

  const leaveQueueMutation = useLeaveQueue();
  const createOrderMutation = useCreateOrder();

  const handleLeaveQueue = () => {
    if (confirm("Are you sure you want to leave the queue?")) {
      leaveQueueMutation.mutate(
        { sessionToken },
        {
          onSuccess: () => {
            removeSessionToken();
            setLocation("/");
            toast({
              title: "Left Queue",
              description: "You have been removed from the queue.",
            });
          }
        }
      );
    }
  };

  const addToCart = (itemId: number) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[itemId] > 1) {
        next[itemId]--;
      } else {
        delete next[itemId];
      }
      return next;
    });
  };

  const cartTotal = Object.entries(cart).reduce((total, [itemId, qty]) => {
    const item = menuItems?.find(m => m.id === parseInt(itemId));
    return total + (item ? item.price * qty : 0);
  }, 0);

  const cartItemsCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const handlePreorder = () => {
    const items = Object.entries(cart).map(([menuItemId, qty]) => ({
      menuItemId: parseInt(menuItemId),
      qty
    }));

    createOrderMutation.mutate(
      { data: { sessionToken, items } },
      {
        onSuccess: () => {
          setIsPreorderOpen(false);
          setCart({});
          toast({
            title: "Order Placed",
            description: "Your food will be prepared while you wait.",
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Failed to place order",
          });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-background">Loading...</div>;
  }

  if (!queueData) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Queue Session Expired</h1>
        <p className="text-muted-foreground mb-8">This queue session is no longer active.</p>
        <Button onClick={() => setLocation("/")}>Return Home</Button>
      </div>
    );
  }

  const { entry, position, estimatedWaitMins, restaurant, canPreOrder } = queueData;
  const activeOrder = orderData || queueData.order;

  // Render different views based on status
  if (entry.status === 'seated') {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col p-4 max-w-md mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-bold">You're Seated!</h1>
          <p className="text-xl text-muted-foreground">Enjoy your meal at {restaurant.name}.</p>
          
          {activeOrder && (
            <Card className="w-full mt-8 border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg flex items-center justify-center mb-4">
                  <Receipt className="h-5 w-5 mr-2" /> Your Pre-Order Bill
                </h3>
                <div className="space-y-3 mb-6 text-left">
                  {activeOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.qty}x {item.name}</span>
                      <span>${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span>Total</span>
                    <span>${activeOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <Badge variant={activeOrder.paymentStatus !== 'pending' ? 'default' : 'secondary'} className="w-full py-2 justify-center text-sm">
                  Status: {activeOrder.paymentStatus.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          )}
          
          <Button variant="outline" className="mt-8" onClick={() => setLocation("/")}>
            View Other Restaurants
          </Button>
        </div>
      </div>
    );
  }

  if (entry.status === 'removed') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">You were removed from the queue</h1>
        <Button onClick={() => setLocation("/")} className="mt-4">Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between border-b bg-card">
        <div>
          <h2 className="font-bold text-lg">{restaurant.name}</h2>
          <div className="flex items-center text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="truncate max-w-[200px]">{restaurant.address}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLeaveQueue} className="text-muted-foreground">
          Leave
        </Button>
      </header>

      <main className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full items-center">
        
        {entry.status === 'called' ? (
          <div className="w-full animate-in fade-in zoom-in duration-500 flex flex-col items-center mt-12 mb-12">
            <div className="w-32 h-32 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Bell className="h-16 w-16" />
            </div>
            <h1 className="text-4xl font-bold text-center mb-2">It's your turn!</h1>
            <p className="text-xl text-center text-muted-foreground mb-8">Please head to the host stand.</p>
            <div className="bg-card border-2 border-primary rounded-3xl p-8 w-full text-center shadow-lg">
              <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2 font-bold">Your Number</p>
              <div className="text-8xl font-black text-primary font-mono tracking-tighter leading-none">
                #{entry.queueNumber}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-card border rounded-3xl p-8 w-full text-center shadow-sm mt-8 mb-8">
              <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2 font-bold">Your Number</p>
              <div className="text-7xl font-black font-mono tracking-tighter leading-none mb-6">
                #{entry.queueNumber}
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t pt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Position</p>
                  <div className="text-3xl font-bold flex items-center justify-center">
                    <Users className="h-6 w-6 mr-2 text-primary" />
                    {position}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Wait Time</p>
                  <div className="text-3xl font-bold flex items-center justify-center">
                    <Clock className="h-6 w-6 mr-2 text-primary" />
                    ~{estimatedWaitMins}m
                  </div>
                </div>
              </div>
            </div>

            {/* Pre-order Section */}
            {activeOrder ? (
              <Card className="w-full mb-8 border-primary/20 bg-primary/5">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-full">
                      <Coffee className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold">Order {activeOrder.status}</p>
                      <p className="text-sm text-muted-foreground">${activeOrder.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary text-primary">
                    {activeOrder.status.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            ) : canPreOrder && menuItems && menuItems.length > 0 ? (
              <Dialog open={isPreorderOpen} onOpenChange={setIsPreorderOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full h-16 text-lg rounded-xl mb-8 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Coffee className="mr-2 h-6 w-6" /> Pre-order Food Now
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md h-[90dvh] flex flex-col p-0 gap-0">
                  <DialogHeader className="p-4 border-b">
                    <DialogTitle>Pre-order Menu</DialogTitle>
                    <DialogDescription>
                      Order now and your food will be ready shortly after you are seated.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-auto p-4">
                    <div className="space-y-6">
                      {/* Group by category */}
                      {Array.from(new Set(menuItems.filter(m => m.isAvailable).map(m => m.category))).map(category => (
                        <div key={category}>
                          <h3 className="font-bold text-lg mb-3 sticky top-0 bg-background py-2 z-10">{category}</h3>
                          <div className="space-y-3">
                            {menuItems
                              .filter(m => m.category === category && m.isAvailable)
                              .map(item => (
                                <Card key={item.id} className="overflow-hidden">
                                  <div className="p-3 flex justify-between items-center">
                                    <div>
                                      <p className="font-medium">{item.name}</p>
                                      <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {cart[item.id] ? (
                                        <>
                                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => removeFromCart(item.id)}>-</Button>
                                          <span className="w-4 text-center font-medium">{cart[item.id]}</span>
                                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => addToCart(item.id)}>+</Button>
                                        </>
                                      ) : (
                                        <Button variant="outline" size="sm" onClick={() => addToCart(item.id)}>Add</Button>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {cartItemsCount > 0 && (
                    <div className="p-4 border-t bg-card">
                      <Button 
                        className="w-full h-12 text-lg" 
                        onClick={handlePreorder}
                        disabled={createOrderMutation.isPending}
                      >
                        {createOrderMutation.isPending ? "Placing Order..." : `Place Order • $${cartTotal.toFixed(2)}`}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            ) : (
              <div className="bg-muted rounded-xl p-4 text-center text-sm text-muted-foreground mb-8 border border-dashed">
                Pre-ordering will be available when you are closer to the front of the line.
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

// Needed imports
import { Receipt } from "lucide-react";