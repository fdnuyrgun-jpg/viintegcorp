import { useLocation, useNavigate } from "react-router-dom";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { 
  LayoutGrid, 
  Users, 
  CheckSquare, 
  BookOpen, 
  FolderOpen, 
  Settings,
  Briefcase,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { title: "Главная", url: "/dashboard", icon: LayoutGrid },
  { title: "Команда", url: "/dashboard/team", icon: Users },
  { title: "Задачи", url: "/dashboard/tasks", icon: CheckSquare },
  { title: "Wiki", url: "/dashboard/wiki", icon: BookOpen },
  { title: "Файлы", url: "/dashboard/files", icon: FolderOpen },
  { title: "Admin", url: "/dashboard/admin", icon: Settings, adminOnly: true },
];

interface AppSidebarProps {
  isAdmin?: boolean;
  userEmail?: string;
  userId?: string;
  userAvatar?: string;
  userFullName?: string;
  onSignOut?: () => void;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export function AppSidebar({ isAdmin = false, userEmail, userId, userAvatar, userFullName, onSignOut }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isOnline } = useOnlineUsers(userId);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
  } = useNotifications(userId);

  const filteredItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r-0 bg-sidebar">
      {/* Logo Header */}
      <SidebarHeader className="p-4 border-b border-border">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div 
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          >
            <Briefcase className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold gradient-text">VIntegCorp</span>
          )}
        </button>
      </SidebarHeader>

      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      className={cn(
                        "w-full gap-3 px-4 py-3 h-auto rounded-lg transition-all duration-200",
                        "hover:bg-primary/10 hover:text-primary",
                        active 
                          ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" 
                          : "text-muted-foreground"
                      )}
                      isActive={active}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with user info and controls */}
      <SidebarFooter className="p-4 border-t border-border">
        {/* Quick actions row */}
        <div className={cn(
          "flex items-center gap-2 mb-4",
          collapsed ? "flex-col" : "justify-between"
        )}>
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClearAll={clearAll}
            onDelete={deleteNotification}
          />
          <ThemeToggle />
        </div>

        {/* User profile */}
        {userEmail && (
          <div 
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors",
              collapsed && "justify-center p-2"
            )}
            onClick={() => navigate('/dashboard/profile')}
            title="Открыть профиль"
          >
            <div className="relative w-9 h-9 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt={userFullName || userEmail} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary-foreground">
                  {userFullName ? getInitials(userFullName) : userEmail?.charAt(0).toUpperCase()}
                </span>
              )}
              </div>
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-sidebar" title="Онлайн" />
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {userFullName || userEmail?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Администратор' : 'Сотрудник'}
                </p>
              </div>
            )}
            <Button
              variant="ghost" 
              size="icon"
              onClick={onSignOut}
              className={cn(
                "h-8 w-8 text-muted-foreground hover:text-destructive transition-colors shrink-0",
                collapsed && "hidden"
              )}
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Logout button for collapsed state */}
        {collapsed && onSignOut && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onSignOut}
            className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors mt-2"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
