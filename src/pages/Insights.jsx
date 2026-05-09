import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import useTradeStore from '../store/useTradeStore'
import useBrokerStore from '../store/useBrokerStore'

// ── Helpers ───────────────────────────────────────────────

function pct(a, b) { return b ? ((a / b) * 100).toFixed(1) : '0' }

function avg(arr) { return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0 }

function buildEquityCurve(trades) {
  const sorted = [...trades]
    .filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
  let cum = 0
  return sorted.map(t => {
    cum += t.net_pnl
    return {
      date: new Date(t.entry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      pnl: +cum.toFixed(2),
      trade: t.symbol,
    }
  })
}

function buildDailyPnl(trades) {
  const map = {}
  trades
    .filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
    .forEach(t => {
      const day = new Date(t.entry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      map[day] = (map[day] || 0) + t.net_pnl
    })
  return Object.entries(map).map(([date, pnl]) => ({ date, pnl: +pnl.toFixed(2) }))
}

function buildStrategyStats(trades) {
  const map = {}
  trades
    .filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
    .forEach(t => {
      const name = t.strategies?.name || 'No Strategy'
      if (!map[name]) map[name] = { name, trades: 0, wins: 0, pnl: 0 }
      map[name].trades++
      if (t.net_pnl > 0) map[name].wins++
      map[name].pnl += t.net_pnl
    })
  return Object.values(map).map(s => ({
    ...s,
    winRate: +pct(s.wins, s.trades),
    pnl: +s.pnl.toFixed(2),
  }))
}

function buildEmotionStats(trades) {
  const map = {}
  trades
    .filter(t => t.status === 'CLOSED' && t.net_pnl !== null && t.emotion_tag)
    .forEach(t => {
      const e = t.emotion_tag
      if (!map[e]) map[e] = { name: e, trades: 0, wins: 0, pnl: 0 }
      map[e].trades++
      if (t.net_pnl > 0) map[e].wins++
      map[e].pnl += t.net_pnl
    })
  return Object.values(map).map(e => ({ ...e, pnl: +e.pnl.toFixed(2) }))
}

function buildExitStats(trades) {
  const map = {}
  trades
    .filter(t => t.status === 'CLOSED' && t.net_pnl !== null && t.exit_reason)
    .forEach(t => {
      const r = t.exit_reason
      if (!map[r]) map[r] = { name: r, count: 0, pnl: 0 }
      map[r].count++
      map[r].pnl += t.net_pnl
    })
  return Object.values(map).map(e => ({ ...e, pnl: +e.pnl.toFixed(2) }))
}

function buildSymbolStats(trades) {
  const map = {}
  trades
    .filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
    .forEach(t => {
      if (!map[t.symbol]) map[t.symbol] = { symbol: t.symbol, trades: 0, wins: 0, pnl: 0 }
      map[t.symbol].trades++
      if (t.net_pnl > 0) map[t.symbol].wins++
      map[t.symbol].pnl += t.net_pnl
    })
  return Object.values(map)
    .map(s => ({ ...s, pnl: +s.pnl.toFixed(2), winRate: +pct(s.wins, s.trades) }))
    .sort((a, b) => b.pnl - a.pnl)
}

// ── Custom Tooltip ─────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="mono" style={{
          fontSize: 13, fontWeight: 600,
          color: p.value >= 0 ? 'var(--green)' : 'var(--red)',
        }}>
          {p.value >= 0 ? '+' : ''}₹{Number(p.value).toLocaleString('en-IN')}
        </div>
      ))}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────
function Section({ title, sub, children }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: 'var(--accent)', letterSpacing: '0.15em', marginBottom: 4,
        }}>{sub}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

// ── Stat pills ─────────────────────────────────────────────
function Pill({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-base)', borderRadius: 8,
      padding: '10px 14px', flex: '1 1 100px',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────
function Empty() {
  return (
    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 }}>
      Not enough data yet. Log more trades.
    </div>
  )
}

const EMOTION_EMOJI = {
  CONFIDENT: '😌', HESITANT: '😟', FOMO: '😰', REVENGE: '😤', NEUTRAL: '😐'
}

