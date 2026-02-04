import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Trash2, Send, Pencil, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_name?: string;
  user_id?: string;
  avatar_url?: string;
}

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    author_name?: string;
    author_avatar?: string;
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
  };
  currentUserId?: string;
  isAdmin: boolean;
  userName: string;
  comments: Comment[];
  expandedComments: string | null;
  maxCommentsPreview?: number;
  userAvatar?: string;
  onEdit: (postId: string, content: string) => void;
  onLike: (postId: string, isLiked: boolean) => void;
  onDelete: (postId: string) => void;
  onLoadComments: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const PostCard = ({
  post,
  currentUserId,
  isAdmin,
  userName,
  comments,
  expandedComments,
  maxCommentsPreview = 3,
  userAvatar,
  onEdit,
  onLike,
  onDelete,
  onLoadComments,
  onAddComment,
  onDeleteComment,
}: PostCardProps) => {
  const [showAllComments, setShowAllComments] = useState(false);
  
  // Show only last N comments unless expanded
  const displayedComments = showAllComments 
    ? comments 
    : comments.slice(-maxCommentsPreview);
  const hiddenCommentsCount = comments.length - maxCommentsPreview;
  const [newComment, setNewComment] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditing]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(post.id);
    }, 200);
  };

  const handleStartEdit = () => {
    setEditContent(post.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== post.content) {
      onEdit(post.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(post.id, newComment.trim());
      setNewComment("");
    }
  };

  const isOwner = post.user_id === currentUserId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: isDeleting ? 0 : 1, 
        y: isDeleting ? -20 : 0, 
        scale: isDeleting ? 0.95 : 1 
      }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ 
        duration: 0.3, 
        ease: "easeOut",
        layout: { duration: 0.3 }
      }}
      className="glass rounded-xl p-4 space-y-4"
    >
      <div className="flex items-start gap-3">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden"
        >
          {post.author_avatar ? (
            <img src={post.author_avatar} alt={post.author_name} className="w-full h-full object-cover" />
          ) : (
            getInitials(post.author_name || 'U')
          )}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{post.author_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru })}
              </span>
            </div>
            {(isOwner || isAdmin) && !isEditing && (
              <div className="flex items-center gap-1">
                {isOwner && (
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={handleStartEdit}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
          
          {/* Content / Editor */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editor"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2"
              >
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative"
                >
                  <Textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[80px] bg-muted/50 border-primary/50 focus:border-primary resize-none transition-all"
                    placeholder="Введите текст..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSaveEdit();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center justify-between mt-2"
                  >
                    <span className="text-xs text-muted-foreground">
                      Ctrl+Enter для сохранения, Esc для отмены
                    </span>
                    <div className="flex items-center gap-2">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-8 gap-1"
                        >
                          <X className="w-4 h-4" />
                          Отмена
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!editContent.trim()}
                          className="h-8 gap-1"
                        >
                          <Check className="w-4 h-4" />
                          Сохранить
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.p 
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-foreground mt-1"
              >
                {post.content}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!isEditing && (
        <div className="flex items-center gap-4 text-sm">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onLike(post.id, post.is_liked)}
            className={`flex items-center gap-1 transition-colors ${
              post.is_liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
            }`}
          >
            <motion.div
              animate={post.is_liked ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart className={`w-4 h-4 ${post.is_liked ? 'fill-current' : ''}`} />
            </motion.div>
            Нравится {post.likes_count > 0 && `(${post.likes_count})`}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onLoadComments(post.id)}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {post.comments_count} Коммент.
          </motion.button>
        </div>
      )}

      {/* Comments section */}
      <motion.div
        initial={false}
        animate={{ 
          height: expandedComments === post.id ? "auto" : 0,
          opacity: expandedComments === post.id ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        {expandedComments === post.id && (
          <div className="border-t border-border pt-4 space-y-3">
            {/* Show more comments button */}
            {hiddenCommentsCount > 0 && !showAllComments && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowAllComments(true)}
                className="text-sm text-primary hover:underline w-full text-center py-1"
              >
                Показать ещё {hiddenCommentsCount} комментари{hiddenCommentsCount === 1 ? 'й' : hiddenCommentsCount < 5 ? 'я' : 'ев'}
              </motion.button>
            )}
            
            {displayedComments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-2 bg-muted/30 rounded-lg p-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                  {comment.avatar_url ? (
                    <img src={comment.avatar_url} alt={comment.author_name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(comment.author_name || 'U')
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{comment.author_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ru })}
                      </span>
                    </div>
                    {(comment.user_id === currentUserId || isAdmin) && onDeleteComment && (
                      <motion.div 
                        whileHover={{ scale: 1.1 }} 
                        whileTap={{ scale: 0.9 }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteComment(post.id, comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                </div>
              </motion.div>
            ))}
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  getInitials(userName)
                )}
              </div>
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Написать комментарий..."
                className="flex-1 bg-muted/30 border-0 text-sm h-9"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-9 w-9"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PostCard;
