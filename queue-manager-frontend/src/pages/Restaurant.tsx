import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetRestaurant, useJoinQueue } from "@api-client";
import { setSessionToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Users, Utensils } from "lucide-react";

const joinQueueSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  partySize: z.coerce.number().min(1, "Party size must be at least 1"),
});

export default function RestaurantQueue() {
  const params = useParams();
  const restaurantId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: restaurant, isLoading } = useGetRestaurant(restaurantId);
  const joinQueueMutation = useJoinQueue();

  const form = useForm<z.infer<typeof joinQueueSchema>>({
    resolver: zodResolver(joinQueueSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      partySize: 2,
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!restaurant) {
    return <div className="min-h-screen flex items-center justify-center">Restaurant not found</div>;
  }

  function onSubmit(values: z.infer<typeof joinQueueSchema>) {
    joinQueueMutation.mutate(
      { restaurantId, data: values },
      {
        onSuccess: (data) => {
          setSessionToken(data.sessionToken);
          setLocation(`/queue/${data.sessionToken}`);
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Failed to join queue",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Hero Image */}
      {restaurant.photo ? (
        <div className="h-64 w-full relative">
          <img src={restaurant.photo} alt={restaurant.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      ) : (
        <div className="h-48 w-full bg-muted flex items-center justify-center">
          <Utensils className="h-16 w-16 text-muted-foreground/30" />
        </div>
      )}

      <main className="flex-1 container max-w-md mx-auto px-4 -mt-16 relative z-10 pb-8">
        <Card className="shadow-lg border-muted">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2">{restaurant.name}</h1>
              <p className="text-muted-foreground mb-4">{restaurant.cuisineType}</p>
              
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{restaurant.address}</span>
                </div>
              </div>
            </div>

            {restaurant.queueOpen ? (
              <div className="bg-muted rounded-xl p-4 mb-8 flex justify-around text-center divide-x border">
                <div className="px-2">
                  <div className="text-3xl font-bold text-primary mb-1">{restaurant.queueLength}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center justify-center">
                    <Users className="h-3 w-3 mr-1" />
                    In Line
                  </div>
                </div>
                <div className="px-2">
                  <div className="text-3xl font-bold text-primary mb-1">{restaurant.estimatedWaitMins}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center justify-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Est. Mins
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-destructive/10 text-destructive rounded-xl p-4 mb-8 text-center font-bold border border-destructive/20">
                The queue is currently closed.
              </div>
            )}

            {restaurant.queueOpen && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(555) 123-4567" {...field} className="h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="partySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party Size</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={20} {...field} className="h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-bold mt-6" 
                    disabled={joinQueueMutation.isPending}
                  >
                    {joinQueueMutation.isPending ? "Joining..." : "Join Queue"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
