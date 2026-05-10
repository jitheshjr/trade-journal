import { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/useAuthStore'
import ConfirmDialog from '../components/ConfirmDialog'

// ── Toolbar ──────────────────────────────────────────────
function Toolbar({ editor }) {
  if (!editor) return null

  const btn = (action, label, isActive) => (
    <button
      className={`tiptap-btn ${isActive ? 'active' : ''}`}
      onClick={action}
      title={label}
    >{label}</button>
  )

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 2, padding: '10px 12px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-base)',
      borderRadius: '10px 10px 0 0',
    }}>
      {/* Headings */}
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}

      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

      {/* Marks */}
      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
      {btn(() => editor.chain().focus().toggleCode().run(), '<>', editor.isActive('code'))}

      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

      {/* Lists */}
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}

      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

      {/* Align */}
      {btn(() => editor.chain().focus().setTextAlign('left').run(), '⬤ L', editor.isActive({ textAlign: 'left' }))}
      {btn(() => editor.chain().focus().setTextAlign('center').run(), '⬤ C', editor.isActive({ textAlign: 'center' }))}

      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().setHorizontalRule().run(), '──', false)}
      {btn(() => editor.chain().focus().undo().run(), '↩', false)}
      {btn(() => editor.chain().focus().redo().run(), '↪', false)}
    </div>
  )
}

// ── Note Editor Modal ─────────────────────────────────────
function NoteEditor({ note, onSave, onClose }) {
  const user = useAuthStore((s) => s.user)
  const [title, setTitle] = useState(note?.title || '')
  const [tagInput, setTagInput] = useState(note?.tags?.join(', ') || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Write your strategy, rules, observations...' }),
    ],
    content: note?.content || '',
  })

  const handleSave = async () => {
    if (!title.trim()) return setError('Title is required.')
    setSaving(true)
    setError(null)

    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    const content = editor.getHTML()

    const payload = { title, content, tags, user_id: user.id }

    let error
    if (note?.id) {
      ;({ error } = await supabase.from('playbook').update(payload).eq('id', note.id))
    } else {
      ;({ error } = await supabase.from('playbook').insert(payload))
    }

    if (error) setError(error.message)
    else onSave()
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,10,15,0.85)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '32px 16px', overflowY: 'auto',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: '100%', maxWidth: 780,
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
      }}>

        {/* Modal header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: 'var(--accent)', letterSpacing: '0.15em',
          }}>
            {note?.id ? 'EDIT NOTE' : 'NEW NOTE'}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Title + tags */}
        <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Range Breakout Strategy"
              style={{ fontSize: 16, fontWeight: 600 }}
            />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input
              className="input"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="e.g. strategy, intraday, breakout"
            />
          </div>
        </div>

        {/* Editor */}
        <div className="tiptap-wrapper" style={{
          flex: 1, overflowY: 'auto',
          margin: '16px 24px 0',
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--bg-surface)',
        }}>
          <Toolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          {error && (
            <span style={{ fontSize: 12, color: 'var(--red)', flex: 1 }}>{error}</span>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : note?.id ? 'Update' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Note Card ─────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  // Strip HTML for preview text
  const preview = note.content
    ? note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
    : 'No content'

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '18px 20px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
              marginBottom: 6, letterSpacing: '-0.01em',
            }}>{note.title}</h3>

            {!expanded && (
              <p style={{
                fontSize: 12, color: 'var(--text-muted)',
                lineHeight: 1.6, marginBottom: 8,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>{preview}</p>
            )}

            {/* Tags */}
            {note.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {note.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 4,
                    background: 'var(--accent-dim)', color: 'var(--accent)',
                    fontWeight: 600, letterSpacing: '0.05em',
                  }}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {new Date(note.updated_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </span>
            <span style={{
              fontSize: 12, color: 'var(--text-muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s', display: 'block',
            }}>▼</span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div
            className="tiptap-wrapper"
            style={{ padding: '0 20px' }}
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
          <div style={{
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8,
          }}>
            <button className="btn-ghost" onClick={() => onEdit(note)}
              style={{ fontSize: 12, padding: '6px 14px' }}>
              Edit
            </button>
            <button className="btn-ghost" onClick={() => onDelete(note.id)}
              style={{ fontSize: 12, padding: '6px 14px', color: 'var(--red)', borderColor: 'var(--red)40' }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────
export default function Playbook() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // null = closed, {} = new, note = edit
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const fetchNotes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('playbook')
      .select('*')
      .order('updated_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchNotes() }, [])

  const handleDelete = (id) => setConfirmId(id)

  const confirmDelete = async () => {
    await supabase.from('playbook').delete().eq('id', confirmId)
    setNotes(n => n.filter(x => x.id !== confirmId))
    setConfirmId(null)
  }

  const allTags = [...new Set(notes.flatMap(n => n.tags || []))]

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase())
    const matchTag = !filterTag || n.tags?.includes(filterTag)
    return matchSearch && matchTag
  })

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: 'var(--accent)', letterSpacing: '0.15em', marginBottom: 6,
          }}>PERSONAL PLAYBOOK</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Strategies & Notes
          </h1>
        </div>
        <button className="btn-primary" onClick={() => setEditing({})}>
          + New Note
        </button>
      </div>

      {/* Search + tag filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          style={{ maxWidth: 280 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setFilterTag('')}
            style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              background: !filterTag ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              color: !filterTag ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${!filterTag ? 'var(--accent)40' : 'var(--border)'}`,
              fontWeight: 600,
            }}>All</button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
              style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                background: filterTag === tag ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                color: filterTag === tag ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${filterTag === tag ? 'var(--accent)40' : 'var(--border)'}`,
                fontWeight: 600,
              }}>{tag}</button>
          ))}
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
          Loading notes...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          border: '1px dashed var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📓</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No notes yet.</p>
          <button className="btn-primary" onClick={() => setEditing({})} style={{ marginTop: 16 }}>
            Write your first note
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editing !== null && (
        <NoteEditor
          note={editing}
          onSave={() => { setEditing(null); fetchNotes() }}
          onClose={() => setEditing(null)}
        />
      )}
      {confirmId && (
        <ConfirmDialog
          message="This note will be permanently deleted."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}