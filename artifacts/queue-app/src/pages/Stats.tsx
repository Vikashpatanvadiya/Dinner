import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useGetRestaurantStats } from "@workspace/api-client-react";
import { getRestaurantId } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, Receipt, DollarSign, TrendingUp } from "lucide-react";

export default function Stats() {
  const [, setLocation] = useLocation();
  const restaurantId = getRestaurantId();

  if (!restaurantId) {
    setLocation("/restaurant/login");
    return null;
  }

  const { data: stats, isLoading } = useGetRestaurantStats(restaurantId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Today's Dashboard</h1>
          <div className="h-4 w-48 bg-muted animate-pulse mt-2 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Today's Dashboard</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Live metrics for today
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers Served</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.customersServedToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">parties seated today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.avgWaitMins || 0}m</div>
            <p className="text-xs text-muted-foreground mt-1">from join to seat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pre-Orders</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalOrdersToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">orders placed in queue</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pre-Order Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">${(stats?.totalRevenueToday || 0).toFixed(2)}</div>
            <p className="text-xs text-primary/80 mt-1">captured before seating</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}