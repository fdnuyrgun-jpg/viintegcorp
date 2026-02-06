import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Paperclip, Upload, FileText, Image, File, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WikiAttachment {
  id: string;
  document_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploader_id: string;
  created_at: string;
}

interface WikiAttachmentsProps {
  documentId: string;
  canEdit?: boolean;
}

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText;
  return File;
};

export const WikiAttachments = ({ documentId, canEdit = true }: WikiAttachmentsProps) => {
  const { user, isAdmin } = useAuth();
  const [attachments, setAttachments] = useState<WikiAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from('wiki_document_attachments')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAttachments(data);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [documentId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает 10MB`);
        continue;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${documentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('wiki-attachments')
        .upload(fileName, file);

      if (uploadError) {
        toast.error(`Ошибка загрузки ${file.name}`);
        continue;
      }

      supabase.storage
        .from('wiki-attachments')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('wiki_document_attachments')
        .insert({
          document_id: documentId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          uploader_id: user.id,
        });

      if (insertError) {
        toast.error(`Ошибка сохранения ${file.name}`);
        await supabase.storage.from('wiki-attachments').remove([fileName]);
      }
    }

    await fetchAttachments();
    setUploading(false);
    toast.success('Файлы загружены');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachment: WikiAttachment) => {
    setDeletingId(attachment.id);

    const { error: storageError } = await supabase.storage
      .from('wiki-attachments')
      .remove([attachment.file_path]);

    if (storageError) {
      toast.error('Ошибка удаления файла');
      setDeletingId(null);
      return;
    }

    const { error: dbError } = await supabase
      .from('wiki_document_attachments')
      .delete()
      .eq('id', attachment.id);

    if (dbError) {
      toast.error('Ошибка удаления записи');
    } else {
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
      toast.success('Файл удален');
    }

    setDeletingId(null);
  };

  const handleDownload = async (attachment: WikiAttachment) => {
    const { data } = supabase.storage
      .from('wiki-attachments')
      .getPublicUrl(attachment.file_path);

    window.open(data.publicUrl, '_blank');
  };

  const canDeleteAttachment = (attachment: WikiAttachment) => {
    return isAdmin || attachment.uploader_id === user?.id;
  };

  return (
    <div className="space-y-3 mt-8 pt-8 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Paperclip className="w-4 h-4" />
          <span>Вложения ({attachments.length})</span>
        </div>
        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Загрузить
            </Button>
          </>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {attachments.length === 0 ? (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground italic"
          >
            Нет прикрепленных файлов
          </motion.p>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.file_type);
              const isDeleting = deletingId === attachment.id;
              
              return (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg bg-muted/50 group",
                    isDeleting && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <FileIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]" title={attachment.file_name}>
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(attachment)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {canDeleteAttachment(attachment) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(attachment)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
