import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Check,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Fires when focus leaves the editor, so blur-only form validation still works. */
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

/** ProseMirror emits this for an empty document; treated as "no description". */
const EMPTY_DOCUMENT = '<p></p>';

/**
 * Rich-text editor for admin-authored content (topic descriptions), built on
 * TipTap so the toolbar is our own shadcn buttons rather than a second design
 * system dropped into the admin panel.
 *
 * Only the tags `App\Support\HtmlSanitizer` allows are offered here, so what an
 * admin can type is what the backend will actually keep.
 */
export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Write a short description…',
  invalid,
  className,
}: RichTextEditorProps) {
  const [linkBarOpen, setLinkBarOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Only h2–h4 are in the sanitizer allowlist; h1 belongs to the page.
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        // Mirrors the backend allowlist so a link the admin adds is one that survives.
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'pb-rich-text min-h-28 w-full px-3 py-2 focus:outline-none',
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      onChange(html === EMPTY_DOCUMENT ? '' : html);
    },
    onBlur: () => onBlur?.(),
  });

  // Reflects an external reset (form reset, switching which record is loaded)
  // without clobbering what the admin is typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || EMPTY_DOCUMENT;
    if (current !== incoming) {
      editor.commands.setContent(incoming, false);
    }
    // Intentionally keyed on `value` alone — reacting to `editor` identity would
    // re-run on every render and fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (linkBarOpen) linkInputRef.current?.focus();
  }, [linkBarOpen]);

  const openLinkBar = useCallback(() => {
    if (!editor) return;
    setLinkDraft(editor.getAttributes('link').href ?? 'https://');
    setLinkBarOpen(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const href = linkDraft.trim();

    if (href === '' || href === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }

    setLinkBarOpen(false);
  }, [editor, linkDraft]);

  if (!editor) return null;

  const isEmpty = editor.isEmpty;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-colors',
        'focus-within:border-ring/45',
        invalid && 'border-destructive',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 px-1.5 py-1">
        <ToolbarButton
          label="Bold"
          icon={Bold}
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          icon={Italic}
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Underline"
          icon={UnderlineIcon}
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          label="Strikethrough"
          icon={Strikethrough}
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <ToolbarButton
          label="Heading"
          icon={Heading3}
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          label="Bullet list"
          icon={List}
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Numbered list"
          icon={ListOrdered}
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Quote"
          icon={Quote}
          isActive={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />

        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <ToolbarButton label="Add link" icon={Link2} isActive={editor.isActive('link')} onClick={openLinkBar} />
        <ToolbarButton
          label="Remove link"
          icon={Link2Off}
          disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
        />
      </div>

      {linkBarOpen && (
        <div className="flex items-center gap-1.5 border-b border-input bg-secondary/40 px-1.5 py-1.5">
          <Input
            ref={linkInputRef}
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
              if (e.key === 'Escape') setLinkBarOpen(false);
            }}
            placeholder="https://example.com"
            aria-label="Link address"
            className="h-7 text-[13px]"
          />
          <Button type="button" size="icon-xs" onClick={applyLink} aria-label="Apply link">
            <Check className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => setLinkBarOpen(false)}
            aria-label="Cancel link"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="relative">
        {isEmpty && (
          <p className="pointer-events-none absolute top-2 left-3 text-sm text-muted-foreground">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  icon: Icon,
  isActive,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Bold;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      aria-label={label}
      title={label}
      aria-pressed={isActive}
      disabled={disabled}
      // Keeps the selection intact — the editor would otherwise lose focus on
      // mousedown and the command would apply to nothing.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(isActive && 'bg-primary/10 text-primary hover:bg-primary/15')}
    >
      <Icon className="size-3.5" />
    </Button>
  );
}
