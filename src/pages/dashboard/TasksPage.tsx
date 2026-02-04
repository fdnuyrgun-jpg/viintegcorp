import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { supabase } from "@/integrations/supabase/client";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Search, Filter, Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TaskColumn } from "@/components/tasks/TaskColumn";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { DragOverlayCard } from "@/components/tasks/DragOverlayCard";
import { TaskDetailsDialog } from "@/components/tasks/TaskDetailsDialog";
import { DeleteTaskDialog } from "@/components/tasks/DeleteTaskDialog";
import { createNotification } from "@/hooks/useNotifications";

type TaskStatus = 'todo' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  creator_id: string;
  due_date: string | null;
  assignee_name?: string;
  comments_count?: number;
  attachments_count?: number;
}

interface Employee {
  user_id: string;
  full_name: string;
}

const TasksPage = () => {
  const { user } = useAuth();
  const { onlineUserIds } = useOnlineUsers(user?.id);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Details dialog
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Delete dialog
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    assignee_id: "",
    due_date: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return;
    }

    const assigneeIds = [...new Set(data?.filter(t => t.assignee_id).map(t => t.assignee_id) || [])];
    
    // Fetch assignee names, comment counts, and attachment counts in parallel
    const [empResult, commentsResult, attachmentsResult] = await Promise.all([
      assigneeIds.length > 0 
        ? supabase.from('employees').select('user_id, full_name').in('user_id', assigneeIds)
        : Promise.resolve({ data: [] as { user_id: string; full_name: string }[] }),
      supabase.from('task_comments').select('task_id'),
      supabase.from('task_attachments').select('task_id')
    ]);

    const employeeMap = new Map<string, string>(
      empResult.data?.map(e => [e.user_id, e.full_name] as [string, string]) || []
    );
    
    // Count comments per task
    const commentCounts = new Map<string, number>();
    commentsResult.data?.forEach(c => {
      commentCounts.set(c.task_id, (commentCounts.get(c.task_id) || 0) + 1);
    });

    // Count attachments per task
    const attachmentCounts = new Map<string, number>();
    attachmentsResult.data?.forEach(a => {
      attachmentCounts.set(a.task_id, (attachmentCounts.get(a.task_id) || 0) + 1);
    });

    const enrichedTasks: Task[] = (data || []).map(task => ({
      ...task,
      assignee_name: task.assignee_id ? employeeMap.get(task.assignee_id) : undefined,
      comments_count: commentCounts.get(task.id) || 0,
      attachments_count: attachmentCounts.get(task.id) || 0,
    }));

    setTasks(enrichedTasks);
  }, []);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('user_id, full_name')
      .order('full_name');
    setEmployees(data?.filter(e => e.user_id) as Employee[] || []);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchEmployees()]);
      setLoading(false);
    };
    fetchData();
  }, [fetchTasks, fetchEmployees]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const handleCreateOrUpdateTask = async () => {
    if (!formData.title.trim()) {
      toast.error('Введите название задачи');
      return;
    }

    setIsSubmitting(true);

    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      priority: formData.priority,
      assignee_id: formData.assignee_id || null,
      due_date: formData.due_date || null,
    };

    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id);

      if (error) {
        toast.error('Ошибка обновления задачи');
      } else {
        toast.success('Задача обновлена');
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      if (!user?.id) {
        toast.error('Пользователь не авторизован');
        setIsSubmitting(false);
        return;
      }
      const { data: insertedTask, error } = await supabase.from('tasks').insert([{
        ...taskData,
        creator_id: user.id,
        status: 'todo' as TaskStatus,
      }]).select().single();

      if (error) {
        toast.error('Ошибка создания задачи');
      } else {
        toast.success('Задача создана');
        setIsDialogOpen(false);
        resetForm();
        
        // Notify assignee if assigned
        if (insertedTask && formData.assignee_id && formData.assignee_id !== user?.id) {
          createNotification(
            formData.assignee_id,
            "task",
            formData.title.trim(),
            "Вам назначена новая задача",
            insertedTask.id
          );
        }
      }
    }

    setIsSubmitting(false);
  };
  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    
    setIsDeleting(true);
    
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== deleteTaskId));
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', deleteTaskId);

    if (error) {
      toast.error('Ошибка удаления задачи');
      fetchTasks(); // Revert on error
    } else {
      toast.success('Задача удалена');
    }
    
    setIsDeleting(false);
    setDeleteTaskId(null);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      assignee_id: "",
      due_date: "",
    });
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assignee_id: task.assignee_id || "",
      due_date: task.due_date || "",
    });
    setIsDialogOpen(true);
  };

  const openDetailsDialog = (task: Task) => {
    setDetailsTask(task);
    setIsDetailsOpen(true);
  };

  // Track the original status before drag
  const [originalStatus, setOriginalStatus] = useState<TaskStatus | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
    // Remember original status for comparison later
    if (task) {
      setOriginalStatus(task.status);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're over a column
    if (['todo', 'in_progress', 'done'].includes(overId)) {
      const activeTask = tasks.find(t => t.id === activeId);
      if (activeTask && activeTask.status !== overId) {
        setTasks(prev => prev.map(t =>
          t.id === activeId ? { ...t, status: overId as TaskStatus } : t
        ));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      // Revert to original status if dropped outside
      if (originalStatus) {
        setTasks(prev => prev.map(t =>
          t.id === active.id ? { ...t, status: originalStatus } : t
        ));
      }
      setOriginalStatus(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine the new status
    let newStatus: TaskStatus | null = null;
    
    if (['todo', 'in_progress', 'done'].includes(overId)) {
      newStatus = overId as TaskStatus;
    } else {
      // Dropped on another task, find that task's status
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    // Compare with original status, not current (which was updated during drag)
    if (newStatus && originalStatus && newStatus !== originalStatus) {
      // Persist to database
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', activeId);

      if (error) {
        toast.error('Ошибка обновления статуса');
        // Revert to original
        setTasks(prev => prev.map(t =>
          t.id === activeId ? { ...t, status: originalStatus } : t
        ));
      } else {
        toast.success(`Задача перемещена в "${
          newStatus === 'todo' ? 'К выполнению' : 
          newStatus === 'in_progress' ? 'В работе' : 'Готово'
        }"`);
      }
    }
    
    setOriginalStatus(null);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = !filterMyTasks || task.assignee_id === user?.id;
    return matchesSearch && matchesFilter;
  });

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Задачи</h1>
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground mt-1">
            Перетаскивайте задачи между колонками
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="relative flex-1 sm:w-64"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск задач..."
              className="pl-10 bg-muted/50 border-0 focus:ring-2 focus:ring-primary"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant={filterMyTasks ? "default" : "outline"}
              onClick={() => setFilterMyTasks(!filterMyTasks)}
              className="gap-2 whitespace-nowrap"
            >
              <Filter className="w-4 h-4" />
              Мои задачи
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button 
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-5 h-5" />
              Создать
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 text-sm text-muted-foreground"
      >
        <span>Всего: <strong className="text-foreground">{filteredTasks.length}</strong></span>
        <span>К выполнению: <strong className="text-foreground">{tasksByStatus.todo.length}</strong></span>
        <span>В работе: <strong className="text-yellow-400">{tasksByStatus.in_progress.length}</strong></span>
        <span>Готово: <strong className="text-green-400">{tasksByStatus.done.length}</strong></span>
      </motion.div>

      {/* Kanban Board with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid lg:grid-cols-3 gap-4">
          {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((status) => (
            <TaskColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onEditTask={openEditDialog}
              onDeleteTask={(id) => setDeleteTaskId(id)}
              onOpenDetails={openDetailsDialog}
              activeTaskId={activeTask?.id}
              onlineUserIds={onlineUserIds}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <DragOverlayCard task={activeTask} />}
        </DragOverlay>
      </DndContext>

      {/* Task Dialog */}
      <TaskDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
        isEditing={!!editingTask}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleCreateOrUpdateTask}
        onCancel={() => {
          setIsDialogOpen(false);
          resetForm();
        }}
        isSubmitting={isSubmitting}
        employees={employees}
        taskId={editingTask?.id}
      />

      {/* Details Dialog */}
      <TaskDetailsDialog
        task={detailsTask}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onEdit={openEditDialog}
        onDelete={(id) => setDeleteTaskId(id)}
        onUpdate={fetchTasks}
      />

      {/* Delete Confirmation */}
      <DeleteTaskDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => !open && setDeleteTaskId(null)}
        onConfirm={handleDeleteTask}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default TasksPage;
