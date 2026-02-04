import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Pencil, GripVertical, Calendar, Trash2, MessageCircle, Paperclip } from "lucide-react";
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
  comments_count?: number;
  attachments_count?: number;
}

const priorityConfig = {
  low: { label: 'Низкий', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Средний', color: 'bg-yellow-500/20 text-yellow-400' },
  high: { label: 'Высокий', color: 'bg-destructive/20 text-destructive' },
};

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onOpenDetails: (task: Task) => void;
  isDragging?: boolean;
  onlineUserIds?: Set<string>;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const TaskCard = ({ task, onEdit, onDelete, onOpenDetails, isDragging, onlineUserIds }: TaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isBeingDragged = isDragging || isSortableDragging;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open details if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    onOpenDetails(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={cn(
        "bg-card/50 rounded-lg p-4 cursor-pointer active:cursor-grabbing touch-none",
        "border border-border/50 hover:border-primary/30 transition-all duration-200",
        "group relative select-none",
        isBeingDragged && "z-50 ring-2 ring-primary/50 opacity-50 scale-[1.02] shadow-xl"
      )}
    >
      {/* Drag Handle Indicator */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="pl-4">
        {/* Header with priority and actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <motion.span 
            whileHover={{ scale: 1.05 }}
            className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              priorityConfig[task.priority].color
            )}
          >
            {priorityConfig[task.priority].label}
          </motion.span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEdit(task);
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <Pencil className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(task.id);
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm leading-snug mb-3 line-clamp-2">
          {task.title}
        </h4>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.assignee_name ? (
              <>
                <div className="relative w-6 h-6 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {getInitials(task.assignee_name)}
                  </div>
                  {task.assignee_id && onlineUserIds?.has(task.assignee_id) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 ring-1 ring-background" title="Онлайн" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {task.assignee_name}
                </span>
              </>
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">?</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(task.attachments_count ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="w-3 h-3" />
                <span>{task.attachments_count}</span>
              </div>
            )}
            {(task.comments_count ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageCircle className="w-3 h-3" />
                <span>{task.comments_count}</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(task.due_date), 'd MMM', { locale: ru })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
