import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
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
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export function AppLayout() {
  const { user, logout } = useAuth();
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

  // Define navigation items based on user role
  const navigationItems = [
    {
      name: 'Dashboard',
      href: `/dashboard/${user.role}`,
      icon: Home,
      current: location.pathname === `/dashboard/${user.role}`,
      roles: ['admin', 'salesperson', 'designer', 'manufacturer', 'customer'],
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ShoppingBag,
      current: location.pathname === '/orders',
      roles: ['admin', 'salesperson', 'customer', 'designer', 'manufacturer'],
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: Users,
      current: location.pathname === '/customers',
      roles: ['admin', 'salesperson'],
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      current: location.pathname === '/messages',
      roles: ['admin', 'salesperson', 'designer', 'manufacturer', 'customer'],
    },
    {
      name: 'Design Tasks',
      href: '/design-tasks',
      icon: Brush,
      current: location.pathname === '/design-tasks',
      roles: ['admin', 'designer'],
    },
    {
      name: 'Production',
      href: '/production',
      icon: Factory,
      current: location.pathname === '/production',
      roles: ['admin', 'manufacturer'],
    },
    {
      name: 'Manufacturer Assignment',
      href: '/manufacturer-assignment',
      icon: UserCheck,
      current: location.pathname === '/manufacturer-assignment',
      roles: ['admin'],
    },
    {
      name: 'Admin Oversight',
      href: '/admin/oversight',
      icon: BarChart,
      current: location.pathname === '/admin/oversight',
      roles: ['admin'],
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart,
      current: location.pathname === '/analytics',
      roles: ['admin'],
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: location.pathname === '/settings',
      roles: ['admin', 'salesperson', 'designer', 'manufacturer', 'customer'],
    },
  ];

  // Filter navigation items based on user role
  const filteredNavigationItems = navigationItems.filter(item => 
    item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
      <div className="hidden sm:fixed sm:inset-y-0 sm:flex sm:flex-col sm:w-64">
        {/* Sidebar component */}
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <h1 className="text-xl font-bold">Custom Clothing</h1>
          </div>

          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 space-y-1 px-2" aria-label="Sidebar">
              {filteredNavigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    item.current
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={cn(
                      item.current
                        ? 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <Avatar className="h-10 w-10 rounded-full">
                  <AvatarImage src="" alt={fullName} />
                  <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{fullName}</p>
                <p className="text-xs font-medium text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-30 sm:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold">Custom Clothing</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {filteredNavigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      item.current
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                    )}
                  >
                    <item.icon
                      className={cn(
                        item.current
                          ? 'text-gray-500'
                          : 'text-gray-400 group-hover:text-gray-500',
                        'mr-3 flex-shrink-0 h-6 w-6'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div>
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src="" alt={fullName} />
                    <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{fullName}</p>
                  <p className="text-xs font-medium text-gray-500 capitalize">{user.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 text-gray-500" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-14">{/* Dummy element to force sidebar to shrink to fit close icon */}</div>
        </div>
      )}

      {/* Main content */}
      <div className="sm:pl-64 flex flex-col flex-1">
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}