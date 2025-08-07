import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { preloadOnHover } from "@/utils/routePreloader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingBag,
  Brush,
  Factory,
  Users,
  MessageSquare,
  CreditCard,
  BarChart,
  Settings,
  Shirt,
  ChevronDown,
  Menu,
  X,
  Mail,
  FileText,
  PlusCircle,
  Scale,
  Package,
  Shield,
  TrendingUp
} from "lucide-react";

// Navigation items for different roles
const navigationItems = {
  admin: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Order Management", href: "/orders", icon: ShoppingBag },
    { name: "Catalog", href: "/catalog", icon: Package },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Manufacturing", href: "/manufacturing", icon: Factory },
    { name: "Sales Management", href: "/admin/sales-management", icon: TrendingUp },
    { name: "Customer Invites", href: "/admin/invites", icon: Mail },
    { name: "Order Inquiries", href: "/admin/inquiries", icon: FileText },
    { name: "User Permissions", href: "/admin/user-permissions", icon: Shield },
    { name: "Custom Permissions", href: "/admin/custom-permissions", icon: Settings },
    { name: "Task Assignment", href: "/tasks", icon: Brush },
    { name: "Legal Management", href: "/admin/legal", icon: Scale },
    { name: "Reports", href: "/reports", icon: BarChart },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ],
  salesperson: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Order Management", href: "/orders", icon: ShoppingBag },
    { name: "Catalog", href: "/catalog", icon: Package },
    { name: "Customer Invites", href: "/admin/invites", icon: Mail },
    { name: "Order Inquiries", href: "/admin/inquiries", icon: FileText },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Messages", href: "/messages", icon: MessageSquare },
  ],
  designer: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Design Tasks", href: "/design-tasks", icon: Brush },
    { name: "File Uploads", href: "/uploads", icon: Brush },
    { name: "Messages", href: "/messages", icon: MessageSquare },
  ],
  manufacturer: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Production Orders", href: "/production", icon: Factory },
    { name: "Order Status", href: "/order-status", icon: ShoppingBag },
    { name: "Messages", href: "/messages", icon: MessageSquare },
  ],
  customer: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Orders", href: "/orders", icon: Shirt },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Support", href: "/messages", icon: MessageSquare },
  ],
};

// Colors for different roles
const roleColors = {
  admin: "bg-indigo-600 hover:bg-indigo-700",
  salesperson: "bg-sky-600 hover:bg-sky-700",
  designer: "bg-pink-600 hover:bg-pink-700",
  manufacturer: "bg-amber-600 hover:bg-amber-700",
  customer: "bg-emerald-600 hover:bg-emerald-700",
};

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export function Sidebar({ mobileOpen = false, setMobileOpen = () => {} }: SidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const role = user?.role || 'customer';

  // Set if user is admin for role switching demo
  useEffect(() => {
    setIsAdmin(role === "admin");
  }, [role]);

  if (!user) return null;

  // Get navigation items for the current role
  const items = role && navigationItems[role as keyof typeof navigationItems] || [];
  const roleColor = role && roleColors[role as keyof typeof roleColors] || roleColors.customer;

  return (
    <>
      {/* Rich Habits mobile sidebar backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-90 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Rich Habits glassmorphism sidebar */}
      <aside 
        className={cn(
          "w-64 glass-panel border-r border-glass-border fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-glass-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 glass-panel neon-glow flex items-center justify-center">
              <Shirt className="h-5 w-5 text-neon-blue" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">RICH HABITS</span>
              <div className="subtitle text-neon-green text-xs">ThreadCraft</div>
            </div>
          </div>
          <button 
            className="md:hidden text-muted-foreground hover:text-neon-blue transition-colors" 
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="py-6">
          <div className="px-6 mb-4">
            <span className="subtitle text-neon-blue text-xs">Elite Navigation</span>
          </div>

          <nav className="space-y-2 px-3">
            {items.map((item: { 
              name: string; 
              href: string; 
              icon: React.ComponentType<{ className?: string }> 
            }) => (
              <Link href={item.href} key={item.name}>
                <a 
                  className={cn(
                    "flex items-center px-4 py-3 text-foreground hover:bg-glass-panel/50 group transition-all duration-200 mx-2",
                    location === item.href && "glass-panel neon-glow text-neon-blue"
                  )}
                  onMouseEnter={() => preloadOnHover(item.href)}
                >
                  <item.icon className={cn(
                    "w-5 h-5 mr-3 transition-colors",
                    location === item.href ? "text-neon-blue" : "text-muted-foreground group-hover:text-neon-green"
                  )} />
                  <span className={cn(
                    "subtitle text-sm",
                    location === item.href ? "text-neon-blue" : "text-foreground group-hover:text-neon-green"
                  )}>{item.name}</span>
                </a>
              </Link>
            ))}
          </nav>
        </div>

        {/* Rich Habits role switcher for demo (admin only) */}
        {isAdmin && (
          <div className="px-6 py-4 border-t border-glass-border">
            <div className="mb-4">
              <label htmlFor="role-selector" className="subtitle text-neon-green text-xs block mb-2">
                Admin Role Switch
              </label>
              <select 
                id="role-selector" 
                className="rich-input w-full text-sm py-2 px-3"
                onChange={(e) => {
                  // In a real app, this would be an API call to switch roles
                  console.log("Role switch:", e.target.value);
                }}
              >
                <option value="admin">Admin</option>
                <option value="salesperson">Salesperson</option>
                <option value="designer">Designer</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>
        )}

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", roleColor)}>
                {user.firstName && user.lastName 
                  ? `${user.firstName[0]}${user.lastName[0]}`
                  : (user.username || user.email).substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.username || user.email}
              </p>
              <p className="text-xs text-gray-400 capitalize">{role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        className="fixed bottom-4 right-4 z-40 md:hidden bg-gray-900 text-white p-3 rounded-full shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-6 w-6" />
      </button>
    </>
  );
}