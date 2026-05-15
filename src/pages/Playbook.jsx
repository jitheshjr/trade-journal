import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/useAuthStore'
import ConfirmDialog from '../components/ConfirmDialog'

const ENTRY_TYPES = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'idea', label: 'Idea' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'link', label: 'Tool / Link' },
  { value: 'lesson', label: 'Mistake / Lesson' },
  { value: 'observation', label: 'Observation' },
  { value: 'note', label: 'Note' },
]

const TYPE_STYLES = {
  strategy: { color: 'var(--accent)', bg: 'var(--accent-dim)' },
  idea: { color: 'var(--blue)', bg: 'var(--blue-dim)' },
  watchlist: { color: 'var(--green)', bg: 'var(--green-dim)' },
  link: { color: 'var(--text-primary)', bg: 'var(--bg-elevated)' },
  lesson: { color: 'var(--red)', bg: 'var(--red-dim)' },
  observation: { color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
  note: { color: 'var(--text-muted)', bg: 'var(--bg-elevated)' },
}

const STRATEGY_TEMPLATE = `
  <h2>Setup</h2>
  <p></p>
  <h2>Entry Rules</h2>
  <ul><li></li></ul>
  <h2>Exit Rules</h2>
  <ul><li></li></ul>
  <h2>Stop Loss Rules</h2>
  <ul><li></li></ul>
  <h2>Best Market Condition</h2>
  <p></p>
  <h2>Avoid When</h2>
  <ul><li></li></ul>
  <h2>Examples / Notes</h2>
  <p></p>
`

function getEntryLabel(type) {
  return ENTRY_TYPES.find(t => t.value === type)?.label || 'Note'
}

function stripHtml(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

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
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}

      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
      {btn(() => editor.chain().focus().toggleCode().run(), '<>', editor.isActive('code'))}

      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().toggleBulletList().run(), 'List', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), 'Quote', editor.isActive('blockquote'))}

      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().setTextAlign('left').run(), 'Left', editor.isActive({ textAlign: 'left' }))}
      {btn(() => editor.chain().focus().setTextAlign('center').run(), 'Center', editor.isActive({ textAlign: 'center' }))}

      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

      {btn(() => editor.chain().focus().setHorizontalRule().run(), 'Line', false)}
      {btn(() => editor.chain().focus().undo().run(), 'Undo', false)}
      {btn(() => editor.chain().focus().redo().run(), 'Redo', false)}
    </div>
  )
}

