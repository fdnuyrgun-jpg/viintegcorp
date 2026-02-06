import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, CheckSquare, FileText, Bell, Clock, ChevronRight, Megaphone
} from "lucide-react";
import { toast } from "sonner";

import PostCard from "@/components/home/PostCard";
import CreatePostInput from "@/components/home/CreatePostInput";
import StatsCard from "@/components/home/StatsCard";
import FeedSkeleton from "@/components/home/FeedSkeleton";
import StatsSkeleton from "@/components/home/StatsSkeleton";
import NewsCard from "@/components/home/NewsCard";

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

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

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_name?: string;
  user_id?: string;
  avatar_url?: string;
}

interface Stats {
  teamCount: number;
  tasksCount: number;
  documentsCount: number;
  newsCount: number;
}

interface Task {
  id: string;
  title: string;
  due_date: string | null;
}

const POSTS_PER_PAGE = 10;
const NEWS_PER_PAGE = 3;

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [displayedPostsCount, setDisplayedPostsCount] = useState(POSTS_PER_PAGE);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [displayedNewsCount, setDisplayedNewsCount] = useState(NEWS_PER_PAGE);
  const [newsComments, setNewsComments] = useState<Record<string, NewsComment[]>>({});
  const [expandedNewsComments, setExpandedNewsComments] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ teamCount: 0, tasksCount: 0, documentsCount: 0, newsCount: 0 });
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  
  // Get current user's name and avatar for optimistic updates
  const [currentUserName, setCurrentUserName] = useState<string>('Пользователь');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(undefined);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Доброе утро" : currentHour < 18 ? "Добрый день" : "Добрый вечер";

  useEffect(() => {
    if (user) {
      fetchData();
      fetchCurrentUserName();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user]);

  const fetchCurrentUserName = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.warn('Error fetching current user name:', error);
        return;
      }
      
      if (data) {
        // Извлекаем только имя (второе слово в ФИО: Фамилия Имя Отчество)
        const nameParts = data.full_name.split(' ');
        const firstName = nameParts.length > 1 ? nameParts[1] : nameParts[0];
        setCurrentUserName(firstName);
        setCurrentUserAvatar(data.avatar_url || undefined);
      }
    } catch (error) {
      console.error('Exception in fetchCurrentUserName:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('posts-and-news-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        void fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => {
        void fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => {
        void fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        void fetchNews();
      })
      .subscribe();

    return async () => {
      await supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchStats(), fetchPosts(), fetchMyTasks(), fetchNews()]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async () => {
    try {
      const { data: newsData, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_official', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Error fetching news:', error);
        return;
      }

      if (!newsData || newsData.length === 0) {
        setNews([]);
        return;
      }

      const newsIds = newsData.map(n => n.id);
      
      // Fetch reactions
      const { data: reactions } = await supabase
        .from('news_reactions')
        .select('news_id, reaction, user_id')
        .in('news_id', newsIds);

      // Fetch comments count
      const { data: commentsData } = await supabase
        .from('news_comments')
        .select('news_id')
        .in('news_id', newsIds);

      // Process reactions
      const reactionsMap = new Map<string, Record<string, { count: number; isReacted: boolean }>>();
      reactions?.forEach(r => {
        if (!reactionsMap.has(r.news_id)) {
          reactionsMap.set(r.news_id, {});
        }
        const newsReactions = reactionsMap.get(r.news_id)!;
        if (!newsReactions[r.reaction]) {
          newsReactions[r.reaction] = { count: 0, isReacted: false };
        }
        newsReactions[r.reaction].count++;
        if (r.user_id === user?.id) {
          newsReactions[r.reaction].isReacted = true;
        }
      });

      // Process comments count
      const commentsCountMap = new Map<string, number>();
      commentsData?.forEach(c => {
        commentsCountMap.set(c.news_id, (commentsCountMap.get(c.news_id) || 0) + 1);
      });

      const enrichedNews: NewsItem[] = newsData.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        created_at: n.created_at,
        reactions: reactionsMap.get(n.id) || {},
        comments_count: commentsCountMap.get(n.id) || 0,
      }));

      setNews(enrichedNews);
    } catch (error) {
      console.error('Exception in fetchNews:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [employees, tasks, files, newsData] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact' }),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('assignee_id', user?.id),
        supabase.from('files').select('id', { count: 'exact' }),
        supabase.from('news').select('id', { count: 'exact' }).eq('is_official', true),
      ]);

      setStats({
        teamCount: employees.count || 0,
        tasksCount: tasks.count || 0,
        documentsCount: files.count || 0,
        newsCount: newsData.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setFeedLoading(true);
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // Get author names and avatars
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const employeeMap = new Map(employees?.map(e => [e.user_id, { name: e.full_name, avatar: e.avatar_url }]) || []);

      // Get likes and comments counts
      const postIds = postsData.map(p => p.id);
      
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('post_id')
        .in('post_id', postIds);

      const likesMap = new Map<string, { count: number; isLiked: boolean }>();
      likes?.forEach(like => {
        const current = likesMap.get(like.post_id) || { count: 0, isLiked: false };
        current.count++;
        if (like.user_id === user?.id) current.isLiked = true;
        likesMap.set(like.post_id, current);
      });

      const commentsCountMap = new Map<string, number>();
      commentsData?.forEach(c => {
        commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1);
      });

      const enrichedPosts: Post[] = postsData.map(post => ({
        ...post,
        author_name: employeeMap.get(post.user_id)?.name || 'Пользователь',
        author_avatar: employeeMap.get(post.user_id)?.avatar || undefined,
        likes_count: likesMap.get(post.id)?.count || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        is_liked: likesMap.get(post.id)?.isLiked || false,
      }));

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Exception in fetchPosts:', error);
    } finally {
      setFeedLoading(false);
    }
  };

  const fetchMyTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('assignee_id', user?.id)
        .neq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Error fetching tasks:', error);
        return;
      }

      setMyTasks(data || []);
    } catch (error) {
      console.error('Exception in fetchMyTasks:', error);
    }
  };

  const handleCreatePost = async (content: string) => {
    if (!user) return;

    try {
      // Get current user's name from employees
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (empError) {
        toast.error('Ошибка при загрузке данных пользователя');
        return;
      }

      const authorName = empData?.full_name || 'Пользователь';
      const tempId = `temp-${Date.now()}`;
      
      // Optimistic update - add post immediately to UI
      const newPost: Post = {
        id: tempId,
        user_id: user.id,
        content,
        created_at: new Date().toISOString(),
        author_name: authorName,
        likes_count: 0,
        comments_count: 0,
        is_liked: false,
      };
      
      setPosts(prev => [newPost, ...prev]);

      const { data, error } = await supabase.from('posts').insert({
        user_id: user.id,
        content,
      }).select().single();

      if (error) {
        toast.error('Ошибка создания поста');
        // Revert on error
        setPosts(prev => prev.filter(p => p.id !== tempId));
      } else if (data) {
        // Replace temp post with real one
        setPosts(prev => prev.map(p => 
          p.id === tempId ? { ...newPost, id: data.id } : p
        ));
        toast.success('Пост опубликован');
      }
    } catch (error) {
      console.error('Exception in handleCreatePost:', error);
      toast.error('Ошибка при создании поста');
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, is_liked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ));

    try {
      if (isLiked) {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) {
          // Revert on error
          setPosts(prev => prev.map(p => 
            p.id === postId 
              ? { ...p, is_liked: true, likes_count: p.likes_count + 1 }
              : p
          ));
          console.error('Error unliking post:', error);
        }
      } else {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
        if (error) {
          // Revert on error
          setPosts(prev => prev.map(p => 
            p.id === postId 
              ? { ...p, is_liked: false, likes_count: p.likes_count - 1 }
              : p
          ));
          console.error('Error liking post:', error);
        }
      }
    } catch (error) {
      console.error('Exception in handleLike:', error);
      // Revert on error
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, is_liked: isLiked, likes_count: isLiked ? p.likes_count + 1 : p.likes_count - 1 }
          : p
      ));
    }
  };

  const handleEditPost = async (postId: string, content: string) => {
    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, content } : p
    ));

    const { error } = await supabase
      .from('posts')
      .update({ content })
      .eq('id', postId);

    if (error) {
      toast.error('Ошибка редактирования поста');
      fetchPosts(); // Revert
    } else {
      toast.success('Пост обновлён');
    }
  };

  const handleDeletePost = async (postId: string) => {
    // Optimistic update - remove from UI immediately
    setPosts(prev => prev.filter(p => p.id !== postId));

    // Delete likes and comments first, then the post
    await supabase.from('post_likes').delete().eq('post_id', postId);
    await supabase.from('post_comments').delete().eq('post_id', postId);
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    
    if (error) {
      toast.error('Ошибка удаления поста');
      // Revert on error
      fetchPosts();
    } else {
      toast.success('Пост удалён');
    }
  };

  const loadComments = async (postId: string) => {
    if (expandedComments === postId) {
      setExpandedComments(null);
      return;
    }

    const { data } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    const userIds = [...new Set(data?.map(c => c.user_id) || [])];
    const { data: employees } = await supabase
      .from('employees')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    const employeeMap = new Map(employees?.map(e => [e.user_id, { name: e.full_name, avatar: e.avatar_url }]) || []);

    setComments(prev => ({
      ...prev,
      [postId]: (data || []).map(c => ({
        ...c,
        author_name: employeeMap.get(c.user_id)?.name || 'Пользователь',
        avatar_url: employeeMap.get(c.user_id)?.avatar || undefined,
        user_id: c.user_id,
      })),
    }));
    setExpandedComments(postId);
  };

  const handleAddComment = async (postId: string, content: string) => {
    if (!user) return;
    
    const tempId = `temp-comment-${Date.now()}`;
    const newComment: Comment = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      author_name: currentUserName,
      user_id: user.id,
      avatar_url: currentUserAvatar,
    };

    // Optimistic update - add comment immediately
    setComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }));
    
    // Update comments count optimistically
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
    ));

    const { data, error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: user.id,
      content,
    }).select().single();

    if (error) {
      toast.error('Ошибка добавления комментария');
      // Revert on error
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== tempId),
      }));
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
      ));
    } else {
      // Replace temp comment with real one
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => 
          c.id === tempId ? { ...newComment, id: data.id } : c
        ),
      }));
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    // Optimistic update - remove from UI immediately
    setComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(c => c.id !== commentId),
    }));
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
    ));

    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Ошибка удаления комментария');
      // Revert - reload comments
      loadComments(postId);
    } else {
      toast.success('Комментарий удалён');
    }
  };

  const loadMorePosts = () => {
    setDisplayedPostsCount(prev => prev + POSTS_PER_PAGE);
  };

  const loadMoreNews = () => {
    setDisplayedNewsCount(prev => prev + NEWS_PER_PAGE);
  };

  const displayedPosts = posts.slice(0, displayedPostsCount);
  const hasMorePosts = posts.length > displayedPostsCount;

  const displayedNews = news.slice(0, displayedNewsCount);
  const hasMoreNews = news.length > displayedNewsCount;

  // News reactions
  const handleNewsReaction = async (newsId: string, reaction: string, isReacted: boolean) => {
    // Optimistic update
    setNews(prev => prev.map(n => {
      if (n.id !== newsId) return n;
      const newReactions = { ...n.reactions };
      if (!newReactions[reaction]) {
        newReactions[reaction] = { count: 0, isReacted: false };
      }
      if (isReacted) {
        newReactions[reaction] = {
          count: Math.max(0, newReactions[reaction].count - 1),
          isReacted: false,
        };
      } else {
        newReactions[reaction] = {
          count: newReactions[reaction].count + 1,
          isReacted: true,
        };
      }
      return { ...n, reactions: newReactions };
    }));

    if (isReacted) {
      await supabase
        .from('news_reactions')
        .delete()
        .eq('news_id', newsId)
        .eq('user_id', user?.id)
        .eq('reaction', reaction);
    } else {
      await supabase.from('news_reactions').insert({
        news_id: newsId,
        user_id: user?.id,
        reaction,
      });
    }
  };

  // News comments
  const loadNewsComments = async (newsId: string) => {
    if (expandedNewsComments === newsId) {
      setExpandedNewsComments(null);
      return;
    }

    const { data } = await supabase
      .from('news_comments')
      .select('*')
      .eq('news_id', newsId)
      .order('created_at', { ascending: true });

    const userIds = [...new Set(data?.map(c => c.user_id) || [])];
    const { data: employees } = await supabase
      .from('employees')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    const employeeMap = new Map(employees?.map(e => [e.user_id, { name: e.full_name, avatar: e.avatar_url }]) || []);

    setNewsComments(prev => ({
      ...prev,
      [newsId]: (data || []).map(c => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author_name: employeeMap.get(c.user_id)?.name || 'Пользователь',
        avatar_url: employeeMap.get(c.user_id)?.avatar || undefined,
        user_id: c.user_id,
      })),
    }));
    setExpandedNewsComments(newsId);
  };

  const handleAddNewsComment = async (newsId: string, content: string) => {
    if (!user) return;
    
    const tempId = `temp-news-comment-${Date.now()}`;
    const newComment: NewsComment = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      author_name: currentUserName,
      user_id: user.id,
      avatar_url: currentUserAvatar,
    };

    // Optimistic update - add comment immediately
    setNewsComments(prev => ({
      ...prev,
      [newsId]: [...(prev[newsId] || []), newComment],
    }));
    
    // Update comments count optimistically
    setNews(prev => prev.map(n => 
      n.id === newsId ? { ...n, comments_count: n.comments_count + 1 } : n
    ));

    const { data, error } = await supabase.from('news_comments').insert({
      news_id: newsId,
      user_id: user.id,
      content,
    }).select().single();

    if (error) {
      toast.error('Ошибка добавления комментария');
      // Revert on error
      setNewsComments(prev => ({
        ...prev,
        [newsId]: (prev[newsId] || []).filter(c => c.id !== tempId),
      }));
      setNews(prev => prev.map(n => 
        n.id === newsId ? { ...n, comments_count: Math.max(0, n.comments_count - 1) } : n
      ));
    } else {
      // Replace temp comment with real one
      setNewsComments(prev => ({
        ...prev,
        [newsId]: (prev[newsId] || []).map(c => 
          c.id === tempId ? { ...newComment, id: data.id } : c
        ),
      }));
    }
  };

  const handleDeleteNewsComment = async (newsId: string, commentId: string) => {
    // Optimistic update
    setNewsComments(prev => ({
      ...prev,
      [newsId]: prev[newsId]?.filter(c => c.id !== commentId) || [],
    }));
    setNews(prev => prev.map(n => 
      n.id === newsId ? { ...n, comments_count: Math.max(0, n.comments_count - 1) } : n
    ));

    const { error } = await supabase
      .from('news_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Ошибка удаления комментария');
      loadNewsComments(newsId);
    } else {
      toast.success('Комментарий удалён');
    }
  };

  const statCards = [
    { icon: Users, label: "Команда", value: stats.teamCount, color: "from-blue-500 to-blue-600", link: "/dashboard/team" },
    { icon: CheckSquare, label: "Мои задачи", value: stats.tasksCount, color: "from-green-500 to-green-600", link: "/dashboard/tasks" },
    { icon: FileText, label: "Документы", value: stats.documentsCount, color: "from-orange-500 to-orange-600", link: "/dashboard/files" },
    { icon: Bell, label: "Новости", value: stats.newsCount, color: "from-red-500 to-red-600", link: null },
  ];

  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-2xl p-6 bg-gradient-to-r from-primary/20 to-accent/20 relative overflow-hidden"
      >
        <div className="relative z-10">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl sm:text-3xl font-bold"
          >
            {greeting}, {currentUserName}! 👋
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mt-2"
          >
            На сегодня у вас {stats.tasksCount} активных задач. Проверьте последние обновления и объявления.
          </motion.p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-right"
          >
            <div className="text-xs text-muted-foreground">ДАТА</div>
            <div className="font-semibold">{dateStr}</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="text-right"
          >
            <div className="text-xs text-muted-foreground">ВРЕМЯ</div>
            <div className="font-semibold flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {timeStr}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats cards */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <StatsCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              onClick={stat.link ? () => navigate(stat.link) : undefined}
              index={index}
            />
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main feed */}
        <div className="space-y-4">
          {/* Official News Section - Above the feed */}
          {news.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-amber-500">Официальные новости</h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {displayedNews.length} из {news.length}
                </span>
              </div>
              
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {displayedNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      item={item}
                      comments={newsComments[item.id] || []}
                      expandedComments={expandedNewsComments}
                      currentUserId={user?.id}
                      currentUserAvatar={currentUserAvatar}
                      onReact={handleNewsReaction}
                      onLoadComments={loadNewsComments}
                      onAddComment={handleAddNewsComment}
                      onDeleteComment={handleDeleteNewsComment}
                    />
                  ))}
                </AnimatePresence>
                
                {hasMoreNews && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={loadMoreNews}
                    className="w-full py-2 text-sm text-amber-500 hover:text-amber-400 glass rounded-xl transition-colors border border-amber-500/20"
                  >
                    Показать ещё ({news.length - displayedNewsCount} новостей)
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* Create post */}
          <CreatePostInput userName={currentUserName} userAvatar={currentUserAvatar} onSubmit={handleCreatePost} />

          {/* Feed header */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Живая лента</h2>
          </motion.div>

          {/* Posts */}
          {feedLoading ? (
            <FeedSkeleton />
          ) : posts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-xl p-12 text-center"
            >
              <p className="text-muted-foreground">Лента пуста. Будьте первым!</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {displayedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id}
                    isAdmin={isAdmin}
                    userName={currentUserName}
                    userAvatar={currentUserAvatar}
                    comments={comments[post.id] || []}
                    expandedComments={expandedComments}
                    onEdit={handleEditPost}
                    onLike={handleLike}
                    onDelete={handleDeletePost}
                    onLoadComments={loadComments}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                  />
                ))}
              </AnimatePresence>
              
              {hasMorePosts && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={loadMorePosts}
                  className="w-full py-3 text-sm text-primary hover:text-primary/80 glass rounded-xl transition-colors"
                >
                  Показать ещё ({posts.length - displayedPostsCount} постов)
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* My tasks widget */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl p-4 bg-gradient-to-br from-primary/10 to-accent/10"
          >
            <div className="flex items-center justify-between mb-4">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate('/dashboard/tasks')}
              >
                <CheckSquare className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">МОИ ЗАДАЧИ</h3>
              </motion.div>
              {myTasks.length > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-primary text-xs flex items-center justify-center font-semibold"
                >
                  {myTasks.length}
                </motion.span>
              )}
            </div>
            
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет активных задач
              </p>
            ) : (
              <div className="space-y-2">
                {myTasks.map((task, index) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    onClick={() => navigate('/dashboard/tasks')}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : 'Без срока'}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
