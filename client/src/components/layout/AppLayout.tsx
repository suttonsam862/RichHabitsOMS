import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { preloadOnHover } from '@/utils/routePreloader';
import { 
  Home, 
  ShoppingBag, 
  Users, 
  MessageSquare, 
  Brush, 
  Factory, 
  BarChart, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  UserCheck,
  Bell,
  DollarSign,
  ChevronRight,
  Package,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export function AppLayout() {
  const { user, logout, hasPageAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Close sidebar on route change on mobile
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!user) {
    return null; // Will be handled by RequireAuth component
  }

  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || user.username || '';

  // Define navigation items with page access names
  const navigationItems = [
    {
      name: 'Dashboard',
      href: `/dashboard/${user.role}`,
      icon: Home,
      current: location.pathname === `/dashboard/${user.role}`,
      page: 'dashboard',
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ShoppingBag,
      current: location.pathname === '/orders',
      page: 'orders',
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: Users,
      current: location.pathname === '/admin/customers',
      page: 'customers',
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      current: location.pathname === '/messages',
      page: 'messages',
    },
    {
      name: 'Design Tasks',
      href: '/design-tasks',
      icon: Brush,
      current: location.pathname === '/design-tasks',
      page: 'design',
    },
    {
      name: 'Production',
      href: '/production',
      icon: Factory,
      current: location.pathname === '/production',
      page: 'production',
    },
    {
      name: 'Manufacturer Assignment',
      href: '/manufacturer-assignment',
      icon: UserCheck,
      current: location.pathname === '/manufacturer-assignment',
      page: 'manufacturer-assignment',
    },
    {
      name: 'Catalog',
      href: '/admin/catalog',
      icon: Package,
      current: location.pathname === '/admin/catalog',
      page: 'catalog',
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart,
      current: location.pathname === '/admin/analytics',
      page: 'analytics',
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      current: location.pathname === '/admin/settings',
      page: 'settings',
    },
    {
      name: 'User Management',
      href: '/admin/user-management',
      icon: UserCheck,
      current: location.pathname === '/admin/user-management',
      page: 'user-management',
    },
    {
      name: 'Security',
      href: '/admin/security',
      icon: Shield,
      current: location.pathname === '/admin/security',
      page: 'security',
    },
  ];

  // Filter navigation items based on custom role-based page access
  const filteredNavigationItems = navigationItems.filter(item => 
    hasPageAccess(item.page)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rich-black via-gray-900 to-black">
      {/* Mobile menu button */}
      <div className="fixed z-40 top-4 left-4 sm:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar for desktop */}
      <div className="hidden sm:fixed sm:inset-y-0 sm:flex sm:flex-col sm:w-64 sm:z-50">
        {/* Sidebar component */}
        <div className="flex flex-col flex-grow rich-card border-r border-glass-border pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <div className="flex items-center">
              <div className="w-8 h-8 mr-2 glass-panel neon-glow flex items-center justify-center text-neon-blue font-bold">CC</div>
              <h1 className="text-xl font-bold text-neon-blue">Custom Clothing</h1>
            </div>
          </div>

          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 space-y-1 px-2" aria-label="Sidebar">
              <TooltipProvider>
                {filteredNavigationItems.map((item) => (
                  <Tooltip key={item.name} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          item.current
                            ? 'glass-panel neon-glow text-neon-blue'
                            : 'text-foreground hover:glass-panel hover:text-neon-blue',
                          'group flex items-center px-3 py-2.5 text-sm font-medium transition-all duration-150'
                        )}
                        onMouseEnter={() => preloadOnHover(item.href)}
                      >
                        <item.icon
                          className={cn(
                            item.current
                              ? 'text-primary'
                              : 'text-gray-400 group-hover:text-primary',
                            'mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-150'
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex-1">{item.name}</span>
                        {item.name === 'Messages' && (
                          <Badge variant="outline" className="bg-primary/10 text-primary ml-2 px-2 py-0.5 text-xs">
                            3
                          </Badge>
                        )}
                        {item.current && <ChevronRight size={16} className="text-primary ml-2" />}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {item.name} {item.name === 'Messages' && '(3 unread)'}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t border-glass-border p-4">
            <div className="flex items-center flex-1">
              <div>
                <Avatar className="h-10 w-10 border-2 border-neon-blue/30">
                  <AvatarImage src="" alt={fullName} />
                  <AvatarFallback className="glass-panel text-neon-blue">{getInitials(fullName)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-medium text-foreground">{fullName}</p>
                <p className="text-xs font-medium text-neon-blue capitalize">{user.role}</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto hover:bg-primary/10 hover:text-primary"
                      onClick={handleLogout}
                      aria-label="Logout"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Sign out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 sm:hidden">
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 backdrop-blur-sm transition-opacity" 
               onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full bg-gray-800/30 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center justify-center px-4 mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 mr-2 bg-primary rounded-md flex items-center justify-center text-white font-bold">CC</div>
                  <h1 className="text-xl font-bold text-primary">Custom Clothing</h1>
                </div>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {filteredNavigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      item.current
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary',
                      'group flex items-center px-3 py-3 text-base font-medium rounded-md transition-colors duration-150'
                    )}
                    onClick={() => setSidebarOpen(false)}
                    onMouseEnter={() => preloadOnHover(item.href)}
                  >
                    <item.icon
                      className={cn(
                        item.current
                          ? 'text-primary'
                          : 'text-gray-400 group-hover:text-primary',
                        'mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-150'
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{item.name}</span>
                    {item.name === 'Messages' && (
                      <Badge variant="outline" className="bg-primary/10 text-primary ml-2 px-2 py-0.5 text-xs">
                        3
                      </Badge>
                    )}
                    {item.current && <ChevronRight size={16} className="text-primary ml-2" />}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center w-full">
                <div>
                  <Avatar className="h-9 w-9 rounded-full border-2 border-primary/20">
                    <AvatarImage src="" alt={fullName} />
                    <AvatarFallback className="bg-primary/10 text-primary">{getInitials(fullName)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="ml-3 truncate flex-1">
                  <p className="text-sm font-medium text-gray-700">{fullName}</p>
                  <p className="text-xs font-medium text-primary capitalize">{user.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-primary/10 hover:text-primary"
                  onClick={handleLogout}
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="sm:pl-64 flex flex-col flex-1">
        <main className="flex-1 p-4 sm:p-6 bg-gradient-to-br from-rich-black via-gray-900 to-black">
          <Outlet />
        </main>
      </div>
    </div>
  );
}