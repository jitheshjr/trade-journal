import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.sentIcon}>✦</div>
          <h2 style={styles.sentTitle}>Check your inbox</h2>
          <p style={styles.sentSub}>
            Magic link sent to <span style={{ color: 'var(--accent)' }}>{email}</span>
          </p>
          <p style={styles.sentHint}>Click the link in the email to sign in. You can close this tab.</p>
          <button onClick={() => setSent(false)} style={styles.backBtn}>
            ← Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>

      {/* Background texture */}
      <div style={styles.bgGrid} />

      <div style={styles.card}>

        {/* Logo mark */}
        <div style={styles.logoWrap}>
          <div style={styles.logoDot} />
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 32 }}>
          <div style={styles.eyebrow}>TRADE JOURNAL</div>
          <h1 style={styles.heading}>Welcome back</h1>
          <p style={styles.sub}>Enter your email to receive a magic sign-in link.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              style={styles.input}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && (
            <div style={styles.error}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Sending...' : 'Send Magic Link →'}
          </button>
        </form>

        {/* Footer note */}
        <p style={styles.footerNote}>
          No password needed. We'll email you a secure link.
        </p>

        {/* Decorative bottom bar */}
        <div style={styles.bottomBar} />
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-base)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    opacity: 0.4,
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '40px 36px 32px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 0 60px rgba(196, 135, 58, 0.06)',
    overflow: 'hidden',
  },
  logoWrap: {
    marginBottom: 28,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--accent)',
    boxShadow: '0 0 20px var(--accent-dim)',
  },
  eyebrow: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: 'var(--accent)',
    letterSpacing: '0.2em',
    marginBottom: 8,
  },
  heading: {
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '11px 14px',
    fontSize: 14,
    color: 'var(--text-primary)',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  error: {
    background: 'var(--red-dim)',
    border: '1px solid rgba(255,77,106,0.3)',
    color: 'var(--red)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
  },
  btn: {
    width: '100%',
    background: 'var(--accent)',
    color: '#0a0a0a',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    padding: '12px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    marginTop: 4,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 3,
    background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
    opacity: 0.6,
  },
  sentIcon: {
    fontSize: 32,
    color: 'var(--accent)',
    marginBottom: 16,
    textAlign: 'center',
  },
  sentTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 8,
    textAlign: 'center',
  },
  sentSub: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginBottom: 8,
  },
  sentHint: {
    fontSize: 12,
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginBottom: 24,
  },
  backBtn: {
    display: 'block',
    margin: '0 auto',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 12,
    cursor: 'pointer',
  },
}