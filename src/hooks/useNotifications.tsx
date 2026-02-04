import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Notification {
  id: string;
  user_id: string;
  type: "news" | "task" | "wiki" | "file";
  title: string;
  message: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  news: "Новость",
  task: "Задача",
  wiki: "Wiki",
  file: "Файл",
};

const TYPE_ICONS: Record<string, string> = {
  news: "📰",
  task: "✅",
  wiki: "📖",
  file: "📁",
};

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const typedData = (data || []).map(n => ({
        ...n,
        type: n.type as "news" | "task" | "wiki" | "file"
      }));

      setNotifications(typedData);
      setUnreadCount(typedData.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .match({ user_id: userId, is_read: false });

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [userId]);

  const clearAll = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
      toast.success("Уведомления очищены");
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Ошибка при очистке уведомлений");
    }
  }, [userId]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const notification = notifications.find((n) => n.id === notificationId);
      
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, [notifications]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = {
            ...payload.new,
            type: payload.new.type as "news" | "task" | "wiki" | "file"
          } as Notification;
          
          setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);

          // Show toast notification
          toast(
            `${TYPE_ICONS[newNotification.type]} ${TYPE_LABELS[newNotification.type]}: ${newNotification.title}`,
            {
              description: newNotification.message || undefined,
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
    refetch: fetchNotifications,
  };
}

// Helper function to create a notification
export async function createNotification(
  userId: string,
  type: "news" | "task" | "wiki" | "file",
  title: string,
  message?: string,
  referenceId?: string
) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message: message || null,
      reference_id: referenceId || null,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// Helper function to notify all users except the creator
export async function notifyAllUsersExcept(
  excludeUserId: string,
  type: "news" | "task" | "wiki" | "file",
  title: string,
  message?: string,
  referenceId?: string
) {
  try {
    // Get all active users except the creator
    const { data: employees, error: fetchError } = await supabase
      .from("employees")
      .select("user_id")
      .eq("is_active", true)
      .not("user_id", "is", null)
      .neq("user_id", excludeUserId);

    if (fetchError) throw fetchError;

    if (!employees || employees.length === 0) return;

    // Create notifications for each user
    const notifications = employees
      .filter((e) => e.user_id)
      .map((e) => ({
        user_id: e.user_id!,
        type,
        title,
        message: message || null,
        reference_id: referenceId || null,
      }));

    if (notifications.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;
    }
  } catch (error) {
    console.error("Error notifying users:", error);
  }
}
