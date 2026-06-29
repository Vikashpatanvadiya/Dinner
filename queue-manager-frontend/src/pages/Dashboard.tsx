import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  useGetRestaurantQueue, 
  useCallQueueEntry, 
  useSeatQueueEntry, 
  useRemoveQueueEntry,
  useGetMe,
  useUpdateRestaurantSettings
} from "@api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Phone, Users, Clock, Coffee, Bell, Check, X, Search } from "lucide-react";
import { getRestaurantId } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const restaurantId = getRestaurantId();
  const [search, setSearch] = useState("");

  // Redirect if no auth
  if (!restaurantId) {
    setLocation("/restaurant/login");
    return null;
  }

  const { data: restaurant } = useGetMe();
  const { data: queue } = useGetRestaurantQueue(restaurantId, {
    query: { refetchInterval: 5000 }
  });

  const callMutation = useCallQueueEntry();
  const seatMutation = useSeatQueueEntry();
  const removeMutation = useRemoveQueueEntry();
  const updateSettingsMutation = useUpdateRestaurantSettings();

  const handleToggleQueue = (checked: boolean) => {
    updateSettingsMutation.mutate({
      restaurantId,
      data: { queueOpen: checked }
    });
  };

  const handleCall = (entryId: number) => callMutation.mutate({ entryId });
  const handleSeat = (entryId: number) => seatMutation.mutate({ entryId });
  const handleRemove = (entryId: number) => {
    if (confirm("Remove this customer from the queue?")) {
      removeMutation.mutate({ entryId });
    }
  };

  const activeQueue = useMemo(() => {
    if (!queue) return [];
    let filtered = queue.filter(q => q.status === 'waiting' || q.status === 'called');
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(q => 
        q.customerName.toLowerCase().includes(s) || 
        q.queueNumber.toString().includes(s) ||
        q.customerPhone.includes(s)
      );
    }
    return filtered;
  }, [queue, search]);

  const waitingCount = queue?.filter(q => q.status === 'waiting' || q.status === 'called').length || 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue Management</h1>
          <p className="text-muted-foreground">Manage your live queue and seat customers.</p>
        </div>
        
        <Card className="w-full md:w-auto shrink-0 shadow-sm border-primary/20">
          <CardContent className="p-4 flex items-center justify-between gap-6">
            <div>
              <p className="font-medium">Queue Status</p>
              <p className="text-sm text-muted-foreground">
                {restaurant?.queueOpen ? 'Accepting customers' : 'Closed for new entries'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={restaurant?.queueOpen} 
                onCheckedChange={handleToggleQueue} 
                disabled={updateSettingsMutation.isPending}
              />
              <Label>{restaurant?.queueOpen ? 'Open' : 'Closed'}</Label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Users className="h-8 w-8 text-primary mb-2" />
            <div className="text-3xl font-bold">{waitingCount}</div>
            <p className="text-sm text-muted-foreground">Currently Waiting</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Clock className="h-8 w-8 text-primary mb-2" />
            <div className="text-3xl font-bold">{restaurant?.avgWaitPerTableMins || 0}m</div>
            <p className="text-sm text-muted-foreground">Avg Wait / Table</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground border-primary">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <h3 className="font-bold text-lg mb-2">Next Action</h3>
            {activeQueue.length > 0 ? (
              <Button 
                variant="secondary" 
                size="lg" 
                className="w-full"
                onClick={() => activeQueue[0].status === 'waiting' ? handleCall(activeQueue[0].id) : handleSeat(activeQueue[0].id)}
              >
                {activeQueue[0].status === 'waiting' ? 'Call Next Customer' : 'Seat Next Customer'}
              </Button>
            ) : (
              <p className="opacity-80">Queue is empty</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Live Queue
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search name or number..." 
              className="pl-9 h-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y">
          {activeQueue.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? "No matches found." : "The queue is currently empty."}
            </div>
          ) : (
            activeQueue.map((entry, index) => (
              <div key={entry.id} className={`p-4 flex flex-col lg:flex-row items-center justify-between gap-4 transition-colors hover:bg-muted/50 ${entry.status === 'called' ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center font-mono text-2xl font-bold shadow-sm ${entry.status === 'called' ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-background border'}`}>
                    {entry.queueNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{entry.customerName}</h3>
                      {entry.status === 'called' && (
                        <Badge variant="default" className="bg-primary">CALLED</Badge>
                      )}
                      {index === 0 && entry.status === 'waiting' && (
                        <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-50">UP NEXT</Badge>
                      )}
                      {entry.orderId && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Coffee className="h-3 w-3" /> Pre-ordered
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Party of {entry.partySize}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {entry.customerPhone}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(entry.joinedAt))} ago</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 mt-2 lg:mt-0">
                  {entry.status === 'waiting' ? (
                    <Button 
                      onClick={() => handleCall(entry.id)} 
                      disabled={callMutation.isPending}
                      className="flex-1 lg:flex-none"
                    >
                      <Bell className="h-4 w-4 mr-2" /> Call
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSeat(entry.id)} 
                      disabled={seatMutation.isPending}
                      variant="default"
                      className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-2" /> Seat
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(entry.id)}
                    disabled={removeMutation.isPending}
                    title="Remove from queue"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}