import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
  PlusCircle
} from "lucide-react";

// Navigation items for different roles
const navigationItems = {
  admin: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Orders", href: "/orders", icon: ShoppingBag },
    { name: "Customer Invites", href: "/admin/invites", icon: Mail },
    { name: "Order Inquiries", href: "/admin/inquiries", icon: FileText },
    { name: "Users", href: "/users", icon: Users },
    { name: "Task Assignment", href: "/tasks", icon: Brush },
    { name: "Reports", href: "/reports", icon: BarChart },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ],
  salesperson: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Orders", href: "/orders", icon: ShoppingBag },
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
  const { user, role } = useAuth();
  const [location] = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

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
      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-800 bg-opacity-70 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "w-64 bg-gray-900 text-white fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shirt className="h-6 w-6" />
            <span className="text-xl font-semibold">ThreadCraft</span>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-white" 
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="py-4">
          <div className="px-4 mb-3 text-gray-400 uppercase text-xs font-semibold">
            Navigation
          </div>

          <nav className="space-y-1">
            {items.map((item: { 
              name: string; 
              href: string; 
              icon: React.ComponentType<{ className?: string }> 
            }) => (
              <Link href={item.href} key={item.name}>
                <a 
                  className={cn(
                    "flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 group",
                    location === item.href && "bg-gray-800 text-white"
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.name}</span>
                </a>
              </Link>
            ))}
          </nav>
        </div>

        {/* Role switcher for demo (admin only) */}
        {isAdmin && (
          <div className="px-4 py-2 border-t border-gray-800">
            <div className="mb-4">
              <label htmlFor="role-selector" className="block text-sm font-medium text-gray-400 mb-1">
                Switch Role (Demo)
              </label>
              <select 
                id="role-selector" 
                className="bg-gray-800 text-white rounded px-3 py-2 w-full text-sm"
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
                  : user.username.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.username}
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
