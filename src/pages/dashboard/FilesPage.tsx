import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, Upload, Filter, LayoutGrid, List, FileIcon, Trash2,
  Folder, FolderPlus, ChevronRight, Download, MoreHorizontal,
  ArrowLeft, ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { notifyAllUsersExcept } from "@/hooks/useNotifications";

interface FileItem {
  id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploader_id: string;
  created_at: string;
  folder_id: string | null;
}

interface FileFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_by: string;
  created_at: string;
}

// File format colors
const getFileFormatStyle = (fileName: string, fileType: string | null) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // PDF - Red
  if (ext === 'pdf' || fileType?.includes('pdf')) {
    return { bg: 'bg-red-500/20', text: 'text-red-500', label: 'PDF' };
  }
  
  // Word - Blue
  if (ext === 'doc' || ext === 'docx' || fileType?.includes('word')) {
    return { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'DOC' };
  }
  
  // Excel - Green
  if (ext === 'xls' || ext === 'xlsx' || fileType?.includes('excel') || fileType?.includes('spreadsheet')) {
    return { bg: 'bg-green-500/20', text: 'text-green-500', label: 'XLS' };
  }
  
  // PowerPoint - Orange
  if (ext === 'ppt' || ext === 'pptx' || fileType?.includes('presentation')) {
    return { bg: 'bg-orange-500/20', text: 'text-orange-500', label: 'PPT' };
  }
  
  // Text files - Gray
  if (ext === 'txt' || ext === 'md' || ext === 'rtf') {
    return { bg: 'bg-slate-500/20', text: 'text-slate-500', label: 'TXT' };
  }
  
  // CSV - Teal
  if (ext === 'csv') {
    return { bg: 'bg-teal-500/20', text: 'text-teal-500', label: 'CSV' };
  }
  
  // Images - Purple
  if (fileType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return { bg: 'bg-purple-500/20', text: 'text-purple-500', label: ext.toUpperCase() };
  }
  
  // Archive - Yellow
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'ZIP' };
  }
  
  // Default - Primary
  return { bg: 'bg-primary/20', text: 'text-primary', label: ext.toUpperCase() || 'FILE' };
};

