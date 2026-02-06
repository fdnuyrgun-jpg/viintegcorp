import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { Search, LayoutGrid, List, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  user_id: string | null;
  full_name: string;
  position: string | null;
  department: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  isAdmin?: boolean;
}

const TeamPage = () => {
  const { user } = useAuth();
  const { onlineUserIds } = useOnlineUsers(user?.id);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Fetch employees using secure RPC function (only returns public data)
      const { data: employeesData, error: employeesError } = await supabase
        .rpc('get_public_employees');
      
      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        setLoading(false);
        return;
      }

      if (!employeesData) {
        setEmployees([]);
        setLoading(false);
        return;
      }

      // Fetch admin roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      const adminUserIds = new Set((rolesData || []).map(r => r.user_id));

      // Map employees with admin status
      const employeesWithRoles = (employeesData || []).map(emp => ({
        ...emp,
        isAdmin: emp.user_id ? adminUserIds.has(emp.user_id) : false,
      }));

      setEmployees(employeesWithRoles);
    } catch (error) {
      console.error('Exception in fetchEmployees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Команда</h1>
        <p className="text-muted-foreground mt-1">
          Справочник сотрудников ({filteredEmployees.length})
        </p>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex-1" />
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск сотрудника..."
              className="pl-10 bg-muted/50 border-0"
            />
          </div>
          
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn(
                "rounded-none h-9 w-9",
                viewMode === 'list' && "bg-muted"
              )}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn(
                "rounded-none h-9 w-9",
                viewMode === 'grid' && "bg-muted"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Employees */}
      {filteredEmployees.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? 'Сотрудники не найдены' : 'Список сотрудников пуст'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((employee) => (
            <div 
              key={employee.id}
              className="glass rounded-xl p-6 text-center hover:bg-muted/30 transition-colors group"
            >
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold overflow-hidden">
                  {employee.avatar_url ? (
                    <img 
                      src={employee.avatar_url} 
                      alt={employee.full_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(employee.full_name)
                  )}
                </div>
                {employee.user_id && (
                  <OnlineIndicator
                    isOnline={onlineUserIds.has(employee.user_id)}
                    className="bottom-0 right-0"
                    size="md"
                  />
                )}
              </div>
              <h3 className="font-semibold">{employee.full_name}</h3>
              <p className="text-sm text-primary mt-1">{employee.position || 'Сотрудник'}</p>
              {employee.isAdmin && (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
                  Админ
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEmployees.map((employee) => (
            <div 
              key={employee.id}
              className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
            >
              <div className="relative w-12 h-12 shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-semibold overflow-hidden">
                  {employee.avatar_url ? (
                    <img 
                      src={employee.avatar_url} 
                      alt={employee.full_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(employee.full_name)
                  )}
                </div>
                {employee.user_id && (
                  <OnlineIndicator
                    isOnline={onlineUserIds.has(employee.user_id)}
                    className="bottom-0 right-0"
                    size="sm"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{employee.full_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {employee.position || 'Сотрудник'} {employee.department && `• ${employee.department}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamPage;
