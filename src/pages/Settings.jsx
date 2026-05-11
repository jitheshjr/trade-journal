import { useEffect, useState } from 'react'
import useBrokerStore from '../store/useBrokerStore'
import useStrategyStore from '../store/useStrategyStore'
import useAuthStore from '../store/useAuthStore'
import ConfirmDialog from '../components/ConfirmDialog'

const BROKER_OPTIONS = [
  { key: 'zerodha', label: 'Zerodha Kite' },
  { key: 'firstock', label: 'Firstock' },
  { key: 'custom', label: 'Custom / Other' },
]

function BrokerSection() {
  const { brokers, fetchBrokers, addBroker, deleteBroker } = useBrokerStore()
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState({ name: '', broker_key: 'zerodha', initial_capital: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => { fetchBrokers() }, [])

  const handleAdd = async () => {
    if (!form.name || !form.initial_capital) return setError('All fields are required.')
    setLoading(true)
    setError(null)
    const capital = parseFloat(form.initial_capital)
    const { error } = await addBroker({
      user_id: user.id,
      name: form.name,
      broker_key: form.broker_key,
      initial_capital: capital,
      current_capital: capital,
    })
    if (error) setError(error.message)
    else setForm({ name: '', broker_key: 'zerodha', initial_capital: '' })
    setLoading(false)
  }
  const confirmDelete = async () => {
    await deleteBroker(confirmId)
    setConfirmId(null)
  }

  return (
    <div>
      <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        Brokers
      </h2>

      {/* Add form */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="label">Account Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Zerodha Main"
            />
          </div>
          <div>
            <label className="label">Broker</label>
            <select
              className="input"
              value={form.broker_key}
              onChange={(e) => setForm({ ...form, broker_key: e.target.value })}
            >
              {BROKER_OPTIONS.map((b) => (
                <option key={b.key} value={b.key}>{b.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Starting Capital (₹)</label>
            <input
              type="number"
              className="input mono"
              value={form.initial_capital}
              onChange={(e) => setForm({ ...form, initial_capital: e.target.value })}
              placeholder="50000"
            />
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-dim)', border: '1px solid var(--red)40',
            color: 'var(--red)', borderRadius: 8, padding: '10px 14px',
            fontSize: 12, marginBottom: 12,
          }}>{error}</div>
        )}

        <button className="btn-primary" onClick={handleAdd} disabled={loading}>
          {loading ? 'Adding...' : '+ Add Broker'}
        </button>
      </div>

      {/* Broker list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {brokers.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No brokers added yet.</p>
        )}
        {brokers.map((b) => {
          const diff = b.current_capital - b.initial_capital
          const growth = ((diff / b.initial_capital) * 100).toFixed(2)
          const isPositive = diff >= 0
          return (
            <div key={b.id} className="card" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderColor: isPositive ? 'var(--border)' : 'var(--red)30',
            }}>
              <div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>{b.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                  {BROKER_OPTIONS.find(o => o.key === b.broker_key)?.label}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="mono" style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }}>
                  ₹{b.current_capital.toLocaleString('en-IN')}
                </p>
                <p className="mono" style={{
                  fontSize: 11, marginTop: 2,
                  color: isPositive ? 'var(--green)' : 'var(--red)',
                }}>
                  {isPositive ? '+' : ''}₹{diff.toLocaleString('en-IN')} ({isPositive ? '+' : ''}{growth}%)
                </p>
              </div>
              <button onClick={() => setConfirmId(b.id)} className="btn-ghost"
                style={{ marginLeft: 16, padding: '6px 12px', fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)40' }}>
                Remove
              </button>
            </div>
          )
        })}
      </div>
      {confirmId && (
        <ConfirmDialog
          message="This broker account will be removed. All associated trades will remain but lose the broker link."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}

function StrategySection() {
  const { strategies, fetchStrategies, addStrategy, deleteStrategy } = useStrategyStore()
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => { fetchStrategies() }, [])

  const handleAdd = async () => {
    if (!form.name) return setError('Strategy name is required.')
    setLoading(true)
    setError(null)
    const { error } = await addStrategy({ user_id: user.id, ...form })
    if (error) setError(error.message)
    else setForm({ name: '', description: '' })
    setLoading(false)
  }
  const confirmDelete = async () => {
    await deleteStrategy(confirmId)
    setConfirmId(null)
  }

  return (
    <div>
      <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        Strategies & Patterns
      </h2>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Breakout, Bull Flag, ORB"
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short note about this strategy"
            />
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-dim)', border: '1px solid var(--red)40',
            color: 'var(--red)', borderRadius: 8, padding: '10px 14px',
            fontSize: 12, marginBottom: 12,
          }}>{error}</div>
        )}

        <button className="btn-primary" onClick={handleAdd} disabled={loading}>
          {loading ? 'Adding...' : '+ Add Strategy'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {strategies.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No strategies added yet.</p>
        )}
        {strategies.map((s) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 14px',
          }}>
            <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{s.name}</span>
            {s.description && (
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>— {s.description}</span>
            )}
            <button onClick={() => setConfirmId(s.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 12, padding: 0,
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.target.style.color = 'var(--red)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            >✕</button>
          </div>
        ))}
      </div>
      {confirmId && (
        <ConfirmDialog
          message="This strategy will be deleted. Trades using it will remain but lose the strategy link."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}

export default function Settings() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: 'var(--accent)',
          letterSpacing: '0.15em', marginBottom: 6,
        }}>CONFIGURATION</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Settings
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        <BrokerSection />
        <div style={{ borderTop: '1px solid var(--border)' }} />
        <StrategySection />
      </div>
    </div>
  )
}