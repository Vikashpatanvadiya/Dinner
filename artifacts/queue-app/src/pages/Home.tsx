import { useState } from "react";
import { Link } from "wouter";
import { useListRestaurants } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [filter, setFilter] = useState("");
  const { data: restaurants, isLoading } = useListRestaurants(filter ? { cuisine_type: filter } : undefined);

  const getStatusColor = (length: number) => {
    if (length === 0) return "bg-green-500/10 text-green-600 border-green-500/20";
    if (length <= 5) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    return "bg-red-500/10 text-red-600 border-red-500/20";
  };

  const getStatusText = (length: number) => {
    if (length === 0) return "No Wait";
    if (length <= 5) return "Moderate Wait";
    return "Long Wait";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold font-mono">Q</span>
            </div>
            <span className="text-xl font-bold">LineUp</span>
          </div>
          <Link href="/restaurant/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Restaurant Login
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Skip the waiting area.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join the queue from anywhere, pre-order your food, and walk right to your table.
          </p>
        </div>

        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            className="pl-10 h-12 text-base rounded-full bg-card shadow-sm border-muted"
            placeholder="Search by cuisine type (e.g. Italian, Sushi)" 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 rounded-xl bg-card border shadow-sm animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants?.map(restaurant => (
              <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer overflow-hidden flex flex-col group">
                  <CardContent className="p-0 flex flex-col h-full">
                    {restaurant.photo ? (
                      <div className="h-32 w-full bg-muted overflow-hidden relative">
                        <img src={restaurant.photo} alt={restaurant.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                        {!restaurant.queueOpen && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-white font-bold tracking-widest uppercase">CLOSED</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-muted flex items-center justify-center relative">
                        <Utensils className="h-10 w-10 text-muted-foreground/30" />
                        {!restaurant.queueOpen && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-white font-bold tracking-widest uppercase">CLOSED</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg line-clamp-1">{restaurant.name}</h3>
                          <p className="text-sm text-muted-foreground">{restaurant.cuisineType}</p>
                        </div>
                        {restaurant.queueOpen && (
                          <Badge variant="outline" className={getStatusColor(restaurant.queueLength)}>
                            {getStatusText(restaurant.queueLength)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-auto space-y-2 pt-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="line-clamp-1">{restaurant.address}</span>
                        </div>
                        
                        {restaurant.queueOpen && (
                          <div className="flex gap-4">
                            <div className="flex items-center text-sm font-medium">
                              <Users className="h-4 w-4 mr-2 text-primary" />
                              {restaurant.queueLength} in line
                            </div>
                            <div className="flex items-center text-sm font-medium">
                              <Clock className="h-4 w-4 mr-2 text-primary" />
                              ~{restaurant.estimatedWaitMins} min
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            
            {restaurants?.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                No restaurants found.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Need Utensils import
import { Utensils } from "lucide-react";