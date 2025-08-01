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

// Rich Habits role accent colors
const roleHeaderColors = {
  admin: "border-neon-blue",
  salesperson: "border-neon-green", 
  designer: "border-neon-blue",
  manufacturer: "border-neon-green",
  customer: "border-neon-blue",
};

interface HeaderProps {
  onOpenMessages?: () => void;
  onOpenNotifications?: () => void;
  title?: string;
}

export function Header({ onOpenMessages = () => {}, onOpenNotifications = () => {}, title }: HeaderProps) {
  const { user, logout } = useAuth();
  const role = user?.role;
  const { notifications } = useWebSocket(user?.id ? parseInt(user.id) : null);
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const roleColor = role && roleHeaderColors[role as keyof typeof roleHeaderColors] || "bg-gray-800";
  const unreadNotifications = notifications.length;
  const unreadMessages = notifications.filter(n => n.type === "new_message").length;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className={cn("glass-panel border-b", roleColor)}>
      <div className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-foreground font-bold text-xl hidden md:block">
          ThreadCraft
        </h1>

        <div className="flex items-center space-x-6">
          {/* Rich Habits notifications */}
          <button
            className="relative glass-panel p-3 neon-glow hover:neon-glow-green transition-all"
            onClick={onOpenNotifications}
          >
            <Bell className="h-5 w-5 text-neon-blue" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-neon-green text-rich-black rounded-full text-xs font-bold flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </button>

          {/* Rich Habits messages */}
          <button
            className="relative glass-panel p-3 neon-glow hover:neon-glow-green transition-all"
            onClick={onOpenMessages}
          >
            <MessageSquare className="h-5 w-5 text-neon-blue" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-neon-green text-rich-black rounded-full text-xs font-bold flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </button>

          {/* Rich Habits user dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-3 glass-panel p-3 neon-glow hover:neon-glow-green transition-all focus:outline-none">
                <Avatar className="h-8 w-8 glass-panel neon-glow">
                  <AvatarFallback className="bg-neon-blue text-rich-black font-bold">
                    {user.firstName && user.lastName
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block subtitle text-foreground">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.username}
                </span>
                <ChevronDown className="h-4 w-4 hidden md:block text-neon-blue" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel border-glass-border">
              <DropdownMenuLabel className="subtitle text-neon-blue text-xs">Elite Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-glass-border" />
              <DropdownMenuItem className="text-foreground hover:bg-glass-panel/50">
                <User className="mr-3 h-4 w-4 text-neon-blue" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-foreground hover:bg-glass-panel/50">
                <Settings className="mr-3 h-4 w-4 text-neon-blue" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-glass-border" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-red-500/20">
                <LogOut className="mr-3 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
