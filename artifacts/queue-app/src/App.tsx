import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import RestaurantQueue from "@/pages/Restaurant";
import QueueTracker from "@/pages/QueueTracker";
import Dashboard from "@/pages/Dashboard";
import Menu from "@/pages/Menu";
import Orders from "@/pages/Orders";
import QR from "@/pages/QR";
import Stats from "@/pages/Stats";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/restaurant/login" component={Login} />
      <Route path="/restaurant/signup" component={Signup} />
      <Route path="/restaurant/:id" component={RestaurantQueue} />
      <Route path="/queue/:sessionToken" component={QueueTracker} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/menu" component={Menu} />
      <Route path="/dashboard/orders" component={Orders} />
      <Route path="/dashboard/qr" component={QR} />
      <Route path="/dashboard/stats" component={Stats} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;