function NoteEditor({ note, onSave, onClose }) {
  const user = useAuthStore((s) => s.user)
  const [entryType, setEntryType] = useState(note?.entry_type || 'strategy')
  const [title, setTitle] = useState(note?.title || '')
  const [stockName, setStockName] = useState(note?.stock_name || '')
  const [linkUrl, setLinkUrl] = useState(note?.link_url || '')
  const [tagInput, setTagInput] = useState(note?.tags?.join(', ') || '')
  const [isPinned, setIsPinned] = useState(!!note?.is_pinned)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Write the rules, observations, links, or watchlist notes...' }),
    ],
    content: note?.content || '',
  })

  const applyStrategyTemplate = () => {
    editor?.chain().focus().setContent(STRATEGY_TEMPLATE).run()
  }

  const handleSave = async () => {
    if (!title.trim()) return setError('Title is required.')
    if (entryType === 'watchlist' && !stockName.trim()) return setError('Stock name is required for watchlist entries.')
    if (entryType === 'link' && !linkUrl.trim()) return setError('Link URL is required for tool/link entries.')

    setSaving(true)
    setError(null)

    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    const content = editor?.getHTML() || ''
    const payload = {
      title: title.trim(),
      content,
      tags,
      user_id: user.id,
      entry_type: entryType,
      stock_name: entryType === 'watchlist' ? stockName.trim() : null,
      link_url: entryType === 'link' ? linkUrl.trim() : null,
      is_pinned: isPinned,
    }

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
        borderRadius: 12,
        width: '100%', maxWidth: 820,
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11, color: 'var(--accent)', letterSpacing: '0.15em',
          }}>
            {note?.id ? 'EDIT ENTRY' : 'NEW ENTRY'}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
          }}>x</button>
        </div>

        <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label className="label">Type</label>
              <select className="input" value={entryType} onChange={e => setEntryType(e.target.value)}>
                {ENTRY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'end',
              minHeight: 42,
              color: 'var(--text-secondary)',
              fontSize: 13,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
              />
              Pin this entry
            </label>
          </div>

          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Opening range breakout"
              style={{ fontSize: 16, fontWeight: 600 }}
            />
          </div>

          {entryType === 'watchlist' && (
            <div>
              <label className="label">Stock Name</label>
              <input
                className="input mono"
                value={stockName}
                onChange={e => setStockName(e.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE"
              />
            </div>
          )}

          {entryType === 'link' && (
            <div>
              <label className="label">Link URL</label>
              <input
                className="input"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          <div>
            <label className="label">Tags</label>
            <input
              className="input"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="e.g. intraday, breakout, nifty"
            />
          </div>

          {entryType === 'strategy' && (
            <div>
              <button className="btn-ghost" onClick={applyStrategyTemplate} style={{ fontSize: 12, padding: '7px 12px' }}>
                Use Strategy Template
              </button>
            </div>
          )}
        </div>

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
            {saving ? 'Saving...' : note?.id ? 'Update' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MetaPill({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 10,
      padding: '3px 8px',
      borderRadius: 4,
      background: bg || 'var(--bg-elevated)',
      color: color || 'var(--text-muted)',
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      {children}
    </span>
  )
}

function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const [expanded, setExpanded] = useState(false)
  const entryType = note.entry_type || 'note'
  const typeStyle = TYPE_STYLES[entryType] || TYPE_STYLES.note
  const preview = stripHtml(note.content).slice(0, 180) || 'No description yet'

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: note.is_pinned ? 'var(--accent)35' : 'var(--border)' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '16px 18px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              {note.is_pinned && <MetaPill color="var(--accent)" bg="var(--accent-dim)">Pinned</MetaPill>}
              <MetaPill color={typeStyle.color} bg={typeStyle.bg}>{getEntryLabel(entryType)}</MetaPill>
              {note.stock_name && <MetaPill color="var(--green)" bg="var(--green-dim)">{note.stock_name}</MetaPill>}
            </div>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
              marginBottom: 6, letterSpacing: '-0.01em',
              wordBreak: 'break-word',
            }}>{note.title}</h3>
          </div>
          <span style={{
            fontSize: 12, color: 'var(--text-muted)', flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s', display: 'block', marginTop: 2,
          }}>v</span>
        </div>

        {!expanded && (
          <p style={{
            fontSize: 12, color: 'var(--text-muted)',
            lineHeight: 1.6, marginBottom: 10,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>{preview}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {note.tags?.slice(0, 4).map(tag => (
              <span key={tag} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 4,
                background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                fontWeight: 600,
              }}>{tag}</span>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {formatDate(note.updated_at)}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {note.link_url && (
            <div style={{ padding: '14px 18px 0' }}>
              <a
                href={note.link_url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
                style={{ display: 'inline-flex', textDecoration: 'none', fontSize: 12, padding: '7px 12px' }}
              >
                Open Link
              </a>
            </div>
          )}

          <div
            className="tiptap-wrapper"
            style={{
              padding: '0 18px',
              overflowX: 'hidden',
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}
            dangerouslySetInnerHTML={{ __html: note.content }}
          />

          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <button className="btn-ghost" onClick={() => onTogglePin(note)}
              style={{ fontSize: 12, padding: '6px 14px' }}>
              {note.is_pinned ? 'Unpin' : 'Pin'}
            </button>
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

function FilterButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: '6px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        background: active ? 'var(--accent-dim)' : 'var(--bg-elevated)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        border: `1px solid ${active ? 'var(--accent)40' : 'var(--border)'}`,
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  )
}

export default function Playbook() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterType, setFilterType] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('playbook')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes()
  }, [fetchNotes])

  const handleDelete = (id) => setConfirmId(id)

  const confirmDelete = async () => {
    await supabase.from('playbook').delete().eq('id', confirmId)
    setNotes(n => n.filter(x => x.id !== confirmId))
    setConfirmId(null)
  }

  const togglePin = async (note) => {
    const nextPinned = !note.is_pinned
    const { error } = await supabase
      .from('playbook')
      .update({ is_pinned: nextPinned })
      .eq('id', note.id)

    if (!error) {
      setNotes(n => n.map(x => x.id === note.id ? { ...x, is_pinned: nextPinned } : x))
    }
  }

  const allTags = useMemo(() => [...new Set(notes.flatMap(n => n.tags || []))], [notes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return notes
      .filter(n => {
        const searchable = [
          n.title,
          stripHtml(n.content || ''),
          n.stock_name,
          n.link_url,
          n.entry_type,
          ...(n.tags || []),
        ].join(' ').toLowerCase()
        const matchSearch = !q || searchable.includes(q)
        const matchTag = !filterTag || n.tags?.includes(filterTag)
        const matchType = !filterType || (n.entry_type || 'note') === filterType
        return matchSearch && matchTag && matchType
      })
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
  }, [filterTag, filterType, notes, search])

  const counts = useMemo(() => ({
    pinned: notes.filter(n => n.is_pinned).length,
    watchlist: notes.filter(n => n.entry_type === 'watchlist').length,
    strategies: notes.filter(n => n.entry_type === 'strategy').length,
  }), [notes])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11, color: 'var(--accent)', letterSpacing: '0.15em', marginBottom: 6,
          }}>STRATEGIES · IDEAS · WATCHLIST</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Playbook
          </h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => setEditing({})}
            style={{ fontSize: 12, padding: '8px 16px' }}>
            + New Entry
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 10,
        marginBottom: 16,
      }}>
        {[
          ['Entries', notes.length],
          ['Pinned', counts.pinned],
          ['Strategies', counts.strategies],
          ['Watchlist', counts.watchlist],
        ].map(([label, value]) => (
          <div key={label} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 5 }}>
              {label.toUpperCase()}
            </div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title, description, tag, stock, link..."
          style={{ maxWidth: 360 }}
        />
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ maxWidth: 180 }}>
          <option value="">All types</option>
          {ENTRY_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <FilterButton active={!filterTag} onClick={() => setFilterTag('')}>All Tags</FilterButton>
        {allTags.map(tag => (
          <FilterButton key={tag} active={filterTag === tag} onClick={() => setFilterTag(tag === filterTag ? '' : tag)}>
            {tag}
          </FilterButton>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
          Loading entries...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          border: '1px dashed var(--border)', borderRadius: 12,
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No playbook entries found.</p>
          <button className="btn-primary" onClick={() => setEditing({})} style={{ marginTop: 16 }}>
            Create Entry
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
              onTogglePin={togglePin}
            />
          ))}
        </div>
      )}

      {editing !== null && (
        <NoteEditor
          note={editing}
          onSave={() => { setEditing(null); fetchNotes() }}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmId && (
        <ConfirmDialog
          message="This playbook entry will be permanently deleted."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
