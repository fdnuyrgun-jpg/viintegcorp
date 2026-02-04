import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Bell, X, CheckCheck, Trash2, 
  Newspaper, CheckSquare, BookOpen, FileIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Notification } from "@/hooks/useNotifications";

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDelete: (id: string) => void;
}

const TYPE_CONFIG = {
  news: { icon: Newspaper, color: "text-amber-500", bg: "bg-amber-500/10" },
  task: { icon: CheckSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
  wiki: { icon: BookOpen, color: "text-purple-500", bg: "bg-purple-500/10" },
  file: { icon: FileIcon, color: "text-green-500", bg: "bg-green-500/10" },
};

const TYPE_LABELS = {
  news: "Новость",
  task: "Задача",
  wiki: "Wiki",
  file: "Файл",
};

export function NotificationCenter({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDelete,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-xs font-medium rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Уведомления</h4>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                {unreadCount} новых
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={onMarkAllAsRead}
              >
                <CheckCheck className="w-3 h-3" />
                Прочитать все
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={onClearAll}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-80">
          {notifications.length > 0 ? (
            <AnimatePresence initial={false}>
              {notifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type];
                const Icon = config.icon;

                return (
                  <motion.div 
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer group relative",
                      !notification.is_read && "bg-primary/5"
                    )}
                    onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        config.bg
                      )}>
                        <Icon className={cn("w-4 h-4", config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm truncate",
                              !notification.is_read && "font-medium"
                            )}>
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {notification.message}
                              </p>
                            )}
                          </div>
                          
                          {/* Unread indicator */}
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            config.bg, config.color
                          )}>
                            {TYPE_LABELS[notification.type]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete button on hover */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Нет уведомлений
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
