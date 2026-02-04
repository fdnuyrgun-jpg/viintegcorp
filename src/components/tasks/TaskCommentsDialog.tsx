import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface TaskComment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  author_name?: string;
}

interface Task {
  id: string;
  title: string;
}

interface TaskCommentsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentAdded?: () => void;
}

export const TaskCommentsDialog = ({ 
  task, 
  open, 
  onOpenChange,
  onCommentAdded 
}: TaskCommentsDialogProps) => {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open && task) {
      fetchComments();
    }
  }, [open, task]);

  const fetchComments = async () => {
    if (!task) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      setIsLoading(false);
      return;
    }

    // Get author names
    const userIds = [...new Set(data?.map(c => c.user_id) || [])];
    const { data: empData } = await supabase
      .from('employees')
      .select('user_id, full_name')
      .in('user_id', userIds);

    const nameMap = new Map(empData?.map(e => [e.user_id, e.full_name]) || []);

    setComments((data || []).map(c => ({
      ...c,
      author_name: nameMap.get(c.user_id) || 'Неизвестный'
    })));
    setIsLoading(false);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !task || !user) return;

    setIsSending(true);
    const { error } = await supabase
      .from('task_comments')
      .insert({
        task_id: task.id,
        user_id: user.id,
        content: newComment.trim()
      });

    if (error) {
      toast.error('Ошибка отправки комментария');
    } else {
      setNewComment("");
      fetchComments();
      onCommentAdded?.();
      toast.success('Комментарий добавлен');
    }
    setIsSending(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Ошибка удаления комментария');
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId));
      onCommentAdded?.();
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Комментарии</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {task?.title}
          </DialogDescription>
        </DialogHeader>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4 min-h-[200px] max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Пока нет комментариев
            </div>
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
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {getInitials(comment.author_name || 'U')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {comment.author_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </span>
                      {(comment.user_id === user?.id || isAdmin) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* New Comment Input */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Написать комментарий..."
            className="bg-muted/50 border-0 focus:ring-2 focus:ring-primary resize-none min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSendComment();
              }
            }}
          />
          <Button
            onClick={handleSendComment}
            disabled={!newComment.trim() || isSending}
            className="shrink-0 h-auto"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
