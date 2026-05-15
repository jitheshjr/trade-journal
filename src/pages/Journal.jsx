import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useTradeStore from '../store/useTradeStore'
import useBrokerStore from '../store/useBrokerStore'
import useStrategyStore from '../store/useStrategyStore'
import ConfirmDialog from '../components/ConfirmDialog'

const DIRECTION_STYLE = {
  LONG: { color: 'var(--green)', bg: 'var(--green-dim)', label: '▲ LONG' },
  SHORT: { color: 'var(--red)', bg: 'var(--red-dim)', label: '▼ SHORT' },
}

const STATUS_STYLE = {
  OPEN: { color: 'var(--blue)', bg: 'var(--blue-dim)' },
  CLOSED: { color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
  PARTIAL: { color: 'var(--accent)', bg: 'var(--accent-dim)' },
}

const EMOTION_LABEL = {
  CONFIDENT: '😌 Confident',
  HESITANT: '😟 Hesitant',
  FOMO: '😰 FOMO',
  REVENGE: '😤 Revenge',
  NEUTRAL: '😐 Neutral',
}

const EXIT_LABEL = {
  TARGET_HIT: '🎯 Target Hit',
  SL_HIT: '🛑 SL Hit',
  MANUAL: '✋ Manual',
  TRAILING_SL: '📉 Trailing SL',
  EOD: '🕔 EOD',
}

function TradeCard({ trade, onDelete, navigate }) {
  const [expanded, setExpanded] = useState(false)
  const isPositive = trade.net_pnl >= 0
  const dir = DIRECTION_STYLE[trade.direction]
  const status = STATUS_STYLE[trade.status]

  return (
    <div className="card" style={{
      borderColor: trade.status === 'CLOSED'
        ? (isPositive ? 'var(--green)25' : 'var(--red)25')
        : 'var(--border)',
      transition: 'border-color 0.2s',
      padding: 0,
      overflow: 'hidden',
    }}>
      {/* Main row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
      >
        {/* Left: Symbol + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {trade.symbol}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: dir.bg, color: dir.color, letterSpacing: '0.06em',
            }}>{dir.label}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: status.bg, color: status.color, letterSpacing: '0.06em',
            }}>{trade.status}</span>
            <span style={{
              fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em',
              background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4,
            }}>{trade.trade_type}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {trade.brokers?.name}
            </span>
            {trade.strategies?.name && (
              <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.8 }}>
                {trade.strategies.name}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(trade.entry_date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Right: P&L */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {trade.net_pnl !== null ? (
            <>
              <div className="mono" style={{
                fontSize: 18, fontWeight: 700,
                color: isPositive ? 'var(--green)' : 'var(--red)',
              }}>
                {isPositive ? '+' : ''}₹{trade.net_pnl.toLocaleString('en-IN')}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                net • {trade.quantity} qty
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {trade.quantity} qty
            </div>
          )}
        </div>

        {/* Chevron */}
        <div style={{
          color: 'var(--text-muted)', fontSize: 12, flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
        }}>▼</div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>

          {/* Price grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {[
              ['Entry', `₹${trade.entry_price}`],
              ['Exit', trade.exit_price ? `₹${trade.exit_price}` : '—'],
              ['Planned SL', trade.planned_sl ? `₹${trade.planned_sl}` : '—'],
              ['Planned TP', trade.planned_tp ? `₹${trade.planned_tp}` : '—'],
              ['Gross P&L', trade.gross_pnl !== null ? `₹${trade.gross_pnl}` : '—'],
              ['Charges', trade.brokerage !== null ? `₹${trade.brokerage}` : '—'],
            ].map(([label, val]) => (
              <div key={label} style={{
                background: 'var(--bg-base)', borderRadius: 8, padding: '10px 12px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em' }}>
                  {label.toUpperCase()}
                </div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* R:R */}
          {trade.planned_sl && trade.planned_tp && trade.entry_price && (() => {
            const risk = Math.abs(trade.entry_price - trade.planned_sl)
            const reward = Math.abs(trade.planned_tp - trade.entry_price)
            const rr = risk > 0 ? (reward / risk).toFixed(2) : null
            return rr ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PLANNED R:R</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                  1 : {rr}
                </span>
              </div>
            ) : null
          })()}

          {/* Tags row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {trade.exit_reason && (
              <span style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}>{EXIT_LABEL[trade.exit_reason] || trade.exit_reason}</span>
            )}
            {trade.emotion_tag && (
              <span style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}>{EMOTION_LABEL[trade.emotion_tag] || trade.emotion_tag}</span>
            )}
            {trade.setup_quality && (
              <span style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                background: 'var(--accent-dim)', color: 'var(--accent)',
                border: '1px solid var(--accent)30',
              }}>Setup {trade.setup_quality}/5</span>
            )}
          </div>

          {/* Notes */}
          {trade.notes && (
            <div style={{
              background: 'var(--bg-base)', borderRadius: 8, padding: '12px 14px',
              borderLeft: '3px solid var(--accent)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em' }}>
                NOTES
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {trade.notes}
              </p>
            </div>
          )}

          {/* Screenshot */}
          {trade.screenshot_url && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.06em' }}>
                CHART
              </div>
              <img
                src={trade.screenshot_url}
                alt="Trade chart"
                style={{
                  width: '100%', borderRadius: 8,
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}
                onClick={() => window.open(trade.screenshot_url, '_blank')}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-ghost"
              onClick={() => navigate('/trade/new', { state: { trade } })}
              style={{ fontSize: 12, padding: '8px 16px' }}
            >
              Edit
            </button>
            <button
              className="btn-ghost"
              onClick={() => onDelete(trade.id)}
              style={{ fontSize: 12, padding: '8px 16px', color: 'var(--red)', borderColor: 'var(--red)40' }}
            >
              Delete
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

function SummaryBar({ trades }) {
  const closed = trades.filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
  const totalPnl = closed.reduce((sum, t) => sum + t.net_pnl, 0)
  const winners = closed.filter(t => t.net_pnl > 0)
  const winRate = closed.length ? ((winners.length / closed.length) * 100).toFixed(0) : 0
  const avgWin = winners.length ? winners.reduce((s, t) => s + t.net_pnl, 0) / winners.length : 0
  const losers = closed.filter(t => t.net_pnl < 0)
  const avgLoss = losers.length ? Math.abs(losers.reduce((s, t) => s + t.net_pnl, 0) / losers.length) : 0

  const stats = [
    { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}₹${totalPnl.toLocaleString('en-IN')}`, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'Win Rate', value: `${winRate}%`, color: 'var(--accent)' },
    { label: 'Trades', value: closed.length, color: 'var(--text-primary)' },
    { label: 'Avg Win', value: `₹${avgWin.toFixed(0)}`, color: 'var(--green)' },
    { label: 'Avg Loss', value: `₹${avgLoss.toFixed(0)}`, color: 'var(--red)' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: 10, marginBottom: 24,
    }}>
      {stats.map(({ label, value, color }) => (
        <div key={label} className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
            {label.toUpperCase()}
          </div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 700, color }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

function Filters({ filters, setFilter, clearFilters, brokers, strategies }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="section-title" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
          Filters
        </span>
        <button className="btn-ghost" onClick={clearFilters}
          style={{ fontSize: 11, padding: '4px 12px' }}>Clear</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        <div>
          <label className="label">Broker</label>
          <select className="input" value={filters.broker_id} onChange={e => setFilter('broker_id', e.target.value)}>
            <option value="">All</option>
            {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Strategy</label>
          <select className="input" value={filters.strategy_id} onChange={e => setFilter('strategy_id', e.target.value)}>
            <option value="">All</option>
            {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={filters.trade_type} onChange={e => setFilter('trade_type', e.target.value)}>
            <option value="">All</option>
            <option value="INTRADAY">Intraday</option>
            <option value="SWING">Swing</option>
          </select>
        </div>
        <div>
          <label className="label">From Date</label>
          <input type="date" className="input" value={filters.from_date}
            onChange={e => setFilter('from_date', e.target.value)} />
        </div>
        <div>
          <label className="label">To Date</label>
          <input type="date" className="input" value={filters.to_date}
            onChange={e => setFilter('to_date', e.target.value)} />
        </div>
      </div>
    </div>
  )
}

export default function Journal() {
  const navigate = useNavigate()
  const { trades, loading, filters, setFilter, clearFilters, fetchTrades, deleteTrade } = useTradeStore()
  const { brokers, fetchBrokers } = useBrokerStore()
  const { strategies, fetchStrategies } = useStrategyStore()
  const [showFilters, setShowFilters] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => { fetchBrokers(); fetchStrategies() }, [])
  useEffect(() => { fetchTrades(filters) }, [filters])

  const handleDelete = (id) => setConfirmId(id)

  const confirmDelete = async () => {
    await deleteTrade(confirmId)
    setConfirmId(null)
  }


  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11, color: 'var(--accent)', letterSpacing: '0.15em', marginBottom: 6,
          }}>TRADE LOG</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Journal
          </h1>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <button className="btn-primary" onClick={() => navigate('/trade/new')}
            style={{ fontSize: 12, padding: '8px 16px', flexShrink: 0 }}>
            + New Trade
          </button>
          <button className="btn-ghost" onClick={() => setShowFilters(f => !f)}
            style={{ fontSize: 12, padding: '8px 16px', flexShrink: 0 }}>
            {showFilters ? 'Hide Filters' : 'Filters'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <SummaryBar trades={trades} />

      {/* Filters */}
      {showFilters && (
        <Filters
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          brokers={brokers}
          strategies={strategies}
        />
      )}

      {/* Trade list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
          Loading trades...
        </div>
      ) : trades.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          border: '1px dashed var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No trades found.</p>
          <button className="btn-primary" onClick={() => navigate('/trade/new')}
            style={{ marginTop: 16 }}>Log your first trade</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trades.map(trade => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onDelete={handleDelete}
              navigate={navigate}
            />
          ))}
        </div>
      )}
      {confirmId && (
      <ConfirmDialog
        message="This trade will be permanently deleted. This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    )}
    </div>
  )
}
