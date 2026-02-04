import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Megaphone, FolderKanban, Plus, Trash2, Mail, 
  Shield, UserCheck, BarChart3, Activity, Key, Bell, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { notifyAllUsersExcept } from "@/hooks/useNotifications";

interface Employee {
  id: string;
  user_id: string | null;
  full_name: string;
  position: string | null;
  department: string | null;
  email: string;
  is_active: boolean | null;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'employee';
}

interface News {
  id: string;
  title: string;
  content: string;
  is_official: boolean | null;
  created_at: string;
}

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  totalTasks: number;
  totalDocuments: number;
  totalNews: number;
}

const AdminPage = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalTasks: 0,
    totalDocuments: 0,
    totalNews: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Employee dialog
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    full_name: "",
    email: "",
    password: "",
    position: "",
    department: "",
    phone: "",
    role: "employee" as 'admin' | 'employee',
  });

  // News dialog
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false);
  const [newNews, setNewNews] = useState({
    title: "",
    content: "",
  });

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'employee' | 'news';
    id: string;
    name: string;
  }>({ open: false, type: 'employee', id: '', name: '' });

  // Role change dialog
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    employee: Employee | null;
    newRole: 'admin' | 'employee';
  }>({ open: false, employee: null, newRole: 'employee' });

  // Password change dialog
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    employee: Employee | null;
  }>({ open: false, employee: null });
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchUserRoles(), fetchNews(), fetchStats()]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    setEmployees(data || []);
  };

  const fetchUserRoles = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, role');
    setUserRoles(data || []);
  };

  const fetchNews = async () => {
    const { data } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });
    setNews(data || []);
  };

  const fetchStats = async () => {
    const [employeesRes, tasksRes, filesRes, newsRes] = await Promise.all([
      supabase.from('employees').select('id, is_active'),
      supabase.from('tasks').select('id', { count: 'exact' }),
      supabase.from('files').select('id', { count: 'exact' }),
      supabase.from('news').select('id', { count: 'exact' }),
    ]);

    const allEmployees = employeesRes.data || [];
    setStats({
      totalEmployees: allEmployees.length,
      activeEmployees: allEmployees.filter(e => e.is_active !== false).length,
      totalTasks: tasksRes.count || 0,
      totalDocuments: filesRes.count || 0,
      totalNews: newsRes.count || 0,
    });
  };

  const getEmployeeRole = (userId: string | null): 'admin' | 'employee' => {
    if (!userId) return 'employee';
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role || 'employee';
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmployee.full_name || !newEmployee.email || !newEmployee.password) {
      toast.error('Заполните обязательные поля');
      return;
    }

    if (newEmployee.password.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: {
          email: newEmployee.email,
          password: newEmployee.password,
          full_name: newEmployee.full_name,
          position: newEmployee.position || null,
          department: newEmployee.department || null,
          phone: newEmployee.phone || null,
          role: newEmployee.role,
        },
      });

      if (error) {
        toast.error(error.message || 'Ошибка создания сотрудника');
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success('Сотрудник добавлен');
        setIsEmployeeDialogOpen(false);
        setNewEmployee({
          full_name: "",
          email: "",
          password: "",
          position: "",
          department: "",
          phone: "",
          role: "employee",
        });
        fetchData();
      }
    } catch (err) {
      toast.error('Неожиданная ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', deleteDialog.id);

    if (error) {
      toast.error('Ошибка удаления');
    } else {
      toast.success('Сотрудник удалён');
      fetchData();
    }
    setDeleteDialog({ open: false, type: 'employee', id: '', name: '' });
  };

  const handleChangeRole = async () => {
    if (!roleDialog.employee?.user_id) {
      toast.error('У сотрудника нет привязанного аккаунта');
      setRoleDialog({ open: false, employee: null, newRole: 'employee' });
      return;
    }

    const existingRole = userRoles.find(r => r.user_id === roleDialog.employee!.user_id);

    if (existingRole) {
      // Delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', roleDialog.employee.user_id);
    }

    // Insert new role
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: roleDialog.employee.user_id,
        role: roleDialog.newRole,
      });

    if (error) {
      toast.error('Ошибка изменения роли');
    } else {
      toast.success(`Роль изменена на ${roleDialog.newRole === 'admin' ? 'Администратор' : 'Сотрудник'}`);
      fetchUserRoles();
    }
    setRoleDialog({ open: false, employee: null, newRole: 'employee' });
  };

  const handleChangePassword = async () => {
    if (!passwordDialog.employee?.email) {
      toast.error('Email сотрудника не найден');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('reset-admin-password', {
        body: {
          email: passwordDialog.employee.email,
          newPassword: newPassword,
        },
      });

      if (error) {
        toast.error(error.message || 'Ошибка смены пароля');
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Пароль для ${passwordDialog.employee.full_name} успешно изменён`);
        setPasswordDialog({ open: false, employee: null });
        setNewPassword("");
      }
    } catch (err) {
      toast.error('Неожиданная ошибка');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCreateNews = async () => {
    if (!newNews.title.trim() || !newNews.content.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    setIsSubmitting(true);

    if (!user?.id) {
      toast.error('Пользователь не авторизован');
      setIsSubmitting(false);
      return;
    }

    const { data: insertedNews, error } = await supabase.from('news').insert([{
      title: newNews.title.trim(),
      content: newNews.content.trim(),
      author_id: user.id,
    }]).select().single();

    if (error) {
      toast.error('Ошибка создания новости');
    } else {
      toast.success('Новость опубликована');
      setIsNewsDialogOpen(false);
      setNewNews({ title: "", content: "" });
      fetchData();
      
      // Send notifications to all users
      if (user?.id && insertedNews) {
        notifyAllUsersExcept(
          user.id,
          "news",
          newNews.title.trim(),
          "Опубликована новая новость",
          insertedNews.id
        );
      }
    }

    setIsSubmitting(false);
  };

  const handleDeleteNews = async () => {
    const { error } = await supabase.from('news').delete().eq('id', deleteDialog.id);

    if (error) {
      toast.error('Ошибка удаления');
    } else {
      toast.success('Новость удалена');
      fetchData();
    }
    setDeleteDialog({ open: false, type: 'employee', id: '', name: '' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isAdmin) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">Доступ запрещён</p>
        <p className="text-sm text-muted-foreground mt-2">Эта страница доступна только администраторам</p>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "employees", label: "Сотрудники", icon: Users, count: stats.totalEmployees },
    { id: "news", label: "Новости", icon: Megaphone, count: stats.totalNews },
    { id: "analytics", label: "Аналитика", icon: BarChart3 },
  ];

  const statCards = [
    { label: "Всего сотрудников", value: stats.totalEmployees, icon: Users, color: "from-blue-500 to-blue-600" },
    { label: "Активных", value: stats.activeEmployees, icon: UserCheck, color: "from-green-500 to-green-600" },
    { label: "Задач", value: stats.totalTasks, icon: Activity, color: "from-purple-500 to-purple-600" },
    { label: "Документов", value: stats.totalDocuments, icon: FolderKanban, color: "from-orange-500 to-orange-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Панель администратора
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление ресурсами компании
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab, index) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "gap-2 relative",
                  activeTab === tab.id && "bg-primary hover:bg-primary/90"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                    activeTab === tab.id 
                      ? "bg-primary-foreground/20 text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="glass rounded-xl p-4 flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <motion.div 
                key={stat.value}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold"
              >
                {stat.value}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Employees Tab */}
        {activeTab === "employees" && (
          <motion.div
            key="employees"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg">Список сотрудников</h2>
              <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-primary hover:bg-primary/90">
                    <Plus className="w-5 h-5" />
                    Добавить
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-border sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Новый сотрудник
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateEmployee} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>ФИО *</Label>
                      <Input
                        value={newEmployee.full_name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                        placeholder="Иванов Иван Иванович"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                        placeholder="employee@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Пароль *</Label>
                      <Input
                        type="password"
                        value={newEmployee.password}
                        onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                        placeholder="Минимум 6 символов"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Должность</Label>
                        <Input
                          value={newEmployee.position}
                          onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                          placeholder="Менеджер"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Отдел</Label>
                        <Input
                          value={newEmployee.department}
                          onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                          placeholder="Продажи"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Роль *</Label>
                      <Select
                        value={newEmployee.role}
                        onValueChange={(value: 'admin' | 'employee') => setNewEmployee({ ...newEmployee, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4" />
                              Сотрудник
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Администратор
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Администратор имеет доступ к панели управления
                      </p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEmployeeDialogOpen(false)}
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Создать'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Employees grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {employees.map((employee, index) => {
                const role = getEmployeeRole(employee.user_id);
                return (
                  <motion.div
                    key={employee.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-semibold shrink-0">
                        {getInitials(employee.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{employee.full_name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {employee.position || 'Сотрудник'}
                        </div>
                        {employee.department && (
                          <div className="text-xs text-muted-foreground">{employee.department}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="truncate">{employee.email}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => setRoleDialog({ 
                          open: true, 
                          employee, 
                          newRole: role === 'admin' ? 'employee' : 'admin' 
                        })}
                        className={cn(
                          "px-2 py-1 text-xs rounded-full flex items-center gap-1 transition-colors",
                          role === 'admin' 
                            ? "bg-primary/20 text-primary hover:bg-primary/30" 
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {role === 'admin' ? 'Админ' : 'Сотрудник'}
                      </button>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPasswordDialog({ open: true, employee })}
                          className="text-muted-foreground hover:text-primary h-8 w-8"
                          title="Сменить пароль"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDialog({ 
                            open: true, 
                            type: 'employee', 
                            id: employee.id, 
                            name: employee.full_name 
                          })}
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {employees.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Нет сотрудников</p>
              </div>
            )}
          </motion.div>
        )}

        {/* News Tab */}
        {activeTab === "news" && (
          <motion.div
            key="news"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg">Новости и объявления</h2>
              <Dialog open={isNewsDialogOpen} onOpenChange={setIsNewsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-primary hover:bg-primary/90">
                    <Plus className="w-5 h-5" />
                    Создать
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-border sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Megaphone className="w-5 h-5" />
                      Новая новость
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Заголовок *</Label>
                      <Input
                        value={newNews.title}
                        onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                        placeholder="Заголовок новости"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Содержание *</Label>
                      <Textarea
                        value={newNews.content}
                        onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                        placeholder="Текст новости..."
                        rows={4}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Новости автоматически публикуются как официальные
                    </p>
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsNewsDialogOpen(false)}
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                      <Button
                        onClick={handleCreateNews}
                        disabled={isSubmitting}
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Опубликовать'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {news.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Нет новостей</p>
              </div>
            ) : (
              <div className="space-y-4">
                {news.map((item, index) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{item.title}</h3>
                        {item.is_official && (
                          <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            Официально
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(item.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDialog({ 
                        open: true, 
                        type: 'news', 
                        id: item.id, 
                        name: item.title 
                      })}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-xl p-6"
          >
            <h2 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Аналитика
            </h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-6 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Активность сотрудников</div>
                    <div className="text-xl font-bold">{stats.activeEmployees} / {stats.totalEmployees}</div>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.totalEmployees > 0 ? (stats.activeEmployees / stats.totalEmployees) * 100 : 0}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  />
                </div>
              </div>

              <div className="p-6 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Всего задач</div>
                    <div className="text-xl font-bold">{stats.totalTasks}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Общее количество задач в системе</p>
              </div>

              <div className="p-6 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Документов</div>
                    <div className="text-xl font-bold">{stats.totalDocuments}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Файлов в хранилище</p>
              </div>

              <div className="p-6 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Новостей</div>
                    <div className="text-xl font-bold">{stats.totalNews}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Опубликованных объявлений</p>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить {deleteDialog.type === 'employee' ? 'сотрудника' : 'новость'} "{deleteDialog.name}"? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteDialog.type === 'employee' ? handleDeleteEmployee : handleDeleteNews}
              className="bg-destructive hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Dialog */}
      <AlertDialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog({ ...roleDialog, open })}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Изменить роль</AlertDialogTitle>
            <AlertDialogDescription>
              Изменить роль {roleDialog.employee?.full_name} на{' '}
              <span className="font-semibold">
                {roleDialog.newRole === 'admin' ? 'Администратор' : 'Сотрудник'}
              </span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangeRole} className="bg-primary hover:bg-primary/90">
              Изменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog.open} onOpenChange={(open) => {
        setPasswordDialog({ ...passwordDialog, open });
        if (!open) setNewPassword("");
      }}>
        <DialogContent className="glass border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Сменить пароль
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Сотрудник:</p>
              <p className="font-medium">{passwordDialog.employee?.full_name}</p>
              <p className="text-sm text-muted-foreground">{passwordDialog.employee?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Новый пароль *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordDialog({ open: false, employee: null });
                  setNewPassword("");
                }}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || newPassword.length < 6}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isChangingPassword ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Сменить пароль'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
