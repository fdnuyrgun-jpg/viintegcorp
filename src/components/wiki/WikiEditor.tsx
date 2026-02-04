import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Save, Hash, MoreHorizontal, Star, Trash2, Eye, EyeOff, Folder, FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import RichTextEditor from "./RichTextEditor";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
}

interface WikiDocument {
  id: string;
  title: string;
  content: string | null;
  category_id: string | null;
  folder_id?: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
}

interface WikiEditorProps {
  document?: WikiDocument | null;
  categories: WikiCategory[];
  folders?: WikiFolder[];
  onSave: (data: { title: string; content: string; category_id: string; folder_id?: string }) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
  initialContent?: string;
  onFolderCreated?: () => void;
}

const WikiEditor = ({ document, categories, folders = [], onSave, onBack, isSubmitting, initialContent = '', onFolderCreated }: WikiEditorProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(document?.title || "");
  const [content, setContent] = useState(document?.content || initialContent);
  const [categoryId, setCategoryId] = useState(document?.category_id || "");
  const [folderId, setFolderId] = useState(document?.folder_id || "");
  const [isPreview, setIsPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  
  // New folder dialog state
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [localFolders, setLocalFolders] = useState<WikiFolder[]>(folders);
  
  // Refs for auto-save to avoid stale closures
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const categoryIdRef = useRef(categoryId);
  const folderIdRef = useRef(folderId);
  const isSavedRef = useRef(isSaved);
  
  // Keep refs in sync
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { categoryIdRef.current = categoryId; }, [categoryId]);
  useEffect(() => { folderIdRef.current = folderId; }, [folderId]);
  useEffect(() => { isSavedRef.current = isSaved; }, [isSaved]);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setContent(document.content || "");
      setCategoryId(document.category_id || "");
      setFolderId(document.folder_id || "");
      setIsSaved(true); // Reset saved state when loading document
    } else if (initialContent) {
      setContent(initialContent);
    }
  }, [document, initialContent]);

  // Track unsaved changes
  useEffect(() => {
    setIsSaved(false);
  }, [title, content, categoryId, folderId]);

  const handleSave = useCallback(async (silent = false) => {
    if (!titleRef.current.trim()) return;
    
    if (silent) {
      setIsAutoSaving(true);
    }
    
    try {
      await onSave({ 
        title: titleRef.current, 
        content: contentRef.current, 
        category_id: categoryIdRef.current, 
        folder_id: folderIdRef.current || undefined 
      });
      setIsSaved(true);
      if (silent) {
        setLastAutoSave(new Date());
      }
    } finally {
      setIsAutoSaving(false);
    }
  }, [onSave]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (!isSavedRef.current && titleRef.current.trim() && !isSubmitting) {
        handleSave(true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [handleSave, isSubmitting]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return;

    setIsCreatingFolder(true);
    const { data, error } = await supabase.from('wiki_folders').insert({
      name: newFolderName.trim(),
      category_id: categoryId || null,
      created_by: user.id,
    }).select().single();

    if (error) {
      toast.error('Ошибка создания папки');
    } else if (data) {
      toast.success('Папка создана');
      // Add to local folders and select it
      setLocalFolders(prev => [...prev, data as WikiFolder]);
      setFolderId(data.id);
      setNewFolderDialogOpen(false);
      setNewFolderName("");
      onFolderCreated?.();
    }
    setIsCreatingFolder(false);
  };

  // Filter folders by selected category
  const availableFolders = localFolders.filter(f => 
    !categoryId ? !f.category_id : f.category_id === categoryId
  );

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (titleRef.current.trim()) {
          handleSave(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-background flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className="h-9 w-9"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value);
                // Reset folder when category changes
                setFolderId("");
              }}
            >
              <SelectTrigger className="h-8 w-auto min-w-[140px] border-0 bg-transparent hover:bg-muted focus:ring-0 text-sm">
                <SelectValue placeholder="Без категории" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Folder selector with create button */}
          <div className="flex items-center gap-1">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <Select
              value={folderId}
              onValueChange={setFolderId}
            >
              <SelectTrigger className="h-8 w-auto min-w-[140px] border-0 bg-transparent hover:bg-muted focus:ring-0 text-sm">
                <SelectValue placeholder="Без папки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-folder">Без папки</SelectItem>
                {availableFolders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    📂 {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setNewFolderDialogOpen(true)}
              title="Создать папку"
            >
              <FolderPlus className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {isAutoSaving ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              Автосохранение...
            </span>
          ) : !isSaved ? (
            <span className="text-xs text-muted-foreground">• Не сохранено</span>
          ) : lastAutoSave ? (
            <span className="text-xs text-muted-foreground">
              Сохранено в {lastAutoSave.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="gap-2"
          >
            {isPreview ? (
              <>
                <EyeOff className="w-4 h-4" />
                Редактор
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Превью
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Star className="w-4 h-4 mr-2" />
                В избранное
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            onClick={() => handleSave(false)}
            disabled={isSubmitting || !title.trim()}
            size="sm"
            className="gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Сохранить
            <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-[10px] rounded bg-primary-foreground/20">⌘S</kbd>
          </Button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 min-h-0 overflow-y-auto" id="wiki-editor-scroll-container">
        <div className="max-w-3xl mx-auto px-8 pt-6 pb-48">
          {/* Title - sticky */}
          <div className="sticky top-0 z-10 bg-background pb-4 pt-6 -mt-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Без названия"
              className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
            />
          </div>

          {isPreview ? (
            <div className="prose prose-lg dark:prose-invert max-w-none mt-4">
              {content ? (
                <div dangerouslySetInnerHTML={{ __html: content }} />
              ) : (
                <p className="text-muted-foreground italic">Нет содержимого для предпросмотра</p>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Начните писать или используйте панель инструментов..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer with tips */}
      <div className="border-t border-border px-4 py-2 bg-muted/30">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Выделите текст для быстрого форматирования</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Сохранить</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">⌘S</kbd>
          </div>
        </div>
      </div>

      {/* Create folder dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5" />
              Создать папку
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Название папки"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                autoFocus
              />
              {categoryId && (
                <p className="text-xs text-muted-foreground mt-2">
                  Папка будет создана в категории: {categories.find(c => c.id === categoryId)?.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isCreatingFolder}>
              {isCreatingFolder ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default WikiEditor;
