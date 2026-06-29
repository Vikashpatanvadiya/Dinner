import { Link, useLocation } from "wouter";
import { Users, Utensils, Receipt, QrCode, BarChart3, LogOut } from "lucide-react";
import { removeAuthToken, removeRestaurantId } from "@/lib/auth";
import { useLogoutRestaurant } from "@api-client";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useLogoutRestaurant();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        removeAuthToken();
        removeRestaurantId();
        setLocation("/");
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Queue", icon: Users },
    { href: "/dashboard/menu", label: "Menu", icon: Utensils },
    { href: "/dashboard/orders", label: "Orders", icon: Receipt },
    { href: "/dashboard/qr", label: "QR Code", icon: QrCode },
    { href: "/dashboard/stats", label: "Stats", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
          </Link>
          {/* Add mobile menu if needed, keeping simple for now */}
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
