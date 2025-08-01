import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users } from 'lucide-react'; // Assuming lucide-react is used for icons

// Define a NavigationMenuItem component (assumed)
const NavigationMenuItem = ({ children }) => (
  <li>{children}</li>
);

const AdminNavigationMenu = () => {
  const location = useLocation();

  return (
    <nav>
      <ul>
        <NavigationMenuItem>
          <Link 
            to="/admin/customers" 
            className={`group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 ${
              location.pathname === '/admin/customers' ? 'bg-accent text-accent-foreground' : ''
            }`}
          >
            <Users className="mr-2 h-4 w-4" />
            Customers
          </Link>
        </NavigationMenuItem>

        <NavigationMenuItem>
          {/* TODO: add link to SalespersonManagement */}
          <Link 
            to="/admin/salespeople" 
            className={`group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 ${
              location.pathname === '/admin/salespeople' ? 'bg-accent text-accent-foreground' : ''
            }`}
          >
            <Users className="mr-2 h-4 w-4" />
            Salespeople
          </Link>
        </NavigationMenuItem>
      </ul>
    </nav>
  );
};

export default AdminNavigationMenu;