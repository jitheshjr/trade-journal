import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useTradeStore from '../store/useTradeStore'
import useBrokerStore from '../store/useBrokerStore'
import useAuthStore from '../store/useAuthStore'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { from: start.toISOString(), to: end.toISOString() }
}

function StatCard({ label, value, sub, color, mono = true }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label.toUpperCase()}
      </div>
      <div className={mono ? 'mono' : ''} style={{
        fontSize: 22, fontWeight: 700,
        color: color || 'var(--text-primary)',
        letterSpacing: mono ? '-0.02em' : 'normal',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function OpenTradeRow({ trade, navigate }) {
  const dir = trade.direction === 'LONG'
    ? { color: 'var(--green)', label: '▲' }
    : { color: 'var(--red)', label: '▼' }

  const unrealizedNote = trade.entry_price
    ? `Entry ₹${trade.entry_price} · ${trade.quantity} qty`
    : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: dir.color, fontSize: 16 }}>{dir.label}</span>
        <div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {trade.symbol}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {unrealizedNote}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 4,
          background: 'var(--accent-dim)', color: 'var(--accent)',
          fontWeight: 700, letterSpacing: '0.05em',
        }}>
          {trade.trade_type}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {trade.brokers?.name}
        </span>
      </div>
    </div>
  )
}

function EquityCurve({ trades }) {
  const closed = [...trades]
    .filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))

  if (closed.length < 2) return null

  let cumulative = 0
  const points = closed.map(t => {
    cumulative += t.net_pnl
    return cumulative
  })

  const min = Math.min(0, ...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const W = 100
  const H = 60

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((p - min) / range) * H
    return `${x},${y}`
  })

  const isPositive = points[points.length - 1] >= 0
  const color = isPositive ? 'var(--green)' : 'var(--red)'
  const pathD = `M ${coords.join(' L ')}`
  const fillD = `M 0,${H} L ${coords.join(' L ')} L ${W},${H} Z`

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>
            EQUITY CURVE
          </div>
          <div className="mono" style={{
            fontSize: 20, fontWeight: 700,
            color: isPositive ? 'var(--green)' : 'var(--red)',
          }}>
            {isPositive ? '+' : ''}₹{points[points.length - 1].toLocaleString('en-IN')}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {closed.length} trades
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80, overflow: 'visible' }}
        preserveAspectRatio="none">
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#curveGrad)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function RecentTrades({ trades, navigate }) {
  const recent = trades.slice(0, 5)

  return (
    <div className="card">
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 4,
      }}>
        <div className="section-title" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
          Recent Trades
        </div>
        <button onClick={() => navigate('/journal')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: 'var(--accent)',
        }}>View all →</button>
      </div>

      {recent.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>
          No trades yet.
        </p>
      ) : (
        recent.map((trade) => {
          const isPositive = trade.net_pnl >= 0
          return (
            <div key={trade.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {trade.symbol}
                  </span>
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: trade.direction === 'LONG' ? 'var(--green)' : 'var(--red)',
                    background: trade.direction === 'LONG' ? 'var(--green-dim)' : 'var(--red-dim)',
                  }}>{trade.direction}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(trade.entry_date).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short'
                  })} · {trade.strategies?.name || '—'}
                </div>
              </div>
              {trade.net_pnl !== null ? (
                <div className="mono" style={{
                  fontSize: 14, fontWeight: 700,
                  color: isPositive ? 'var(--green)' : 'var(--red)',
                }}>
                  {isPositive ? '+' : ''}₹{trade.net_pnl.toLocaleString('en-IN')}
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Open</span>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function BrokerCards({ brokers }) {
  if (brokers.length === 0) return null
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>
        BROKER ACCOUNTS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {brokers.map(b => {
          const diff = b.current_capital - b.initial_capital
          const pct = ((diff / b.initial_capital) * 100).toFixed(2)
          const isPos = diff >= 0
          return (
            <div key={b.id} className="card" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px',
              borderColor: isPos ? 'var(--green)20' : 'var(--red)20',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Started ₹{b.initial_capital.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹{b.current_capital.toLocaleString('en-IN')}
                </div>
                <div className="mono" style={{
                  fontSize: 11, marginTop: 2,
                  color: isPos ? 'var(--green)' : 'var(--red)',
                }}>
                  {isPos ? '+' : ''}₹{diff.toLocaleString('en-IN')} ({isPos ? '+' : ''}{pct}%)
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { trades, fetchTrades } = useTradeStore()
  const { brokers, fetchBrokers } = useBrokerStore()

  useEffect(() => {
    fetchTrades({})
    fetchBrokers()
  }, [])

  // Today's trades
  const { from, to } = getTodayRange()
  const todayTrades = trades.filter(t => {
    const d = new Date(t.entry_date)
    return d >= new Date(from) && d <= new Date(to)
  })
  const todayClosed = todayTrades.filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
  const todayPnl = todayClosed.reduce((s, t) => s + t.net_pnl, 0)

  // All time
  const allClosed = trades.filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
  const totalPnl = allClosed.reduce((s, t) => s + t.net_pnl, 0)
  const winners = allClosed.filter(t => t.net_pnl > 0)
  const winRate = allClosed.length ? ((winners.length / allClosed.length) * 100).toFixed(0) : 0

  // Open trades
  const openTrades = trades.filter(t => t.status === 'OPEN')

  // Streak
  const sorted = [...allClosed].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
  let streak = 0
  let streakType = null
  for (const t of sorted) {
    const w = t.net_pnl > 0
    if (streakType === null) streakType = w
    if (w === streakType) streak++
    else break
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: 'var(--accent)', letterSpacing: '0.15em', marginBottom: 6,
        }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {greeting()}
          </h1>
          <button className="btn-primary" onClick={() => navigate('/trade/new')}>
            + New Trade
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 10, marginBottom: 20,
      }}>
        <StatCard
          label="Today's P&L"
          value={`${todayPnl >= 0 ? '+' : ''}₹${todayPnl.toLocaleString('en-IN')}`}
          sub={`${todayClosed.length} trades closed`}
          color={todayPnl >= 0 ? 'var(--green)' : todayPnl < 0 ? 'var(--red)' : 'var(--text-primary)'}
        />
        <StatCard
          label="Total P&L"
          value={`${totalPnl >= 0 ? '+' : ''}₹${totalPnl.toLocaleString('en-IN')}`}
          sub="all time"
          color={totalPnl >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
          sub={`${allClosed.length} closed trades`}
          color="var(--accent)"
        />
        <StatCard
          label="Open Trades"
          value={openTrades.length}
          sub="active positions"
          color={openTrades.length > 0 ? 'var(--blue)' : 'var(--text-muted)'}
        />
        {streak > 0 && (
          <StatCard
            label="Current Streak"
            value={`${streak} ${streakType ? 'W' : 'L'}`}
            sub={streakType ? '🔥 winning' : '❄️ losing'}
            color={streakType ? 'var(--green)' : 'var(--red)'}
          />
        )}
      </div>

      {/* Main grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16, marginBottom: 16,
      }}>
        <EquityCurve trades={trades} />
        <RecentTrades trades={trades} navigate={navigate} />
      </div>

      {/* Open trades */}
      {openTrades.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">Open Positions</div>
          {openTrades.map(t => (
            <OpenTradeRow key={t.id} trade={t} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Broker accounts */}
      <BrokerCards brokers={brokers} />

    </div>
  )
}