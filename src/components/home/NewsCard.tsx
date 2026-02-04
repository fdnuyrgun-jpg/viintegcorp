import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Sparkles, MessageCircle, ChevronDown, ChevronUp, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  reactions: Record<string, { count: number; isReacted: boolean }>;
  comments_count: number;
}

interface NewsComment {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
  user_id: string;
  avatar_url?: string;
}

interface NewsCardProps {
  item: NewsItem;
  comments: NewsComment[];
  expandedComments: string | null;
  currentUserId?: string;
  currentUserAvatar?: string;
  onReact: (newsId: string, reaction: string, isReacted: boolean) => void;
  onLoadComments: (newsId: string) => void;
  onAddComment: (newsId: string, content: string) => void;
  onDeleteComment: (newsId: string, commentId: string) => void;
}

const REACTIONS = [
  { key: "like", emoji: "👍", label: "Нравится" },
  { key: "heart", emoji: "❤️", label: "Люблю" },
  { key: "fire", emoji: "🔥", label: "Огонь" },
  { key: "celebrate", emoji: "🎉", label: "Праздник" },
  { key: "sad", emoji: "😢", label: "Грустно" },
];

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const NewsCard = ({
  item,
  comments,
  expandedComments,
  currentUserId,
  currentUserAvatar,
  onReact,
  onLoadComments,
  onAddComment,
  onDeleteComment,
}: NewsCardProps) => {
  const [newComment, setNewComment] = useState("");
  const isExpanded = expandedComments === item.id;

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    onAddComment(item.id, newComment.trim());
    setNewComment("");
  };

  const totalReactions = Object.values(item.reactions).reduce(
    (sum, r) => sum + r.count,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative overflow-hidden rounded-xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500" />
      <div className="absolute top-2 right-2">
        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
      </div>

      <div className="p-4 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-lg">{item.title}</h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: true,
              locale: ru,
            })}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {item.content}
        </p>

        {/* Reactions */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {REACTIONS.map((reaction) => {
            const data = item.reactions[reaction.key] || { count: 0, isReacted: false };
            return (
              <motion.button
                key={reaction.key}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onReact(item.id, reaction.key, data.isReacted)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all",
                  data.isReacted
                    ? "bg-primary/20 border border-primary/50"
                    : "bg-muted/50 hover:bg-muted border border-transparent"
                )}
                title={reaction.label}
              >
                <span>{reaction.emoji}</span>
                {data.count > 0 && (
                  <span className="text-xs font-medium">{data.count}</span>
                )}
              </motion.button>
            );
          })}
          
          {totalReactions > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              {totalReactions} реакций
            </span>
          )}
        </div>

        {/* Comments toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLoadComments(item.id)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Комментарии ({item.comments_count})</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        {/* Comments section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-3 overflow-hidden"
            >
              {/* Comment input */}
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                  {currentUserAvatar ? (
                    <img src={currentUserAvatar} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <span>👤</span>
                  )}
                </div>
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="flex-1 h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  className="h-9"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Comments list */}
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Нет комментариев. Будьте первым!
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-muted/30 rounded-lg p-3 group"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                          {comment.avatar_url ? (
                            <img src={comment.avatar_url} alt={comment.author_name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(comment.author_name)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {comment.author_name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), {
                                  addSuffix: true,
                                  locale: ru,
                                })}
                              </span>
                              {currentUserId === comment.user_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => onDeleteComment(item.id, comment.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NewsCard;
