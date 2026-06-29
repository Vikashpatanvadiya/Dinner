import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  useListRestaurantOrders,
  useUpdateOrderStatus
} from "@workspace/api-client-react";
import { getRestaurantId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChefHat, CheckCircle2, Clock, DollarSign, ReceiptText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Orders() {
  const [, setLocation] = useLocation();
  const restaurantId = getRestaurantId();

  if (!restaurantId) {
    setLocation("/restaurant/login");
    return null;
  }

  const { data: orders, refetch } = useListRestaurantOrders(restaurantId, {
    query: { refetchInterval: 5000 }
  });

  const updateStatusMutation = useUpdateOrderStatus();

  const handleUpdateStatus = (orderId: number, newStatus: 'placed' | 'preparing' | 'ready' | 'served') => {
    updateStatusMutation.mutate(
      { orderId, data: { status: newStatus } },
      { onSuccess: () => refetch() }
    );
  };

  const handleMarkPaid = (orderId: number) => {
    updateStatusMutation.mutate(
      // Keep current status, just update payment
      { orderId, data: { status: 'served', paymentStatus: 'paid_cash' } }, // Requires status per schema, use served if paid
      { onSuccess: () => refetch() }
    );
  };

  const activeOrders = orders?.filter(o => o.status !== 'served') || [];
  const completedOrders = orders?.filter(o => o.status === 'served') || [];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'placed': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">New</Badge>;
      case 'preparing': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 animate-pulse">Preparing</Badge>;
      case 'ready': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ready</Badge>;
      case 'served': return <Badge variant="secondary">Served</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pre-Orders</h1>
        <p className="text-muted-foreground">Manage incoming food orders from customers in the queue.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Active Orders Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-xl flex items-center gap-2 mb-4">
            <ChefHat className="h-5 w-5" /> Kitchen Tickets
            <Badge variant="secondary" className="ml-2">{activeOrders.length}</Badge>
          </h2>

          {activeOrders.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-12 text-center text-muted-foreground">
                <ReceiptText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No active pre-orders right now.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeOrders.map(order => (
                <Card key={order.id} className={`border-l-4 shadow-sm ${
                  order.status === 'placed' ? 'border-l-yellow-400' : 
                  order.status === 'preparing' ? 'border-l-blue-400 bg-blue-50/10' : 
                  'border-l-green-400 bg-green-50/10'
                }`}>
                  <CardHeader className="pb-3 px-4 pt-4 border-b">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-mono font-bold text-lg">#{order.queueNumber}</div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{order.customerName}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(order.createdAt))}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 space-y-2 bg-muted/5">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-start text-sm font-medium">
                          <span><span className="text-muted-foreground font-mono mr-2">{item.qty}x</span> {item.name}</span>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="p-4 flex gap-2">
                      {order.status === 'placed' && (
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'preparing')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Start Preparing
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700 text-white" 
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'ready')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Mark Ready
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <Button 
                          className="w-full" 
                          size="sm" variant="outline"
                          onClick={() => handleUpdateStatus(order.id, 'served')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Mark Served
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Served / Payment Collection */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5" /> Pending Payment
          </h2>

          <div className="space-y-3">
            {orders?.filter(o => o.paymentStatus === 'pending').map(order => (
              <Card key={`pay-${order.id}`} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold">#{order.queueNumber} - {order.customerName}</span>
                    <span className="font-mono font-bold text-lg text-primary">${order.totalAmount.toFixed(2)}</span>
                  </div>
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => handleMarkPaid(order.id)}
                    disabled={updateStatusMutation.isPending}
                  >
                    Mark Paid
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {orders?.filter(o => o.paymentStatus === 'pending').length === 0 && (
              <div className="text-center p-6 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                All completed orders are paid.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}