import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/journal', label: 'Journal' },
  { to: '/playbook', label: 'Playbook' },
  { to: '/insights', label: 'Insights', desktopOnly: true },
  { to: '/settings', label: 'Settings' },
]

export default function Layout({ children }) {
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Desktop Sidebar — hidden on mobile */}
      <aside style={{
        width: 200,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 0',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 40,
      }} className="hidden md:flex">

        {/* Logo */}
        <div style={{ padding: '0 24px 36px' }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: 'var(--accent)',
            letterSpacing: '0.2em',
            marginBottom: 4,
            textTransform: 'uppercase',
          }}>Trade</div>
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
          }}>Journal</div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              })}
            >
              {/* Consistent dot indicator */}
              <span style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: 'currentColor',
                opacity: 0.6,
                flexShrink: 0,
              }} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '0 12px' }}>
          <button onClick={signOut} className="btn-ghost"
            style={{ width: '100%', textAlign: 'left', fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, paddingBottom: 72 }} className="md:ml-[200px] md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar — hidden on desktop */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        zIndex: 50,
        height: 60,
        display: 'flex',
      }} className="md:!hidden">
        {NAV.filter(n => !n.desktopOnly).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color 0.15s',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
            })}
          >
            {/* Consistent dot */}
            <span style={{
              width: 5, height: 5,
              borderRadius: '50%',
              background: 'currentColor',
            }} />
            {item.label.toUpperCase()}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}