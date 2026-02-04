import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/DashboardLayout";
import HomePage from "./pages/dashboard/HomePage";
import TeamPage from "./pages/dashboard/TeamPage";
import TasksPage from "./pages/dashboard/TasksPage";
import WikiPage from "./pages/dashboard/WikiPage";
import FilesPage from "./pages/dashboard/FilesPage";
import AdminPage from "./pages/dashboard/AdminPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 min
            retry: 2,
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="team" element={<TeamPage />} />
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="wiki" element={<WikiPage />} />
                    <Route path="files" element={<FilesPage />} />
                    <Route path="admin" element={<AdminPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
