import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

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
}

const priorityConfig = {
  low: { label: 'Низкий', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Средний', color: 'bg-yellow-500/20 text-yellow-400' },
  high: { label: 'Высокий', color: 'bg-destructive/20 text-destructive' },
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

interface DragOverlayCardProps {
  task: Task;
}

export const DragOverlayCard = ({ task }: DragOverlayCardProps) => {
  return (
    <motion.div
      initial={{ scale: 1, rotate: 0 }}
      animate={{ scale: 1.05, rotate: 2 }}
      className={cn(
        "bg-card rounded-lg p-4 cursor-grabbing",
        "border-2 border-primary/50 shadow-2xl shadow-primary/20",
        "w-full max-w-[280px]"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={cn(
          "text-xs px-2 py-1 rounded-full font-medium",
          priorityConfig[task.priority].color
        )}>
          {priorityConfig[task.priority].label}
        </span>
      </div>

      <h4 className="font-medium text-sm leading-snug mb-3 line-clamp-2">
        {task.title}
      </h4>

      <div className="flex items-center justify-between gap-2">
        {task.assignee_name ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              {getInitials(task.assignee_name)}
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {task.assignee_name}
            </span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">?</span>
          </div>
        )}

        {task.due_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(task.due_date), 'd MMM', { locale: ru })}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
