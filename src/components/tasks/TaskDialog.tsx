import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskAttachments } from "./TaskAttachments";

type TaskPriority = 'low' | 'medium' | 'high';

interface Employee {
  user_id: string;
  full_name: string;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee_id: string;
  due_date: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  formData: TaskFormData;
  onFormChange: (data: TaskFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  employees: Employee[];
  taskId?: string;
}

export const TaskDialog = ({
  open,
  onOpenChange,
  isEditing,
  formData,
  onFormChange,
  onSubmit,
  onCancel,
  isSubmitting,
  employees,
  taskId,
}: TaskDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? 'Измените данные задачи' : 'Заполните форму для создания задачи'}
          </DialogDescription>
        </DialogHeader>
        
        {isEditing && taskId ? (
          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Детали</TabsTrigger>
              <TabsTrigger value="attachments">Файлы</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <TaskFormContent 
                formData={formData}
                onFormChange={onFormChange}
                employees={employees}
              />
              <FormButtons
                onCancel={onCancel}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                isEditing={isEditing}
              />
            </TabsContent>
            <TabsContent value="attachments" className="mt-4">
              <TaskAttachments taskId={taskId} />
            </TabsContent>
          </Tabs>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-4"
          >
            <TaskFormContent 
              formData={formData}
              onFormChange={onFormChange}
              employees={employees}
            />
            <FormButtons
              onCancel={onCancel}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              isEditing={isEditing}
            />
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface TaskFormContentProps {
  formData: TaskFormData;
  onFormChange: (data: TaskFormData) => void;
  employees: Employee[];
}

const TaskFormContent = ({ formData, onFormChange, employees }: TaskFormContentProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Название *</Label>
      <Input
        value={formData.title}
        onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
        placeholder="Название задачи"
        className="bg-muted/50 border-0 focus:ring-2 focus:ring-primary"
      />
    </div>
    <div className="space-y-2">
      <Label>Описание</Label>
      <Textarea
        value={formData.description}
        onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
        placeholder="Описание задачи..."
        rows={3}
        className="bg-muted/50 border-0 focus:ring-2 focus:ring-primary resize-none"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Приоритет</Label>
        <Select
          value={formData.priority}
          onValueChange={(value: TaskPriority) => onFormChange({ ...formData, priority: value })}
        >
          <SelectTrigger className="bg-muted/50 border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Низкий</SelectItem>
            <SelectItem value="medium">Средний</SelectItem>
            <SelectItem value="high">Высокий</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Срок</Label>
        <Input
          type="date"
          value={formData.due_date}
          onChange={(e) => onFormChange({ ...formData, due_date: e.target.value })}
          className="bg-muted/50 border-0"
        />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Исполнитель</Label>
      <Select
        value={formData.assignee_id}
        onValueChange={(value) => onFormChange({ ...formData, assignee_id: value })}
      >
        <SelectTrigger className="bg-muted/50 border-0">
          <SelectValue placeholder="Выберите исполнителя" />
        </SelectTrigger>
        <SelectContent>
          {employees.map((emp) => (
            <SelectItem key={emp.user_id} value={emp.user_id}>
              {emp.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

interface FormButtonsProps {
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditing: boolean;
}

const FormButtons = ({ onCancel, onSubmit, isSubmitting, isEditing }: FormButtonsProps) => (
  <div className="flex gap-3 pt-4">
    <Button
      variant="outline"
      onClick={onCancel}
      className="flex-1"
    >
      Отмена
    </Button>
    <Button
      onClick={onSubmit}
      disabled={isSubmitting}
      className="flex-1 bg-primary hover:bg-primary/90"
    >
      <AnimatePresence mode="wait">
        {isSubmitting ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"
          />
        ) : (
          <motion.span
            key="text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isEditing ? 'Сохранить' : 'Создать'}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  </div>
);
