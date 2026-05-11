import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { calculateCharges } from '../lib/calculateCharges'
import { uploadScreenshot } from '../lib/uploadScreenshot'
import useBrokerStore from '../store/useBrokerStore'
import useStrategyStore from '../store/useStrategyStore'
import useAuthStore from '../store/useAuthStore'

const EMPTY = {
  broker_id: '',
  strategy_id: '',
  symbol: '',
  direction: 'LONG',
  trade_type: 'INTRADAY',
  status: 'CLOSED',
  quantity: '',
  entry_price: '',
  exit_price: '',
  planned_sl: '',
  planned_tp: '',
  notes: '',
  setup_quality: '',
  emotion_tag: '',
  exit_reason: '',
  entry_date: new Date().toISOString().slice(0, 16),
  exit_date: new Date().toISOString().slice(0, 16),
}

function Row({ children, cols = 2 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`,
      gap: 12,
    }}>{children}</div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function PnlPreview({ form, brokers }) {
  const broker = brokers.find(b => b.id === form.broker_id)
  if (!broker || !form.entry_price || !form.exit_price || !form.quantity) return null

  const result = calculateCharges({
    brokerKey: broker.broker_key,
    tradeType: form.trade_type,
    direction: form.direction,
    quantity: parseInt(form.quantity),
    entryPrice: parseFloat(form.entry_price),
    exitPrice: parseFloat(form.exit_price),
  })

  if (!result) return null

  const isPositive = result.netPnl >= 0

  let rr = null
  if (form.planned_sl && form.planned_tp && form.entry_price) {
    const entry = parseFloat(form.entry_price)
    const sl = parseFloat(form.planned_sl)
    const tp = parseFloat(form.planned_tp)
    const risk = Math.abs(entry - sl)
    const reward = Math.abs(tp - entry)
    if (risk > 0) rr = (reward / risk).toFixed(2)
  }

  return (
    <div className="card"
      style={{ borderColor: isPositive ? 'var(--green)40' : 'var(--red)40' }}>
      <div className="section-title">Live P&L Preview</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>GROSS P&L</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: isPositive ? 'var(--green)' : 'var(--red)' }}>
            {isPositive ? '+' : ''}₹{result.grossPnl.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>NET P&L</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: isPositive ? 'var(--green)' : 'var(--red)' }}>
            {isPositive ? '+' : ''}₹{result.netPnl.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {rr && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>RISK : REWARD</div>
          <div className="mono" style={{ fontSize: 16, color: 'var(--accent)', fontWeight: 600 }}>1 : {rr}</div>
        </div>
      )}

      <div style={{
        background: 'var(--bg-base)', borderRadius: 8, padding: 12,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px',
      }}>
        {[
          ['Brokerage', result.brokerage],
          ['STT', result.stt],
          ['Exchange Fee', result.exchangeFee],
          ['SEBI', result.sebi],
          ['Stamp Duty', result.stampDuty],
          ['GST', result.gst],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>₹{val.toFixed(2)}</span>
          </div>
        ))}
        <div style={{
          gridColumn: '1/-1', borderTop: '1px solid var(--border)',
          paddingTop: 6, display: 'flex', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Charges</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
            ₹{result.totalCharges.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function TradeForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const { brokers, fetchBrokers } = useBrokerStore()
  const { strategies, fetchStrategies } = useStrategyStore()

  // location.state.trade is passed when editing
  const editTrade = location.state?.trade || null
  const isEdit = !!editTrade

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [existingScreenshot, setExistingScreenshot] = useState(null)

  useEffect(() => {
    fetchBrokers()
    fetchStrategies()

    // Prefill form if editing
    if (editTrade) {
      setForm({
        broker_id: editTrade.broker_id || '',
        strategy_id: editTrade.strategy_id || '',
        symbol: editTrade.symbol || '',
        direction: editTrade.direction || 'LONG',
        trade_type: editTrade.trade_type || 'INTRADAY',
        status: editTrade.status || 'CLOSED',
        quantity: editTrade.quantity || '',
        entry_price: editTrade.entry_price || '',
        exit_price: editTrade.exit_price || '',
        planned_sl: editTrade.planned_sl || '',
        planned_tp: editTrade.planned_tp || '',
        notes: editTrade.notes || '',
        setup_quality: editTrade.setup_quality || '',
        emotion_tag: editTrade.emotion_tag || '',
        exit_reason: editTrade.exit_reason || '',
        entry_date: editTrade.entry_date
          ? new Date(editTrade.entry_date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        exit_date: editTrade.exit_date
          ? new Date(editTrade.exit_date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      })
      if (editTrade.screenshot_url) {
        setExistingScreenshot(editTrade.screenshot_url)
      }
    }
  }, [])

  const upd = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!form.broker_id || !form.symbol || !form.quantity || !form.entry_price) {
      return setError('Broker, symbol, quantity and entry price are required.')
    }
    setLoading(true)
    setError(null)

    const broker = brokers.find(b => b.id === form.broker_id)
    let chargesData = {}

    if (form.exit_price && form.status !== 'OPEN') {
      const result = calculateCharges({
        brokerKey: broker.broker_key,
        tradeType: form.trade_type,
        direction: form.direction,
        quantity: parseInt(form.quantity),
        entryPrice: parseFloat(form.entry_price),
        exitPrice: parseFloat(form.exit_price),
      })
      if (result) {
        chargesData = {
          gross_pnl: result.grossPnl,
          brokerage: result.totalCharges,
          net_pnl: result.netPnl,
          charges_breakdown: result.breakdown,
        }
      }
    }

    // Handle screenshot upload
    let screenshotUrl = existingScreenshot || null
    if (screenshotFile) {
      const { url, error: uploadErr } = await uploadScreenshot(screenshotFile, user.id)
      if (uploadErr) {
        setError('Screenshot upload failed: ' + uploadErr.message)
        setLoading(false)
        return
      }
      screenshotUrl = url
    }

    const payload = {
      user_id: user.id,
      broker_id: form.broker_id || null,
      strategy_id: form.strategy_id || null,
      symbol: form.symbol.toUpperCase().trim(),
      direction: form.direction,
      trade_type: form.trade_type,
      status: form.status,
      quantity: parseInt(form.quantity),
      entry_price: parseFloat(form.entry_price),
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      planned_sl: form.planned_sl ? parseFloat(form.planned_sl) : null,
      planned_tp: form.planned_tp ? parseFloat(form.planned_tp) : null,
      notes: form.notes || null,
      setup_quality: form.setup_quality ? parseInt(form.setup_quality) : null,
      emotion_tag: form.emotion_tag || null,
      exit_reason: form.exit_reason || null,
      entry_date: form.entry_date,
      exit_date: form.exit_date || null,
      screenshot_url: screenshotUrl,
      ...chargesData,
    }

    let dbError
    if (isEdit) {
      // Update existing trade
      const { error } = await supabase
        .from('trades')
        .update(payload)
        .eq('id', editTrade.id)
      dbError = error
    } else {
      // Insert new trade
      const { error } = await supabase.from('trades').insert(payload)
      dbError = error

      // Update broker capital only on new closed trades
      if (!error && chargesData.net_pnl !== undefined) {
        await supabase.from('brokers')
          .update({ current_capital: broker.current_capital + chargesData.net_pnl })
          .eq('id', broker.id)
      }
    }

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    navigate('/journal')
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px', boxSizing: 'border-box', width: '100%' }}>

      <div style={{ marginBottom: 28 }}>
        <button onClick={() => navigate(-1)} style={{
          color: 'var(--text-muted)', fontSize: 12,
          background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12,
        }}>← Back</button>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {isEdit ? `Edit Trade — ${editTrade.symbol}` : 'New Trade'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          {isEdit ? 'Update your trade details.' : 'Log your trade. Be honest with yourself.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Trade Setup */}
        <div className="card">
          <div className="section-title">Trade Setup</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Row>
              <Field label="Broker">
                <select className="input" value={form.broker_id}
                  onChange={e => upd('broker_id', e.target.value)}>
                  <option value="">Select broker</option>
                  {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label="Strategy">
                <select className="input" value={form.strategy_id}
                  onChange={e => upd('strategy_id', e.target.value)}>
                  <option value="">Select strategy</option>
                  {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </Row>

            <Field label="Symbol">
              <input className="input mono" value={form.symbol}
                onChange={e => upd('symbol', e.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE, NIFTY" />
            </Field>

            <Row>
              <Field label="Direction">
                <div className="segment">
                  <button className={`segment-btn ${form.direction === 'LONG' ? 'active-long' : ''}`}
                    onClick={() => upd('direction', 'LONG')}>▲ LONG</button>
                  <button className={`segment-btn ${form.direction === 'SHORT' ? 'active-short' : ''}`}
                    onClick={() => upd('direction', 'SHORT')}>▼ SHORT</button>
                </div>
              </Field>
              <Field label="Type">
                <div className="segment">
                  <button className={`segment-btn ${form.trade_type === 'INTRADAY' ? 'active-neutral' : ''}`}
                    onClick={() => upd('trade_type', 'INTRADAY')}>INTRADAY</button>
                  <button className={`segment-btn ${form.trade_type === 'SWING' ? 'active-neutral' : ''}`}
                    onClick={() => upd('trade_type', 'SWING')}>SWING</button>
                </div>
              </Field>
            </Row>

            <Field label="Status">
              <div className="segment">
                {['OPEN', 'CLOSED', 'PARTIAL'].map(s => (
                  <button key={s}
                    className={`segment-btn ${form.status === s ? 'active-neutral' : ''}`}
                    onClick={() => upd('status', s)}>{s}</button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        {/* Prices */}
        <div className="card">
          <div className="section-title">Prices & Quantity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Row cols={3}>
              <Field label="Quantity">
                <input type="number" className="input mono" value={form.quantity}
                  onChange={e => upd('quantity', e.target.value)} placeholder="100" />
              </Field>
              <Field label="Entry Price ₹">
                <input type="number" className="input mono" value={form.entry_price}
                  onChange={e => upd('entry_price', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Exit Price ₹">
                <input type="number" className="input mono" value={form.exit_price}
                  onChange={e => upd('exit_price', e.target.value)} placeholder="0.00" />
              </Field>
            </Row>
            <Row>
              <Field label="Planned SL ₹">
                <input type="number" className="input mono" value={form.planned_sl}
                  onChange={e => upd('planned_sl', e.target.value)} placeholder="Stop loss price" />
              </Field>
              <Field label="Planned Target ₹">
                <input type="number" className="input mono" value={form.planned_tp}
                  onChange={e => upd('planned_tp', e.target.value)} placeholder="Target price" />
              </Field>
            </Row>
            <Row>
              <Field label="Entry Date & Time">
                <input type="datetime-local" className="input" value={form.entry_date}
                  onChange={e => upd('entry_date', e.target.value)} />
              </Field>
              <Field label="Exit Date & Time">
                <input type="datetime-local" className="input" value={form.exit_date}
                  onChange={e => upd('exit_date', e.target.value)} />
              </Field>
            </Row>
          </div>
        </div>

        {/* Live P&L */}
        <PnlPreview form={form} brokers={brokers} />

        {/* Screenshot */}
        <div className="card">
          <div className="section-title">Chart Screenshot</div>

          {/* Show existing screenshot */}
          {existingScreenshot && !screenshotPreview && (
            <div style={{ marginBottom: 12 }}>
              <img src={existingScreenshot} alt="Trade chart"
                style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
              <button onClick={() => setExistingScreenshot(null)}
                className="btn-ghost"
                style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)40' }}>
                Remove screenshot
              </button>
            </div>
          )}

          {/* New screenshot preview */}
          {screenshotPreview && (
            <div style={{ marginBottom: 12 }}>
              <img src={screenshotPreview} alt="Preview"
                style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
              <button onClick={() => { setScreenshotFile(null); setScreenshotPreview(null) }}
                className="btn-ghost"
                style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)40' }}>
                Remove
              </button>
            </div>
          )}

          {!screenshotPreview && !existingScreenshot && (
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              border: '2px dashed var(--border)', borderRadius: 10,
              padding: '32px 20px', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: 28 }}>📸</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Click to upload chart screenshot
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG, JPG up to 5MB</span>
              <input type="file" accept="image/*" onChange={handleScreenshotChange}
                style={{ display: 'none' }} />
            </label>
          )}
        </div>

        {/* Reflection */}
        <div className="card">
          <div className="section-title">Reflection</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Row>
              <Field label="Exit Reason">
                <select className="input" value={form.exit_reason}
                  onChange={e => upd('exit_reason', e.target.value)}>
                  <option value="">Select reason</option>
                  <option value="TARGET_HIT">Target Hit</option>
                  <option value="SL_HIT">SL Hit</option>
                  <option value="MANUAL">Manual Exit</option>
                  <option value="TRAILING_SL">Trailing SL</option>
                  <option value="EOD">End of Day</option>
                </select>
              </Field>
              <Field label="Emotion">
                <select className="input" value={form.emotion_tag}
                  onChange={e => upd('emotion_tag', e.target.value)}>
                  <option value="">How did you feel?</option>
                  <option value="CONFIDENT">Confident</option>
                  <option value="HESITANT">Hesitant</option>
                  <option value="FOMO">FOMO</option>
                  <option value="REVENGE">Revenge Trade</option>
                  <option value="NEUTRAL">Neutral</option>
                </select>
              </Field>
            </Row>

            <Field label={`Setup Quality — ${form.setup_quality ? `${form.setup_quality}/5` : 'Not rated'}`}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => upd('setup_quality', n)} style={{
                    width: 36, height: 36, borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: form.setup_quality >= n ? 'var(--accent-dim)' : 'var(--bg-base)',
                    color: form.setup_quality >= n ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 14, cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s',
                  }}>{n}</button>
                ))}
              </div>
            </Field>

            <Field label="Notes / Mistakes">
              <textarea className="input" value={form.notes}
                onChange={e => upd('notes', e.target.value)}
                placeholder="What did you do right? What went wrong? What would you do differently?"
                rows={4} style={{ resize: 'vertical' }} />
            </Field>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-dim)', border: '1px solid var(--red)40',
            color: 'var(--red)', borderRadius: 8, padding: '12px 16px', fontSize: 13,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ flex: 1, padding: '14px' }}>
            {loading ? 'Saving...' : isEdit ? 'Update Trade' : 'Save Trade'}
          </button>
          <button className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        </div>

      </div>
    </div>
  )
}