const EXIT_LABEL = {
  TARGET_HIT: 'Target Hit', SL_HIT: 'SL Hit',
  MANUAL: 'Manual', TRAILING_SL: 'Trailing SL', EOD: 'EOD'
}

const PIE_COLORS = [
  'var(--accent)', 'var(--green)', 'var(--blue)', 'var(--red)', '#a78bfa'
]

// ── Page ──────────────────────────────────────────────────
export default function Insights() {
  const { trades, fetchTrades } = useTradeStore()
  const { brokers, fetchBrokers } = useBrokerStore()
  const [brokerFilter, setBrokerFilter] = useState('')

  useEffect(() => { fetchTrades({}); fetchBrokers() }, [])

  const filtered = brokerFilter
    ? trades.filter(t => t.broker_id === brokerFilter)
    : trades

  const closed = filtered.filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
  const winners = closed.filter(t => t.net_pnl > 0)
  const losers = closed.filter(t => t.net_pnl < 0)
  const totalPnl = closed.reduce((s, t) => s + t.net_pnl, 0)
  const totalCharges = closed.reduce((s, t) => s + (t.brokerage || 0), 0)
  const avgWin = avg(winners.map(t => t.net_pnl))
  const avgLoss = avg(losers.map(t => Math.abs(t.net_pnl)))
  const rrRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—'
  const profitFactor = losers.reduce((s, t) => s + Math.abs(t.net_pnl), 0)
  const pf = profitFactor > 0
    ? (winners.reduce((s, t) => s + t.net_pnl, 0) / profitFactor).toFixed(2)
    : '—'

  // Streak
  const sorted = [...closed].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
  let streak = 0; let streakType = null
  for (const t of sorted) {
    const w = t.net_pnl > 0
    if (streakType === null) streakType = w
    if (w === streakType) streak++
    else break
  }

  const equityCurve = buildEquityCurve(filtered)
  const dailyPnl = buildDailyPnl(filtered)
  const strategyStats = buildStrategyStats(filtered)
  const emotionStats = buildEmotionStats(filtered)
  const exitStats = buildExitStats(filtered)
  const symbolStats = buildSymbolStats(filtered)

  // Intraday vs Swing breakdown
  const intradayClosed = closed.filter(t => t.trade_type === 'INTRADAY')
  const swingClosed = closed.filter(t => t.trade_type === 'SWING')
  const typeData = [
    { name: 'Intraday', value: intradayClosed.length },
    { name: 'Swing', value: swingClosed.length },
  ].filter(d => d.value > 0)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: 'var(--accent)', letterSpacing: '0.15em', marginBottom: 6,
          }}>ANALYTICS</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Insights
          </h1>
        </div>
        {brokers.length > 1 && (
          <div>
            <label className="label">Filter by Broker</label>
            <select className="input" value={brokerFilter}
              onChange={e => setBrokerFilter(e.target.value)}
              style={{ minWidth: 160 }}>
              <option value="">All Brokers</option>
              {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Top KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10, marginBottom: 20,
      }}>
        <Pill label="Total P&L" value={`${totalPnl >= 0 ? '+' : ''}₹${totalPnl.toLocaleString('en-IN')}`}
          color={totalPnl >= 0 ? 'var(--green)' : 'var(--red)'} />
        <Pill label="Win Rate" value={`${pct(winners.length, closed.length)}%`} color="var(--accent)" />
        <Pill label="Trades" value={closed.length} />
        <Pill label="Avg Win" value={`₹${avgWin.toFixed(0)}`} color="var(--green)" />
        <Pill label="Avg Loss" value={`₹${avgLoss.toFixed(0)}`} color="var(--red)" />
        <Pill label="Actual R:R" value={rrRatio} color="var(--blue)" />
        <Pill label="Profit Factor" value={pf} color={parseFloat(pf) >= 1 ? 'var(--green)' : 'var(--red)'} />
        <Pill label="Total Charges" value={`₹${totalCharges.toFixed(0)}`} color="var(--text-secondary)" />
        {streak > 0 && (
          <Pill label="Streak" value={`${streak} ${streakType ? 'W' : 'L'}`}
            color={streakType ? 'var(--green)' : 'var(--red)'} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Equity Curve */}
        <Section title="Equity Curve" sub="CUMULATIVE P&L">
          {equityCurve.length < 2 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={equityCurve}>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="pnl" stroke="var(--accent)"
                  strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--accent)' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* Daily P&L */}
        <Section title="Daily P&L" sub="PER DAY BREAKDOWN">
          {dailyPnl.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyPnl} barSize={16}>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {dailyPnl.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? 'var(--green)' : 'var(--red)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* Two column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

          {/* Strategy performance */}
          <Section title="Strategy Performance" sub="WIN RATE & P&L">
            {strategyStats.length === 0 ? <Empty /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {strategyStats.map(s => (
                  <div key={s.name} style={{
                    background: 'var(--bg-base)', borderRadius: 8, padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.name}
                      </span>
                      <span className="mono" style={{
                        fontSize: 13, fontWeight: 700,
                        color: s.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                      }}>
                        {s.pnl >= 0 ? '+' : ''}₹{s.pnl.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {/* Win rate bar */}
                    <div style={{
                      height: 4, background: 'var(--bg-elevated)',
                      borderRadius: 2, overflow: 'hidden', marginBottom: 6,
                    }}>
                      <div style={{
                        height: '100%', width: `${s.winRate}%`,
                        background: s.winRate >= 50 ? 'var(--green)' : 'var(--red)',
                        borderRadius: 2, transition: 'width 0.4s',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {s.trades} trades
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {s.winRate}% win rate
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Symbol performance */}
          <Section title="Symbol Performance" sub="TOP SYMBOLS">
            {symbolStats.length === 0 ? <Empty /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {symbolStats.slice(0, 6).map(s => (
                  <div key={s.symbol} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8,
                  }}>
                    <div>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {s.symbol}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                        {s.trades} trades · {s.winRate}% WR
                      </span>
                    </div>
                    <span className="mono" style={{
                      fontSize: 13, fontWeight: 700,
                      color: s.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>
                      {s.pnl >= 0 ? '+' : ''}₹{s.pnl.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Emotion analysis */}
          <Section title="Emotion Analysis" sub="HOW FEELINGS AFFECT TRADES">
            {emotionStats.length === 0 ? <Empty /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {emotionStats.map(e => (
                  <div key={e.name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{EMOTION_EMOJI[e.name] || '🙂'}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {e.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {e.trades} trades · {pct(e.wins, e.trades)}% WR
                        </div>
                      </div>
                    </div>
                    <span className="mono" style={{
                      fontSize: 13, fontWeight: 700,
                      color: e.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>
                      {e.pnl >= 0 ? '+' : ''}₹{e.pnl.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Exit reason analysis */}
          <Section title="Exit Reasons" sub="WHY YOU EXITED">
            {exitStats.length === 0 ? <Empty /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {exitStats.map(e => (
                  <div key={e.name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {EXIT_LABEL[e.name] || e.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.count} trades</div>
                    </div>
                    <span className="mono" style={{
                      fontSize: 13, fontWeight: 700,
                      color: e.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>
                      {e.pnl >= 0 ? '+' : ''}₹{e.pnl.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

        </div>

        {/* Intraday vs Swing */}
        {typeData.length > 0 && (
          <Section title="Intraday vs Swing" sub="TRADE TYPE SPLIT">
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
              <PieChart width={140} height={140}>
                <Pie data={typeData} cx={65} cy={65} innerRadius={40} outerRadius={60}
                  dataKey="value" paddingAngle={3}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {typeData.map((d, i) => {
                  const typeClosed = closed.filter(t => t.trade_type === d.name.toUpperCase())
                  const typeWins = typeClosed.filter(t => t.net_pnl > 0)
                  const typePnl = typeClosed.reduce((s, t) => s + t.net_pnl, 0)
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i] }} />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {d.name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                          {d.value} trades · {pct(typeWins.length, typeClosed.length)}% WR
                        </span>
                        <span className="mono" style={{
                          fontSize: 12, marginLeft: 8, fontWeight: 600,
                          color: typePnl >= 0 ? 'var(--green)' : 'var(--red)',
                        }}>
                          {typePnl >= 0 ? '+' : ''}₹{typePnl.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Section>
        )}

      </div>
    </div>
  )
}