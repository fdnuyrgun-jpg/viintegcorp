import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const DashboardLayout = () => {
  const { user, signOut, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  const [userFullName, setUserFullName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user) {
      void fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.warn('Error fetching user profile:', error);
        return;
      }

      if (data) {
        setUserFullName(data.full_name);
        setUserAvatar(data.avatar_url || undefined);
      }
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error('Error signing out:', error);
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-background"
      >
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className={cn("min-h-screen flex w-full transition-colors duration-300 bg-gradient-app")}>
        <AppSidebar 
          isAdmin={isAdmin} 
          userEmail={user.email}
          userId={user.id}
          userAvatar={userAvatar}
          userFullName={userFullName}
          onSignOut={handleSignOut}
        />
        
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Minimal header - only shows trigger when sidebar is collapsed */}
          <header className="sticky top-0 z-20 h-12 flex items-center px-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 sm:p-6 overflow-auto min-h-0">
            <div className="h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
