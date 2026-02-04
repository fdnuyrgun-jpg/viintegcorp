import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, Plus, FileText, ChevronRight, ChevronLeft,
  MoreHorizontal, Star, Clock, Trash2, Edit3,
  BookOpen, Folder, FolderOpen, Copy,
  Sparkles, FileCode, ListChecks, MessageSquare,
  Calendar, FolderPlus,
  Type, Heading1, Heading2, Heading3, Layers, ChevronsDownUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import WikiEditor from "@/components/wiki/WikiEditor";
import { WikiAttachments } from "@/components/wiki/WikiAttachments";
import { useCodeBlockEnhancements } from "@/hooks/useCodeBlockEnhancements";
import { notifyAllUsersExcept } from "@/hooks/useNotifications";

interface WikiCategory {
  id: string;
  name: string;
  icon: string | null;
}

interface WikiFolder {
  id: string;
  name: string;
  category_id: string | null;
  parent_folder_id: string | null;
  created_by: string;
  created_at: string;
}

interface WikiDocument {
  id: string;
  title: string;
  content: string | null;
  category_id: string | null;
  folder_id: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
}

// Document templates
const TEMPLATES = [
  {
    id: 'blank',
    name: 'Пустой документ',
    icon: FileText,
    content: '',
    description: 'Начните с чистого листа'
  },
  {
    id: 'meeting',
    name: 'Протокол встречи',
    icon: MessageSquare,
    content: '<h2>Протокол встречи</h2><p><strong>Дата:</strong> </p><p><strong>Участники:</strong></p><ul><li></li></ul><h3>Повестка</h3><ol><li></li></ol><h3>Решения</h3><ul><li></li></ul><h3>Следующие шаги</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul>',
    description: 'Шаблон для заметок со встреч'
  },
  {
    id: 'process',
    name: 'Регламент процесса',
    icon: ListChecks,
    content: '<h1>Название процесса</h1><p><em>Краткое описание процесса</em></p><h2>Цель</h2><p></p><h2>Ответственные</h2><ul><li></li></ul><h2>Этапы</h2><ol><li><strong>Этап 1:</strong> </li><li><strong>Этап 2:</strong> </li></ol><h2>Чеклист</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false">Шаг 1</li><li data-type="taskItem" data-checked="false">Шаг 2</li></ul>',
    description: 'Для описания бизнес-процессов'
  },
  {
    id: 'tech',
    name: 'Техническая документация',
    icon: FileCode,
    content: '<h1>Название</h1><p><code>версия: 1.0</code></p><h2>Описание</h2><p></p><h2>Требования</h2><ul><li></li></ul><h2>Установка</h2><pre><code>команды установки</code></pre><h2>Использование</h2><pre><code>примеры использования</code></pre><h2>API</h2><h3>Эндпоинт 1</h3><pre><code>GET /api/example</code></pre>',
    description: 'Для технических спецификаций'
  },
];

