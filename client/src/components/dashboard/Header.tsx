import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/lib/useWebSocket";
import { cn } from "@/lib/utils";
import { Bell, MessageSquare, ChevronDown, LogOut, User, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Color mapping for different roles
const roleHeaderColors = {
  admin: "bg-indigo-500",
  salesperson: "bg-sky-500",
  designer: "bg-pink-500",
  manufacturer: "bg-amber-500",
  customer: "bg-emerald-500",
};

interface HeaderProps {
  onOpenMessages?: () => void;
  onOpenNotifications?: () => void;
  title?: string;
}

export function Header({ onOpenMessages = () => {}, onOpenNotifications = () => {}, title }: HeaderProps) {
  const { user, role, logout } = useAuth();
  const { notifications } = useWebSocket(user?.id || null);
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const roleColor = role && roleHeaderColors[role as keyof typeof roleHeaderColors] || "bg-gray-800";
  const unreadNotifications = notifications.length;
  const unreadMessages = notifications.filter(n => n.type === "new_message").length;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className={cn("shadow-md", roleColor)}>
      <div className="px-4 py-3 flex items-center justify-between">
        <h1 className="text-white font-bold text-xl hidden md:block">
          ThreadCraft
        </h1>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button
            className="relative text-white p-1"
            onClick={onOpenNotifications}
          >
            <Bell className="h-6 w-6" />
            {unreadNotifications > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadNotifications}
              </Badge>
            )}
          </button>

          {/* Messages */}
          <button
            className="relative text-white p-1"
            onClick={onOpenMessages}
          >
            <MessageSquare className="h-6 w-6" />
            {unreadMessages > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadMessages}
              </Badge>
            )}
          </button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2 text-white focus:outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={cn(roleColor, "border-2 border-white")}>
                    {user.firstName && user.lastName
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block font-medium">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.username}
                </span>
                <ChevronDown className="h-4 w-4 hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
