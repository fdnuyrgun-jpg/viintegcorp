import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { ColoredBlockquote } from './extensions/ColoredBlockquote';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Code, Quote,
  Heading1, Heading2, Heading3,
  Undo, Redo, Minus, Link as LinkIcon,
  Highlighter, CheckSquare, Type, ImageIcon,
  FileUp, Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// Language options for code blocks
const CODE_LANGUAGES = [
  { value: 'plaintext', label: 'Авто' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'bash', label: 'Bash' },
  { value: 'shell', label: 'Shell' },
];

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string | null>;
}

const RichTextEditor = ({ 
  content, 
  onChange, 
  placeholder = "Начните писать...",
  onImageUpload
}: RichTextEditorProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImagePopover, setShowImagePopover] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showQuoteColorPopover, setShowQuoteColorPopover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quote color options
  const QUOTE_COLORS = [
    { value: null, label: 'По умолчанию', color: 'hsl(217, 91%, 60%)' },
    { value: '#ef4444', label: 'Красный', color: '#ef4444' },
    { value: '#f97316', label: 'Оранжевый', color: '#f97316' },
    { value: '#eab308', label: 'Жёлтый', color: '#eab308' },
    { value: '#22c55e', label: 'Зелёный', color: '#22c55e' },
    { value: '#06b6d4', label: 'Голубой', color: '#06b6d4' },
    { value: '#8b5cf6', label: 'Фиолетовый', color: '#8b5cf6' },
    { value: '#ec4899', label: 'Розовый', color: '#ec4899' },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default, use CodeBlockLowlight
        blockquote: false, // Disable default, use ColoredBlockquote
      }),
      ColoredBlockquote,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: null,
        HTMLAttributes: {
          class: 'code-block',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'blockquote'],
        alignments: ['left', 'center', 'right'],
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2 cursor-pointer',
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto max-h-96 object-contain',
        },
      }),
    ],
    content,
    autofocus: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] pb-32',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setShowLinkPopover(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const insertImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setShowImagePopover(false);
    setImageUrl('');
  }, [editor, imageUrl]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith('image/');
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('wiki-attachments')
        .upload(filePath, file);

      if (error) {
        toast.error('Ошибка загрузки файла');
        console.error(error);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('wiki-attachments')
        .getPublicUrl(filePath);

      if (isImage && editor) {
        editor.chain().focus().setImage({ src: publicUrl }).run();
        toast.success('Изображение добавлено');
      } else {
        // For non-image files, insert as a link
        if (editor) {
          editor.chain().focus().insertContent(`<a href="${publicUrl}" target="_blank">${file.name}</a>`).run();
          toast.success('Файл прикреплен');
        }
      }
    } catch (error) {
      toast.error('Ошибка загрузки');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children,
    tooltip,
    disabled = false
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    tooltip: string;
    disabled?: boolean;
  }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
          }}
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );

  const Separator = () => (
    <div className="w-px h-5 bg-border mx-1" />
  );

  const ToolbarGroup = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-0.5">{children}</div>
  );

  return (
    <div className={cn(
      "rounded-xl transition-all duration-200",
      isFocused && "ring-2 ring-primary/20"
    )}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        onChange={handleImageInputChange}
        className="hidden"
      />

      {/* Main toolbar - sticky with solid background */}
      <div className="flex flex-wrap items-center gap-1 p-2 mb-4 rounded-xl bg-background border border-border sticky top-0 z-20 shadow-sm">
        <ToolbarGroup>
          <ToolbarButton 
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="Отменить (⌘Z)"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="Повторить (⌘⇧Z)"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator />

        <ToolbarGroup>
          <ToolbarButton 
            onClick={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive('paragraph') && !editor.isActive('heading')}
            tooltip="Параграф"
          >
            <Type className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            tooltip="Заголовок 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            tooltip="Заголовок 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            tooltip="Заголовок 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator />

        <ToolbarGroup>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Жирный (⌘B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Курсив (⌘I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            tooltip="Подчёркнутый (⌘U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            tooltip="Зачёркнутый"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            tooltip="Выделение"
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator />

        <ToolbarGroup>
          <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                  editor.isActive('link') 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <div className="flex gap-2">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && setLink()}
                />
                <Button size="sm" className="h-8" onClick={setLink}>
                  OK
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </ToolbarGroup>

        <Separator />

        <ToolbarGroup>
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' }) || (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }))}
            tooltip="По левому краю"
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            tooltip="По центру"
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            tooltip="По правому краю"
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator />

        <ToolbarGroup>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            tooltip="Маркированный список"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            tooltip="Нумерованный список"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            tooltip="Чеклист"
          >
            <CheckSquare className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator />

        <ToolbarGroup>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            tooltip="Цитата"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          
          {/* Quote color picker - only show when in blockquote */}
          {editor.isActive('blockquote') && (
            <Popover open={showQuoteColorPopover} onOpenChange={setShowQuoteColorPopover}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Palette className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Цвет цитаты</div>
                  <div className="flex gap-1">
                    {QUOTE_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.label}
                        type="button"
                        onClick={() => {
                          if (colorOption.value) {
                            editor.chain().focus().setBlockquoteColor(colorOption.value).run();
                          } else {
                            editor.chain().focus().unsetBlockquoteColor().run();
                          }
                          setShowQuoteColorPopover(false);
                        }}
                        className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground/50 transition-colors flex items-center justify-center"
                        style={{ backgroundColor: colorOption.color }}
                        title={colorOption.label}
                      >
                        {!colorOption.value && (
                          <div className="w-3 h-3 rounded-full border-2 border-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            tooltip="Блок кода"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            tooltip="Разделитель"
          >
            <Minus className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator />

        {/* Image and file upload */}
        <ToolbarGroup>
          <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-3">
                <div className="text-sm font-medium">Добавить изображение</div>
                <div className="flex gap-2">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && insertImage()}
                  />
                  <Button size="sm" className="h-8" onClick={insertImage}>
                    OK
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground text-center">или</div>
                <Button 
                  variant="outline" 
                  className="w-full h-8 text-sm"
                  onClick={() => {
                    setShowImagePopover(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Загрузить файл
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <ToolbarButton 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            tooltip="Загрузить файл"
          >
            <FileUp className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>

        {/* Code language selector - show when in code block */}
        {editor.isActive('codeBlock') && (
          <>
            <Separator />
            <Select
              value={editor.getAttributes('codeBlock').language || ''}
              onValueChange={(value) => {
                editor.chain().focus().updateAttributes('codeBlock', { language: value || null }).run();
              }}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Язык" />
              </SelectTrigger>
              <SelectContent>
                {CODE_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="px-1" />
    </div>
  );
};

export default RichTextEditor;
