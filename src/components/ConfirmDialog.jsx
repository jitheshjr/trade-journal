export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(10,10,10,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '28px 28px 24px',
        maxWidth: 380,
        width: '100%',
        boxShadow: '0 0 40px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--red-dim)',
          border: '1px solid rgba(255,77,106,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, marginBottom: 16,
        }}>⚠</div>

        <h3 style={{
          fontSize: 16, fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8, letterSpacing: '-0.01em',
        }}>Are you sure?</h3>

        <p style={{
          fontSize: 13, color: 'var(--text-secondary)',
          lineHeight: 1.6, marginBottom: 24,
        }}>{message}</p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            className="btn-ghost"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: 'var(--red-dim)',
              color: 'var(--red)',
              border: '1px solid rgba(255,77,106,0.3)',
              borderRadius: 8,
              padding: '10px',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}