import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PRESENCE_CHANNEL = "viintegcorp:online";

export function useOnlineUsers(currentUserId: string | undefined) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel(PRESENCE_CHANNEL);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>();
        Object.values(state).forEach((presences) => {
          (presences as Array<{ user_id?: string }>).forEach((p) => {
            if (p.user_id) ids.add(p.user_id);
          });
        });
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return { onlineUserIds, isOnline: currentUserId ? onlineUserIds.has(currentUserId) : false };
}
