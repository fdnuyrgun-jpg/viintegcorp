import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskAttachments } from "./TaskAttachments";
import { 
  Calendar, 
  MessageCircle, 
  Paperclip, 
  Send, 
  Trash2,
  Pencil,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  created_at?: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  author_name?: string;
}

interface TaskDetailsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdate: () => void;
}

const priorityConfig = {
  low: { label: 'Низкий', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Средний', color: 'bg-yellow-500/20 text-yellow-400' },
  high: { label: 'Высокий', color: 'bg-destructive/20 text-destructive' },
};

const statusConfig = {
  todo: { label: 'К выполнению', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'В работе', color: 'bg-yellow-500/20 text-yellow-400' },
  done: { label: 'Готово', color: 'bg-green-500/20 text-green-400' },
};

export const TaskDetailsDialog = ({
  task,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onUpdate,
}: TaskDetailsDialogProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const fetchComments = async () => {
    if (!task) return;
    setLoadingComments(true);
    
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      setLoadingComments(false);
      return;
    }

    // Fetch author names
    const userIds = [...new Set(data?.map(c => c.user_id) || [])];
    const { data: employees } = await supabase
      .from('employees')
      .select('user_id, full_name')
      .in('user_id', userIds);

    const nameMap = new Map(employees?.map(e => [e.user_id, e.full_name]) || []);
    
    setComments(data?.map(c => ({
      ...c,
      author_name: nameMap.get(c.user_id) || 'Неизвестный',
    })) || []);
    setLoadingComments(false);
  };

  useEffect(() => {
    if (open && task) {
      fetchComments();
    }
  }, [open, task?.id]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !task || !user) return;
    
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('task_comments')
      .insert({
        task_id: task.id,
        user_id: user.id,
        content: newComment.trim(),
      });

    if (error) {
      toast.error('Ошибка отправки комментария');
    } else {
      setNewComment("");
      await fetchComments();
      onUpdate();
      toast.success('Комментарий добавлен');
    }
    
    setIsSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Ошибка удаления');
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId));
      onUpdate();
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return format(date, 'd MMM yyyy', { locale: ru });
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold leading-tight">
                  {task.title}
                </DialogTitle>
                <DialogDescription className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className={cn("text-xs", statusConfig[task.status].color)}>
                    {statusConfig[task.status].label}
                  </Badge>
                  <Badge className={cn("text-xs", priorityConfig[task.priority].color)}>
                    {priorityConfig[task.priority].label}
                  </Badge>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(task);
                  }}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Изменить
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <Tabs defaultValue="details" className="flex-1">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="gap-1.5 text-xs sm:text-sm px-2">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Детали</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5 text-xs sm:text-sm px-2">
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Комментарии</span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1.5 text-xs sm:text-sm px-2">
                <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Файлы</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="details" className="mt-0 p-6 pt-4">
            <div className="space-y-4">
              {task.description ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Описание</h4>
                  <p className="text-sm leading-relaxed bg-muted/30 rounded-lg p-3">
                    {task.description}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Описание отсутствует</p>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {task.assignee_name && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                      {getInitials(task.assignee_name)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Исполнитель</p>
                      <p className="text-sm font-medium">{task.assignee_name}</p>
                    </div>
                  </div>
                )}
                
                {task.due_date && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Срок</p>
                      <p className="text-sm font-medium">
                        {format(new Date(task.due_date), 'd MMMM yyyy', { locale: ru })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="comments" className="mt-0 flex flex-col h-[350px]">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Пока нет комментариев. Будьте первым!
                  </p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {comments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center text-xs font-medium text-primary">
                          {getInitials(comment.author_name || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.author_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(comment.created_at)}
                            </span>
                            {comment.user_id === user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-border bg-background/50">
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="min-h-[60px] resize-none bg-muted/50 border-0 focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSubmitComment();
                    }
                  }}
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  size="icon"
                  className="h-[60px] w-[60px]"
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                    />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Ctrl+Enter для отправки
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="attachments" className="mt-0 p-6 pt-4">
            <TaskAttachments taskId={task.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
