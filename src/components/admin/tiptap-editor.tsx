'use client'

import * as React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Image as TiptapImage } from '@tiptap/extension-image'
import { Link as TiptapLink } from '@tiptap/extension-link'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Code,
  Quote,
  ListOrdered,
  List,
  ImagePlus,
  Link2,
  Link2Off,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TiptapEditorProps {
  value: string
  onChange: (html: string) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Prevent editor from losing focus on toolbar click
        e.preventDefault()
        onClick()
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 rounded-md',
        'text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'disabled:pointer-events-none disabled:opacity-40',
        isActive
          ? 'bg-accent/20 text-accent'
          : 'text-muted hover:bg-muted/10 hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Separator
// ---------------------------------------------------------------------------

function ToolbarSeparator() {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="mx-1 h-5 w-px bg-border"
    />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TiptapEditor({
  value,
  onChange,
  className,
}: TiptapEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  // ── Editor instance ──────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full rounded-md my-4',
        },
      }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent underline underline-offset-4 hover:text-accent/80',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'prose-platform min-h-[400px] w-full p-4',
          'focus:outline-none',
          'text-foreground'
        ),
      },
      // ── Paste handler: intercept image files ───────────────────────────
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? [])
        const imageItem = items.find((item) => item.type.startsWith('image/'))

        if (!imageItem) return false

        event.preventDefault()
        const file = imageItem.getAsFile()
        if (!file) return false

        void uploadAndInsertImage(file)
        return true
      },
    },
    onUpdate({ editor: ed }) {
      onChange(ed.getHTML())
    },
  })

  // ── Sync external value changes (e.g. form reset) ───────────────────────

  const prevValueRef = React.useRef(value)

  React.useEffect(() => {
    if (!editor) return
    if (value === prevValueRef.current) return
    if (value === editor.getHTML()) return

    // Replace content without moving cursor to avoid janky UX
    editor.commands.setContent(value, false)
    prevValueRef.current = value
  }, [editor, value])

  // ── Cleanup ──────────────────────────────────────────────────────────────

  React.useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  // ── Image upload ─────────────────────────────────────────────────────────

  async function uploadAndInsertImage(file: File): Promise<void> {
    if (!editor) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      console.error('Unsupported image type:', file.type)
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
    if (file.size > MAX_SIZE) {
      console.error('Image exceeds 5 MB limit')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'zymbiq/blog')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = (await response.json()) as { error?: string }
        throw new Error(err.error ?? 'Upload failed')
      }

      const result = (await response.json()) as { data: { url: string } }
      const { url } = result.data

      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      console.error('Image upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  // ── Toolbar handlers ─────────────────────────────────────────────────────

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    void uploadAndInsertImage(file)
    // Reset so the same file can be re-selected if needed
    e.target.value = ''
  }

  function handleAddLink() {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Enter URL', previousUrl ?? 'https://')

    if (url === null) return // cancelled

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!editor) {
    return (
      <div
        className={cn(
          'min-h-[400px] rounded-[--zymbiq-radius] border border-border',
          'bg-surface animate-pulse',
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-[--zymbiq-radius] border border-border bg-surface overflow-hidden',
        className
      )}
    >
      {/* ── Toolbar ── */}
      <div
        role="toolbar"
        aria-label="Text formatting"
        className={cn(
          'flex flex-wrap items-center gap-0.5 px-3 py-2',
          'border-b border-border bg-surface sticky top-0 z-10'
        )}
      >
        {/* Text style */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (⌘B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (⌘I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Headings */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Code and blockquote */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Unordered list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Link */}
        <ToolbarButton
          onClick={handleAddLink}
          isActive={editor.isActive('link')}
          title="Add / edit link"
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        {editor.isActive('link') && (
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
            }
            title="Remove link"
          >
            <Link2Off className="h-4 w-4" />
          </ToolbarButton>
        )}

        <ToolbarSeparator />

        {/* Image upload */}
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title={isUploading ? 'Uploading…' : 'Insert image'}
        >
          <ImagePlus
            className={cn('h-4 w-4', isUploading && 'animate-pulse')}
          />
        </ToolbarButton>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageFileChange}
          aria-hidden="true"
        />
      </div>

      {/* ── Editor content area ── */}
      <EditorContent editor={editor} />
    </div>
  )
}