const FilesPage = () => {
  const { user, isAdmin } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Available format filters
  const formatOptions = [
    { value: 'all', label: 'Все форматы' },
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'Word (DOC)' },
    { value: 'xls', label: 'Excel (XLS)' },
    { value: 'ppt', label: 'PowerPoint' },
    { value: 'image', label: 'Изображения' },
    { value: 'archive', label: 'Архивы' },
    { value: 'text', label: 'Текст' },
  ];

  const matchesFormatFilter = (fileName: string, fileType: string | null) => {
    if (formatFilter === 'all') return true;
    
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (formatFilter) {
      case 'pdf':
        return ext === 'pdf' || fileType?.includes('pdf');
      case 'doc':
        return ext === 'doc' || ext === 'docx' || fileType?.includes('word');
      case 'xls':
        return ext === 'xls' || ext === 'xlsx' || fileType?.includes('excel') || fileType?.includes('spreadsheet');
      case 'ppt':
        return ext === 'ppt' || ext === 'pptx' || fileType?.includes('presentation');
      case 'image':
        return fileType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
      case 'archive':
        return ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
      case 'text':
        return ['txt', 'md', 'rtf', 'csv'].includes(ext);
      default:
        return true;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchFiles(), fetchFolders()]);
    setLoading(false);
  };

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setFiles(data || []);
    }
  };

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from('file_folders')
      .select('*')
      .order('name');
    
    if (!error) {
      setFolders(data || []);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    try {
      // Upload to storage with safe filename (no Cyrillic or spaces)
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const safeFileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(safeFileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(safeFileName);

      // Save to database
      const { data: insertedFile, error: dbError } = await supabase.from('files').insert({
        name: file.name,
        file_path: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploader_id: user.id,
        folder_id: currentFolderId,
      }).select().single();

      if (dbError) throw dbError;

      toast.success('Файл загружен');
      fetchFiles();
      
      // Notify all users about new file
      if (insertedFile) {
        notifyAllUsersExcept(
          user.id,
          "file",
          file.name,
          "Загружен новый файл",
          insertedFile.id
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка загрузки файла');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return;

    const { error } = await supabase.from('file_folders').insert({
      name: newFolderName.trim(),
      parent_folder_id: currentFolderId,
      created_by: user.id,
    });

    if (error) {
      toast.error('Ошибка создания папки');
    } else {
      toast.success('Папка создана');
      setFolderDialogOpen(false);
      setNewFolderName('');
      fetchFolders();
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'file') {
      // Find the file to get its path
      const fileToDelete = files.find(f => f.id === itemToDelete.id);
      
      // Delete from database first
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) {
        toast.error('Ошибка удаления');
      } else {
        // Try to delete from storage as well
        if (fileToDelete?.file_path) {
          try {
            // Extract path from URL (after /files/)
            const url = new URL(fileToDelete.file_path);
            const pathParts = url.pathname.split('/storage/v1/object/public/files/');
            if (pathParts[1]) {
              await supabase.storage.from('files').remove([decodeURIComponent(pathParts[1])]);
            }
          } catch (storageError) {
            console.error('Storage delete error:', storageError);
          }
        }
        toast.success('Файл удалён');
        fetchFiles();
      }
    } else {
      await supabase
        .from('files')
        .update({ folder_id: null })
        .eq('folder_id', itemToDelete.id);

      const { error } = await supabase
        .from('file_folders')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) {
        toast.error('Ошибка удаления папки');
      } else {
        toast.success('Папка удалена');
        fetchFolders();
      }
    }

    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleDownload = async (file: FileItem) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(file.file_path);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Файл скачан');
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(file.file_path, '_blank');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Get breadcrumb path
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Все файлы' }];
    
    if (currentFolderId) {
      const findPath = (folderId: string): { id: string; name: string }[] => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return [];
        
        const parentPath = folder.parent_folder_id 
          ? findPath(folder.parent_folder_id) 
          : [];
        
        return [...parentPath, { id: folder.id, name: folder.name }];
      };
      
      crumbs.push(...findPath(currentFolderId));
    }
    
    return crumbs;
  };

  const currentFolders = useMemo(() => 
    folders.filter(f => f.parent_folder_id === currentFolderId),
    [folders, currentFolderId]
  );

  const currentFiles = useMemo(() => 
    files.filter(f => {
      const matchesFolder = f.folder_id === currentFolderId;
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFormat = matchesFormatFilter(f.name, f.file_type);
      return matchesFolder && matchesSearch && matchesFormat;
    }),
    [files, currentFolderId, searchQuery, formatFilter]
  );

  const filteredFolders = useMemo(() =>
    currentFolders.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [currentFolders, searchQuery]
  );

  const breadcrumbs = getBreadcrumbs();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Документы</h1>
          <p className="text-muted-foreground mt-1">
            Корпоративный архив, шаблоны и отчеты.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setFolderDialogOpen(true)}
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Папка</span>
          </Button>
          
          <label className={cn("cursor-pointer", uploading && "pointer-events-none opacity-50")}>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button className="gap-2 bg-primary hover:bg-primary/90" asChild>
              <span>
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{uploading ? 'Загрузка...' : 'Загрузить'}</span>
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id ?? 'root'} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <button
              onClick={() => setCurrentFolderId(crumb.id)}
              className={cn(
                "hover:text-primary transition-colors",
                index === breadcrumbs.length - 1 
                  ? "text-foreground font-medium" 
                  : "text-muted-foreground"
              )}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {currentFolderId && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                const parentFolder = folders.find(f => f.id === currentFolderId);
                setCurrentFolderId(parentFolder?.parent_folder_id ?? null);
              }}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
          )}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                <span>Фильтры</span>
                {formatFilter !== 'all' && (
                  <span className="px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                    {formatOptions.find(o => o.value === formatFilter)?.label}
                  </span>
                )}
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  filtersOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="flex flex-wrap gap-2">
                {formatOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormatFilter(option.value)}
                    className={cn(
                      "px-3 py-1 rounded text-sm transition-colors",
                      formatFilter === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="pl-10 bg-muted/50 border-0"
            />
          </div>
          
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn(
                "rounded-none h-9 w-9",
                viewMode === 'list' && "bg-muted"
              )}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn(
                "rounded-none h-9 w-9",
                viewMode === 'grid' && "bg-muted"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Files and Folders */}
      <div className="glass rounded-xl p-6">
        {filteredFolders.length === 0 && currentFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Ничего не найдено' : 'Папка пуста'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {/* Folders */}
            {filteredFolders.map((folder) => (
              <div 
                key={folder.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{folder.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Папка • {format(new Date(folder.created_at), 'd MMM yyyy', { locale: ru })}
                  </p>
                </div>
                {(isAdmin || folder.created_by === user?.id) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-8 w-8"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete({ type: 'folder', id: folder.id, name: folder.name });
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}

            {/* Files */}
            {currentFiles.map((file) => {
              const formatStyle = getFileFormatStyle(file.name, file.file_type);
              return (
                <div 
                  key={file.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors group"
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", formatStyle.bg)}>
                    <span className={cn("text-xs font-bold", formatStyle.text)}>
                      {formatStyle.label}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{file.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.file_size)} • {format(new Date(file.created_at), 'd MMM yyyy', { locale: ru })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title="Скачать"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {(isAdmin || file.uploader_id === user?.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setItemToDelete({ type: 'file', id: file.id, name: file.name });
                          setDeleteDialogOpen(true);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Folders Grid */}
            {filteredFolders.map((folder) => (
              <div 
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-center group relative cursor-pointer"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Folder className="w-6 h-6 text-amber-500" />
                </div>
                <h4 className="font-medium text-sm truncate">{folder.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">Папка</p>
                {(isAdmin || folder.created_by === user?.id) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete({ type: 'folder', id: folder.id, name: folder.name });
                      setDeleteDialogOpen(true);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {/* Files Grid */}
            {currentFiles.map((file) => {
              const formatStyle = getFileFormatStyle(file.name, file.file_type);
              return (
                <div 
                  key={file.id}
                  className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-center group relative"
                >
                  <div className={cn("w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center", formatStyle.bg)}>
                    <span className={cn("text-sm font-bold", formatStyle.text)}>
                      {formatStyle.label}
                    </span>
                  </div>
                  <h4 className="font-medium text-sm truncate">{file.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(file.file_size)}
                  </p>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file)}
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      title="Скачать"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    {(isAdmin || file.uploader_id === user?.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setItemToDelete({ type: 'file', id: file.id, name: file.name });
                          setDeleteDialogOpen(true);
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать папку</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Название папки"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {itemToDelete?.type === 'folder' ? 'папку' : 'файл'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'folder' 
                ? `Папка "${itemToDelete?.name}" будет удалена. Файлы внутри останутся без папки.`
                : `Файл "${itemToDelete?.name}" будет удалён.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FilesPage;