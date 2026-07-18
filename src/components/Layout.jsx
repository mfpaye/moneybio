import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useT, useLocale } from '../lib/i18n.jsx'

const NAV = [
  { section: 'OVERVIEW' },
  { to: '/',        icon: 'ti-layout-dashboard', key: 'nav_dashboard' },
  { to: '/voice',   icon: 'ti-microphone',        key: 'nav_voice' },
  { section: 'MONEY' },
  { to: '/expenses',icon: 'ti-receipt',            key: 'nav_expenses' },
  { to: '/income',  icon: 'ti-cash',               key: 'nav_income' },
  { to: '/loans',   icon: 'ti-handshake',          key: 'nav_loans' },
  { to: '/medical', icon: 'ti-heart-rate-monitor', key: 'nav_medical' },
  { section: 'SHOPPING' },
  { to: '/scan',    icon: 'ti-camera',             key: 'nav_scan' },
  { to: '/list',    icon: 'ti-list-check',         key: 'nav_list' },
  { to: '/compare', icon: 'ti-arrows-diff',        key: 'nav_compare' },
  { section: 'INSIGHTS' },
  { to: '/analytics',icon: 'ti-chart-bar',         key: 'nav_analytics' },
  { to: '/sharing', icon: 'ti-share',              key: 'nav_sharing' },
  { to: '/spaces',  icon: 'ti-users-group',        key: 'nav_spaces' },
  { to: '/settings',icon: 'ti-settings',           key: 'nav_settings' },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { locale, setLocale } = useLocale()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    function handleClick(e) {
      if (sidebarOpen && isMobile) {
        const sidebar = document.getElementById('mb-sidebar')
        const toggle = document.getElementById('mb-toggle')
        if (sidebar && !sidebar.contains(e.target) && toggle && !toggle.contains(e.target)) {
          setSidebarOpen(false)
        }
      setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sidebarOpen, isMobile])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'EP'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F4F0', position: 'relative' }}>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      )}

      {/* ── Sidebar ── */}
      <aside id="mb-sidebar" style={{
        width: 220,
        background: '#fff',
        borderRight: '1px solid #E8E6E0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        // Mobile: slide in/out
        position: window.innerWidth < 768 ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 50,
        transform: window.innerWidth < 768 ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'transform 0.25s ease',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #E8E6E0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <NavLink to="/" style={{ background: '#FFD93D', padding: '5px 12px', borderRadius: 8, fontSize: 16, fontWeight: 700, color: '#7A5C00', textDecoration: 'none' }}>💛 MoneyBio</NavLink>
            {window.innerWidth < 768 && (
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9C9A94' }}>×</button>
            )}
          </div>
          <div style={{ fontSize: 10, color: '#9C9A94', marginTop: 2, paddingLeft: 2 }}>Your money, alive.</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV.map((item, i) => {
            if (item.section) return (
              <div key={i} style={{ padding: '10px 16px 4px', fontSize: 9, fontWeight: 700, color: '#9C9A94', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.section}</div>
            )
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? '#7A5C00' : '#5C5A54',
                background: isActive ? '#FFF8DC' : 'transparent',
                borderLeft: `3px solid ${isActive ? '#E6BE00' : 'transparent'}`,
                transition: 'all 0.12s',
              })}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                <span>{t(item.key)}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Language + Sign out */}
        <div style={{ borderTop: '1px solid #E8E6E0', padding: 12 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {['en','fr','es'].map(lang => (
              <button key={lang} onClick={() => setLocale(lang)} style={{ flex:1, padding: '4px 2px', borderRadius: 6, border: '1px solid', borderColor: locale===lang ? '#E6BE00' : '#E8E6E0', background: locale===lang ? '#FFF8DC' : '#fff', color: locale===lang ? '#7A5C00' : '#9C9A94', fontSize: 10, fontWeight: locale===lang ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                {lang === 'en' ? '🇬🇧' : lang === 'fr' ? '🇫🇷' : '🇪🇸'} {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={handleSignOut} style={{ width: '100%', padding: '7px', background: '#F5F4F0', border: 'none', borderRadius: 8, fontSize: 12, color: '#5C5A54', cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: window.innerWidth < 768 ? 0 : 0 }}>

        {/* Top bar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E8E6E0', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger — always visible */}
            <button id="mb-toggle" onClick={() => setSidebarOpen(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#5C5A54', display: 'flex', alignItems: 'center', padding: 4 }}>
              ☰
            </button>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>
              {t('app_name')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Language toggle in top bar */}
            <div style={{ display:'flex', gap:3 }}>
              {['en','fr','es'].map(lang => (
                <button key={lang} onClick={() => setLocale(lang)} style={{ padding:'4px 7px', borderRadius:6, border:'1px solid', borderColor: locale===lang?'#E6BE00':'#E8E6E0', background: locale===lang?'#FFF8DC':'#fff', color: locale===lang?'#7A5C00':'#9C9A94', fontSize:10, fontWeight: locale===lang?700:400, cursor:'pointer', fontFamily:'inherit' }}>
                  {lang === 'en' ? '🇬🇧' : lang === 'fr' ? '🇫🇷' : '🇪🇸'}
                </button>
              ))}
            </div>
            {/* Quick scan button — mobile only */}
            <NavLink to="/scan" style={{ display: window.innerWidth < 768 ? 'flex' : 'none', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#FFD93D', color: '#7A5C00', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
              <i className="ti ti-camera" style={{ fontSize: 14 }} /> {t('nav_scan')}
            </NavLink>
            {/* Avatar — click to sign out */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setAvatarOpen(p => !p)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFD93D', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#7A5C00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {initials}
              </button>
              {avatarOpen && (
                <div style={{ position: 'absolute', right: 0, top: 38, background: '#fff', border: '1px solid #E8E6E0', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 160, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #F0EEE8' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{profile?.full_name || 'My Account'}</div>
                    <div style={{ fontSize: 11, color: '#9C9A94' }}>{profile?.email || ''}</div>
                  </div>
                  <NavLink to="/settings" onClick={() => setAvatarOpen(false)} style={{ display: 'block', padding: '10px 14px', fontSize: 13, color: '#1A1A18', textDecoration: 'none', borderBottom: '1px solid #F0EEE8' }}>⚙️ Settings</NavLink>
                  <button onClick={handleSignOut} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8B0000', textAlign: 'left', fontFamily: 'inherit' }}>🚪 Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 14, overflowY: 'auto', maxWidth: 900, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
