import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { Circle, Clock, CheckCircle2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";

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

const statusConfig = {
  todo: { 
    label: 'К выполнению', 
    icon: Circle, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30'
  },
  in_progress: { 
    label: 'В работе', 
    icon: Clock, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10'
  },
  done: { 
    label: 'Готово', 
    icon: CheckCircle2, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10'
  },
};

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenDetails: (task: Task) => void;
  activeTaskId?: string | null;
  onlineUserIds?: Set<string>;
}

export const TaskColumn = ({ status, tasks, onEditTask, onDeleteTask, onOpenDetails, activeTaskId, onlineUserIds }: TaskColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: status === 'todo' ? 0 : status === 'in_progress' ? 0.1 : 0.2 }}
      className={cn(
        "glass rounded-xl p-4 flex flex-col",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: isOver ? 360 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <Icon className={cn("w-5 h-5", config.color)} />
          </motion.div>
          <h3 className="font-semibold">{config.label}</h3>
        </div>
        <motion.span 
          key={tasks.length}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className={cn(
            "text-sm font-medium px-2 py-0.5 rounded-full",
            config.bgColor,
            config.color
          )}
        >
          {tasks.length}
        </motion.span>
      </div>

      {/* Tasks Container */}
      <div 
        ref={setNodeRef}
        className="flex-1 min-h-[200px]"
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onOpenDetails={onOpenDetails}
                isDragging={activeTaskId === task.id}
                onlineUserIds={onlineUserIds}
              />
            ))}
          </div>
        </SortableContext>

        {/* Empty State */}
        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "h-32 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors",
              isOver ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <div className="text-center text-muted-foreground">
              <Plus className={cn("w-6 h-6 mx-auto mb-2", isOver && "text-primary")} />
              <span className="text-sm">
                {isOver ? "Отпустите здесь" : "Перетащите сюда"}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
