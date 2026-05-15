import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useTradeStore from '../store/useTradeStore'
import useBrokerStore from '../store/useBrokerStore'

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

function RecentTrades({ trades, navigate }) {
  const recent = trades.slice(0, 5)

  return (
    <div className="card">
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
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

function BrokerCards({ brokers, trades }) {
  if (brokers.length === 0) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>
        BROKER ACCOUNTS
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        {brokers.map(b => {
          const initialCapital = Number(b.initial_capital || 0)
          const closedPnl = trades
            .filter(t => t.broker_id === b.id && t.status === 'CLOSED' && t.net_pnl !== null)
            .reduce((sum, t) => sum + Number(t.net_pnl || 0), 0)
          const currentCapital = initialCapital + closedPnl
          const diff = currentCapital - initialCapital
          const pct = initialCapital ? ((diff / initialCapital) * 100).toFixed(2) : '0.00'
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
                  Started ₹{initialCapital.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹{currentCapital.toLocaleString('en-IN')}
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

function OpenTradesSection({ trades }) {
  if (trades.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-title">Open Positions</div>
      {trades.map(trade => {
        const dir = trade.direction === 'LONG'
          ? { color: 'var(--green)', label: '▲' }
          : { color: 'var(--red)', label: '▼' }
        return (
          <div key={trade.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: dir.color }}>{dir.label}</span>
              <div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {trade.symbol}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Entry ₹{trade.entry_price} · {trade.quantity} qty
                </div>
              </div>
            </div>
            <span style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 4,
              background: 'var(--accent-dim)', color: 'var(--accent)',
              fontWeight: 700,
            }}>{trade.brokers?.name}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { trades, fetchTrades } = useTradeStore()
  const { brokers, fetchBrokers } = useBrokerStore()
  const [tradeType, setTradeType] = useState('INTRADAY')

  useEffect(() => {
    fetchTrades({})
    fetchBrokers()
  }, [fetchTrades, fetchBrokers])

  const typedTrades = trades.filter(t => t.trade_type === tradeType)

  const { from, to } = getTodayRange()
  const todayTrades = typedTrades.filter(t => {
    const d = new Date(t.entry_date)
    return d >= new Date(from) && d <= new Date(to)
  })
  const todayClosed = todayTrades.filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
  const todayPnl = todayClosed.reduce((s, t) => s + t.net_pnl, 0)

  const allClosed = typedTrades.filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
  const totalPnl = allClosed.reduce((s, t) => s + t.net_pnl, 0)
  const winners = allClosed.filter(t => t.net_pnl > 0)
  const winRate = allClosed.length ? ((winners.length / allClosed.length) * 100).toFixed(0) : 0

  // Open trades only for swing
  const openTrades = tradeType === 'SWING'
    ? typedTrades.filter(t => t.status === 'OPEN')
    : []

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
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px', boxSizing: 'border-box', width: '100%' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{
          fontSize: 20, fontWeight: 700,
          letterSpacing: '-0.02em', color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          {greeting()}
        </h1>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, color: 'var(--text-muted)',
          letterSpacing: '0.08em', marginBottom: 20,
        }}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long'
          }).toUpperCase()}
        </div>

        {/* Intraday / Swing toggle */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10, padding: 4, gap: 4,
        }}>
          {['INTRADAY', 'SWING'].map(type => (
            <button key={type} onClick={() => setTradeType(type)} style={{
              padding: '8px 28px',
              borderRadius: 7,
              border: 'none',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: tradeType === type ? 'var(--accent)' : 'transparent',
              color: tradeType === type ? '#0a0a0a' : 'var(--text-muted)',
            }}>{type}</button>
          ))}
        </div>
      </div>

      {/* Broker accounts — top */}
      <BrokerCards brokers={brokers} trades={trades} />

      {/* Today PL + Total PL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>
            TODAY'S P&L
          </div>
          <div className="mono" style={{
            fontSize: 20, fontWeight: 700,
            color: todayPnl > 0 ? 'var(--green)' : todayPnl < 0 ? 'var(--red)' : 'var(--text-primary)',
          }}>
            {todayPnl >= 0 ? '+' : ''}₹{todayPnl.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {todayClosed.length} trades closed
          </div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>
            TOTAL P&L
          </div>
          <div className="mono" style={{
            fontSize: 20, fontWeight: 700,
            color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            all time · {allClosed.length} trades
          </div>
        </div>
      </div>

      {/* Secondary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 10, marginBottom: 16,
      }}>
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
          sub={`${allClosed.length} closed`}
          color="var(--accent)"
        />
        {tradeType === 'SWING' && (
          <StatCard
            label="Open Trades"
            value={openTrades.length}
            sub="active positions"
            color="var(--blue)"
          />
        )}
        {streak > 0 && (
          <StatCard
            label="Streak"
            value={`${streak} ${streakType ? 'W' : 'L'}`}
            sub={streakType ? '🔥 winning' : '❄️ losing'}
            color={streakType ? 'var(--green)' : 'var(--red)'}
          />
        )}
      </div>

      {/* Open positions — swing only */}
      {tradeType === 'SWING' && (
        <OpenTradesSection trades={openTrades} />
      )}

      {/* Recent trades */}
      <RecentTrades trades={typedTrades} navigate={navigate} />

    </div>
  )
}