const WikiPage = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [folders, setFolders] = useState<WikiFolder[]>([]);
  const [documents, setDocuments] = useState<WikiDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<WikiDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<WikiDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<WikiDocument | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [initialContent, setInitialContent] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedCategoryForFolder, setSelectedCategoryForFolder] = useState<string | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<WikiFolder | null>(null);

  const selectedDocContentRef = useRef<HTMLDivElement | null>(null);

  useCodeBlockEnhancements(selectedDocContentRef, [selectedDocument?.id, selectedDocument?.content]);

  useEffect(() => {
    fetchData();
  }, []);

  // Categories and folders are collapsed by default - no auto-expand

  // Sync favorites with existing documents - remove stale favorites
  useEffect(() => {
    if (documents.length > 0 || !loading) {
      const saved = localStorage.getItem('wiki-favorites');
      if (saved) {
        const savedFavorites: string[] = JSON.parse(saved);
        const documentIds = new Set(documents.map(d => d.id));
        // Filter out favorites that no longer exist
        const validFavorites = savedFavorites.filter(id => documentIds.has(id));
        setFavorites(new Set(validFavorites));
        // Update localStorage if stale favorites were removed
        if (validFavorites.length !== savedFavorites.length) {
          localStorage.setItem('wiki-favorites', JSON.stringify(validFavorites));
        }
      }
    }
  }, [documents, loading]);

  const toggleFavorite = (docId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(docId)) {
      newFavorites.delete(docId);
      toast.success('Удалено из избранного');
    } else {
      newFavorites.add(docId);
      toast.success('Добавлено в избранное');
    }
    setFavorites(newFavorites);
    localStorage.setItem('wiki-favorites', JSON.stringify([...newFavorites]));
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchFolders(), fetchDocuments()]);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('wiki_categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  };

  const fetchFolders = async () => {
    const { data } = await supabase
      .from('wiki_folders')
      .select('*')
      .order('name');
    setFolders(data || []);
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('wiki_documents')
      .select('*')
      .order('updated_at', { ascending: false });
    setDocuments(data || []);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return;

    const { error } = await supabase.from('wiki_folders').insert({
      name: newFolderName.trim(),
      category_id: selectedCategoryForFolder || null,
      created_by: user.id,
    });

    if (error) {
      toast.error('Ошибка создания папки');
    } else {
      toast.success('Папка создана');
      setFolderDialogOpen(false);
      setNewFolderName('');
      setSelectedCategoryForFolder(null);
      fetchFolders();
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    // Move all documents from this folder to no folder
    await supabase
      .from('wiki_documents')
      .update({ folder_id: null })
      .eq('folder_id', folderToDelete.id);

    const { error } = await supabase
      .from('wiki_folders')
      .delete()
      .eq('id', folderToDelete.id);

    if (error) {
      toast.error('Ошибка удаления папки');
    } else {
      toast.success('Папка удалена');
      fetchFolders();
      fetchDocuments();
    }

    setDeleteFolderDialogOpen(false);
    setFolderToDelete(null);
  };

  const handleSaveDocument = async (data: { title: string; content: string; category_id: string; folder_id?: string }) => {
    if (!data.title.trim()) {
      toast.error('Введите название документа');
      return;
    }

    setIsSubmitting(true);

    if (editingDocument) {
      const { data: updatedDoc, error } = await supabase
        .from('wiki_documents')
        .update({
          title: data.title.trim(),
          content: data.content.trim() || null,
          category_id: data.category_id || null,
          folder_id: data.folder_id || null,
        })
        .eq('id', editingDocument.id)
        .select()
        .single();

      if (error) {
        toast.error('Ошибка обновления');
      } else {
        toast.success('Сохранено');
        // Update selectedDocument with new data
        if (updatedDoc) {
          setSelectedDocument(updatedDoc);
        }
        setIsEditorOpen(false);
        setEditingDocument(null);
        fetchDocuments();
      }
    } else {
      if (!user?.id) {
        toast.error('Пользователь не авторизован');
        setIsSubmitting(false);
        return;
      }
      const { data: insertedDoc, error } = await supabase.from('wiki_documents').insert([{
        title: data.title.trim(),
        content: data.content.trim() || null,
        category_id: data.category_id || null,
        folder_id: data.folder_id || null,
        author_id: user.id,
      }]).select().single();

      if (error) {
        toast.error('Ошибка создания');
      } else {
        toast.success('Создано');
        setIsEditorOpen(false);
        setInitialContent('');
        fetchDocuments();
        
        // Notify all users about new wiki document
        if (user?.id && insertedDoc) {
          notifyAllUsersExcept(
            user.id,
            "wiki",
            data.title.trim(),
            "Создан новый документ в базе знаний",
            insertedDoc.id
          );
        }
      }
    }

    setIsSubmitting(false);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    const { error } = await supabase
      .from('wiki_documents')
      .delete()
      .eq('id', documentToDelete.id);

    if (error) {
      toast.error('Ошибка удаления');
    } else {
      toast.success('Удалено');
      if (selectedDocument?.id === documentToDelete.id) {
        setSelectedDocument(null);
      }
      // Remove from favorites if present
      if (favorites.has(documentToDelete.id)) {
        const newFavorites = new Set(favorites);
        newFavorites.delete(documentToDelete.id);
        setFavorites(newFavorites);
        localStorage.setItem('wiki-favorites', JSON.stringify([...newFavorites]));
      }
      fetchDocuments();
    }

    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const createFromTemplate = (template: typeof TEMPLATES[0]) => {
    setInitialContent(template.content);
    setTemplateDialogOpen(false);
    setEditingDocument(null);
    setIsEditorOpen(true);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId)?.name;
  };

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return null;
    return folders.find(f => f.id === folderId)?.name;
  };

  const filteredDocuments = useMemo(() => 
    documents.filter(doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [documents, searchQuery]
  );

  const favoriteDocuments = useMemo(() => 
    documents.filter(doc => favorites.has(doc.id)),
    [documents, favorites]
  );

  const recentDocuments = documents.slice(0, 5);

  const getPlainText = (html: string | null) => {
    if (!html) return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || null;
  };

  const getReadingTime = (content: string | null) => {
    if (!content) return 0;
    const text = getPlainText(content) || '';
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 200);
  };
  // Table of contents from content with icons
  const getTableOfContents = (content: string | null) => {
    if (!content) return [];
    const doc = new DOMParser().parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3');
    return Array.from(headings).map((h, i) => ({
      id: `heading-${i}`,
      text: h.textContent || '',
      level: parseInt(h.tagName[1])
    }));
  };

  // Add IDs to headings in content for anchor navigation
  const processContentWithHeadingIds = (content: string | null) => {
    if (!content) return '';
    const doc = new DOMParser().parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3');
    headings.forEach((h, i) => {
      h.id = `heading-${i}`;
    });
    return doc.body.innerHTML;
  };

  // Handle TOC link click
  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, headingId: string) => {
    e.preventDefault();
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL hash without triggering navigation
      window.history.pushState(null, '', `#${headingId}`);
    }
  };

  // Get icon for heading level
  const getHeadingIcon = (level: number) => {
    switch (level) {
      case 1: return Heading1;
      case 2: return Heading2;
      case 3: return Heading3;
      default: return Type;
    }
  };

  // Emoji mapping for categories
  const getCategoryEmoji = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('бухгалт')) return '💰';
    if (lowerName.includes('директор') || lowerName.includes('руковод')) return '👔';
    if (lowerName.includes('менедж')) return '📊';
    if (lowerName.includes('тех') || lowerName.includes('it') || lowerName.includes('разраб')) return '💻';
    if (lowerName.includes('hr') || lowerName.includes('кадр') || lowerName.includes('персонал')) return '👥';
    if (lowerName.includes('марк') || lowerName.includes('реклам')) return '📢';
    if (lowerName.includes('продаж') || lowerName.includes('sales')) return '🛒';
    if (lowerName.includes('юр') || lowerName.includes('право')) return '⚖️';
    if (lowerName.includes('безоп') || lowerName.includes('security')) return '🔒';
    if (lowerName.includes('обуч') || lowerName.includes('образ')) return '📚';
    return '📁';
  };

  // Get folders for a category
  const getCategoryFolders = (categoryId: string | null) => {
    return folders.filter(f => f.category_id === categoryId);
  };

  // Get documents for a folder
  const getFolderDocuments = (folderId: string) => {
    return documents.filter(d => d.folder_id === folderId);
  };

  // Get documents without folder in a category
  const getCategoryDocumentsWithoutFolder = (categoryId: string | null) => {
    return documents.filter(d => d.category_id === categoryId && !d.folder_id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (isEditorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <WikiEditor
          document={editingDocument}
          categories={categories}
          folders={folders}
          onSave={handleSaveDocument}
          onBack={() => {
            setIsEditorOpen(false);
            setEditingDocument(null);
            setInitialContent('');
          }}
          isSubmitting={isSubmitting}
          initialContent={initialContent}
          onFolderCreated={fetchFolders}
        />
      </div>
    );
  }

  const toc = selectedDocument ? getTableOfContents(selectedDocument.content) : [];

  return (
    <div className="flex min-h-[calc(100vh-120px)] -m-4 sm:-m-6">
      {/* Sidebar */}
      <div className="w-72 border-r border-border bg-muted/30 flex flex-col min-h-full">
        {/* Sidebar header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-sm">База знаний</h2>
              <p className="text-xs text-muted-foreground">{documents.length} документов</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="pl-9 pr-12 h-9 text-sm bg-background"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Collapse all button */}
            {(expandedCategories.size > 0 || expandedFolders.size > 0) && (
              <button
                onClick={() => {
                  setExpandedCategories(new Set());
                  setExpandedFolders(new Set());
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 mb-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
                Свернуть всё
              </button>
            )}
            {/* Quick actions */}
            <div className="mb-2 space-y-1">
              <button
                onClick={() => setTemplateDialogOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Новый документ
              </button>
              <button
                onClick={() => setFolderDialogOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                Новая папка
              </button>
            </div>

            {/* Favorites */}
            {favoriteDocuments.length > 0 && !searchQuery && (
              <div className="mb-2">
                <button
                  onClick={() => toggleCategory('favorites')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <ChevronRight className={cn(
                    "w-3 h-3 transition-transform",
                    expandedCategories.has('favorites') && "rotate-90"
                  )} />
                  <Star className="w-3 h-3 text-yellow-500" />
                  Избранное
                  <span className="ml-auto text-xs">{favoriteDocuments.length}</span>
                </button>
                <AnimatePresence>
                  {expandedCategories.has('favorites') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {favoriteDocuments.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => setSelectedDocument(doc)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ml-2",
                            selectedDocument?.id === doc.id
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                          <span className="truncate">{doc.title}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Recent */}
            {!searchQuery && recentDocuments.length > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => toggleCategory('recent')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <ChevronRight className={cn(
                    "w-3 h-3 transition-transform",
                    expandedCategories.has('recent') && "rotate-90"
                  )} />
                  <Clock className="w-3 h-3" />
                  Недавние
                </button>
                <AnimatePresence>
                  {expandedCategories.has('recent') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {recentDocuments.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => setSelectedDocument(doc)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ml-2",
                            selectedDocument?.id === doc.id
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                          <span className="truncate">{doc.title}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Search results */}
            {searchQuery && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Search className="w-3 h-3" />
                  Результаты ({filteredDocuments.length})
                </div>
                {filteredDocuments.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Ничего не найдено</p>
                ) : (
                  filteredDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                        selectedDocument?.id === doc.id
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0 opacity-60" />
                      <span className="truncate">{doc.title}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Categories tree with folders */}
            {!searchQuery && (
              <div>
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Folder className="w-3 h-3" />
                  Категории
                </div>
                {categories.map((category) => {
                  const categoryFolders = getCategoryFolders(category.id);
                  const categoryDocs = getCategoryDocumentsWithoutFolder(category.id);
                  const isExpanded = expandedCategories.has(category.id);
                  const totalDocs = documents.filter(d => d.category_id === category.id).length;
                  
                  return (
                    <div key={category.id}>
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <ChevronRight className={cn(
                          "w-4 h-4 transition-transform",
                          isExpanded && "rotate-90"
                        )} />
                        <span className="text-base">{getCategoryEmoji(category.name)}</span>
                        <span className="flex-1 text-left">{category.name}</span>
                        <span className="text-xs text-muted-foreground">{totalDocs}</span>
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-4 border-l border-border pl-2">
                              {/* Folders in category */}
                              {categoryFolders.map((folder) => {
                                const folderDocs = getFolderDocuments(folder.id);
                                const isFolderExpanded = expandedFolders.has(folder.id);
                                
                                return (
                                  <div key={folder.id}>
                                    <div className="flex items-center group">
                                      <button
                                        onClick={() => toggleFolder(folder.id)}
                                        className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-left hover:bg-muted"
                                      >
                                        {isFolderExpanded ? (
                                          <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
                                        ) : (
                                          <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                                        )}
                                        <span className="truncate">{folder.name}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">{folderDocs.length}</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setFolderToDelete(folder);
                                          setDeleteFolderDialogOpen(true);
                                        }}
                                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    
                                    <AnimatePresence>
                                      {isFolderExpanded && folderDocs.length > 0 && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden ml-4"
                                        >
                                          {folderDocs.map((doc) => (
                                            <button
                                              key={doc.id}
                                              onClick={() => setSelectedDocument(doc)}
                                              className={cn(
                                                "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-left",
                                                selectedDocument?.id === doc.id
                                                  ? "bg-primary/10 text-primary"
                                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                              )}
                                            >
                                              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                              <span className="truncate">{doc.title}</span>
                                              {favorites.has(doc.id) && (
                                                <Star className="w-3 h-3 text-yellow-500 ml-auto" />
                                              )}
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                              
                              {/* Documents without folder */}
                              {categoryDocs.map((doc) => (
                                <button
                                  key={doc.id}
                                  onClick={() => setSelectedDocument(doc)}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-left",
                                    selectedDocument?.id === doc.id
                                      ? "bg-primary/10 text-primary"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  )}
                                >
                                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{doc.title}</span>
                                  {favorites.has(doc.id) && (
                                    <Star className="w-3 h-3 text-yellow-500 ml-auto" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Uncategorized folders and documents */}
                {(folders.filter(f => !f.category_id).length > 0 || documents.filter(d => !d.category_id).length > 0) && (
                  <div>
                    <button
                      onClick={() => toggleCategory('uncategorized')}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform",
                        expandedCategories.has('uncategorized') && "rotate-90"
                      )} />
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 text-left">Без категории</span>
                      <span className="text-xs text-muted-foreground">
                        {documents.filter(d => !d.category_id).length}
                      </span>
                    </button>
                    
                    <AnimatePresence>
                      {expandedCategories.has('uncategorized') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-4 border-l border-border pl-2">
                            {/* Uncategorized folders */}
                            {folders.filter(f => !f.category_id).map((folder) => {
                              const folderDocs = getFolderDocuments(folder.id);
                              const isFolderExpanded = expandedFolders.has(folder.id);
                              
                              return (
                                <div key={folder.id}>
                                  <div className="flex items-center group">
                                    <button
                                      onClick={() => toggleFolder(folder.id)}
                                      className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-left hover:bg-muted"
                                    >
                                      {isFolderExpanded ? (
                                        <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
                                      ) : (
                                        <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                                      )}
                                      <span className="truncate">{folder.name}</span>
                                      <span className="text-xs text-muted-foreground ml-auto">{folderDocs.length}</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setFolderToDelete(folder);
                                        setDeleteFolderDialogOpen(true);
                                      }}
                                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  
                                  <AnimatePresence>
                                    {isFolderExpanded && folderDocs.length > 0 && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden ml-4"
                                      >
                                        {folderDocs.map((doc) => (
                                          <button
                                            key={doc.id}
                                            onClick={() => setSelectedDocument(doc)}
                                            className={cn(
                                              "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-left",
                                              selectedDocument?.id === doc.id
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                          >
                                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="truncate">{doc.title}</span>
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                            
                            {/* Uncategorized documents without folder */}
                            {documents.filter(d => !d.category_id && !d.folder_id).map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => setSelectedDocument(doc)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-left",
                                  selectedDocument?.id === doc.id
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{doc.title}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedDocument ? (
            <motion.div
              key="document"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Document header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 mr-2"
                    onClick={() => setSelectedDocument(null)}
                    title="Закрыть документ"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  {getCategoryName(selectedDocument.category_id) && (
                    <>
                      <span>{getCategoryEmoji(getCategoryName(selectedDocument.category_id) || '')}</span>
                      <span>{getCategoryName(selectedDocument.category_id)}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                  {getFolderName(selectedDocument.folder_id) && (
                    <>
                      <span>📂</span>
                      <span>{getFolderName(selectedDocument.folder_id)}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                  <span className="text-foreground font-medium">{selectedDocument.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleFavorite(selectedDocument.id)}
                  >
                    <Star className={cn(
                      "w-4 h-4",
                      favorites.has(selectedDocument.id) && "fill-yellow-500 text-yellow-500"
                    )} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingDocument(selectedDocument);
                        setIsEditorOpen(true);
                      }}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Ссылка скопирована');
                      }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Копировать ссылку
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          setDocumentToDelete(selectedDocument);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingDocument(selectedDocument);
                      setIsEditorOpen(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Редактировать
                  </Button>
                </div>
              </div>

              {/* Document content with optional TOC */}
              <div className="flex-1 flex overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="max-w-3xl mx-auto px-8 py-10">
                    <h1 className="text-4xl font-bold mb-6">{selectedDocument.title}</h1>
                    
                    <div className="flex flex-wrap items-center gap-4 pb-6 mb-8 border-b border-border text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(selectedDocument.created_at), 'd MMMM yyyy', { locale: ru })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {getReadingTime(selectedDocument.content)} мин чтения
                      </div>
                      {getCategoryName(selectedDocument.category_id) && (
                        <Badge variant="secondary" className="gap-1">
                          <span>{getCategoryEmoji(getCategoryName(selectedDocument.category_id) || '')}</span>
                          {getCategoryName(selectedDocument.category_id)}
                        </Badge>
                      )}
                      {getFolderName(selectedDocument.folder_id) && (
                        <Badge variant="outline" className="gap-1">
                          <span>📂</span>
                          {getFolderName(selectedDocument.folder_id)}
                        </Badge>
                      )}
                    </div>

                    <div className="prose prose-neutral dark:prose-invert max-w-none wiki-content">
                      {selectedDocument.content ? (
                        <div 
                          className="leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: processContentWithHeadingIds(selectedDocument.content) }}
                          ref={selectedDocContentRef}
                        />
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground mb-4">Документ пуст</p>
                          <Button onClick={() => {
                            setEditingDocument(selectedDocument);
                            setIsEditorOpen(true);
                          }}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Добавить содержимое
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Document attachments */}
                    <WikiAttachments documentId={selectedDocument.id} />
                  </div>
                </ScrollArea>

                {/* Table of contents with icons */}
                {toc.length > 2 && (
                  <div className="w-56 border-l border-border p-4 hidden xl:block">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Содержание
                    </h3>
                    <nav className="space-y-1">
                      {toc.map((heading) => {
                        const HeadingIcon = getHeadingIcon(heading.level);
                        return (
                          <a
                            key={heading.id}
                            href={`#${heading.id}`}
                            onClick={(e) => handleTocClick(e, heading.id)}
                            className={cn(
                              "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors",
                              heading.level === 1 && "font-medium",
                              heading.level === 2 && "pl-2",
                              heading.level === 3 && "pl-4 text-xs"
                            )}
                          >
                            <HeadingIcon className={cn(
                              "flex-shrink-0",
                              heading.level === 1 && "w-4 h-4",
                              heading.level === 2 && "w-3.5 h-3.5",
                              heading.level === 3 && "w-3 h-3"
                            )} />
                            <span className="truncate">{heading.text}</span>
                          </a>
                        );
                      })}
                    </nav>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Добро пожаловать в Wiki</h2>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                Создавайте документацию, регламенты и базу знаний вашей команды
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setTemplateDialogOpen(true)} size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Создать документ
                </Button>
                <Button onClick={() => setFolderDialogOpen(true)} variant="outline" size="lg" className="gap-2">
                  <FolderPlus className="w-5 h-5" />
                  Создать папку
                </Button>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-8 mt-12">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{documents.length}</p>
                  <p className="text-sm text-muted-foreground">Документов</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{folders.length}</p>
                  <p className="text-sm text-muted-foreground">Папок</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{categories.length}</p>
                  <p className="text-sm text-muted-foreground">Категорий</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{favorites.size}</p>
                  <p className="text-sm text-muted-foreground">В избранном</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Template selection dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Создать документ</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 mt-4">
            {TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => createFromTemplate(template)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create folder dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создать папку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Название папки</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Моя папка"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Категория (опционально)</label>
              <select
                value={selectedCategoryForFolder || ''}
                onChange={(e) => setSelectedCategoryForFolder(e.target.value || null)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Без категории</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder dialog */}
      <AlertDialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить папку?</AlertDialogTitle>
            <AlertDialogDescription>
              Папка «{folderToDelete?.name}» будет удалена. Документы из этой папки останутся без папки.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete document dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
            <AlertDialogDescription>
              Документ «{documentToDelete?.title}» будет удалён безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WikiPage;
