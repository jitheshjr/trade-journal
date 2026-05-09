import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/journal', label: 'Journal', icon: '≡' },
  { to: '/playbook', label: 'Playbook', icon: '📓' },
  { to: '/insights', label: 'Insights', icon: '◈', desktopOnly: true },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Layout({ children }) {
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Desktop Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 0',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
      }} className="hidden md:flex">
        {/* Logo */}
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--accent)',
            letterSpacing: '0.15em',
            marginBottom: 4,
          }}>TRADE</div>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>Journal</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.02em',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '0 12px' }}>
          <button onClick={signOut} className="btn-ghost" style={{ width: '100%', textAlign: 'left' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 0, paddingBottom: 80 }}
        className="md:ml-[220px]">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        padding: '8px 0 12px',
        zIndex: 50,
      }} className="md:hidden">
        {NAV.filter(n => !n.desktopOnly).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 18,
              transition: 'color 0.15s',
            })}
          >
            <span>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>
              {item.label.toUpperCase()}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}