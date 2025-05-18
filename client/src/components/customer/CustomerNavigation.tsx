import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  ShoppingBag,
  MessageSquare,
  UserCircle
} from 'lucide-react';

export function CustomerNavigation() {
  const location = useLocation();
  
  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard/customer",
      icon: Home,
    },
    {
      title: "My Orders",
      href: "/customer/orders",
      icon: ShoppingBag,
    },
    {
      title: "Messages",
      href: "/customer/messages",
      icon: MessageSquare,
    },
    {
      title: "Account",
      href: "/customer/account",
      icon: UserCircle,
    },
  ];
  
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            location.pathname === item.href
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <item.icon className="h-5 w-5 mr-2" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
}