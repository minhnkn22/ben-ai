'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type NavItem = {
  icon: string
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: '💬', label: 'Intake', href: '/intake' },
  { icon: '🔍', label: 'My Reveal', href: '/reveal' },
  { icon: '📊', label: 'Assessments', href: '/assessment' },
]

type SidebarProps = {
  user: { email: string; is_admin: boolean }
  latestRevealId?: string
}

export default function Sidebar({ user, latestRevealId }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/reveal') {
      return pathname.startsWith('/reveal')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItemStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px',
    fontSize: '13px',
    color: disabled ? 'var(--text-muted)' : active ? 'var(--text)' : 'var(--text-muted)',
    fontWeight: active ? 500 : 400,
    textDecoration: 'none',
    borderRadius: '0',
    cursor: disabled ? 'default' : 'pointer',
    background: active ? 'var(--bg-hover)' : 'transparent',
    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'background 0.1s',
    opacity: disabled ? 0.5 : 1,
  })

  const sidebarContent = (
    <div style={{
      width: '240px',
      height: '100%',
      background: 'var(--bg-subtle)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font)',
      flexShrink: 0,
    }}>
      {/* Top: wordmark + tagline */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text)' }}>Ben</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Career pattern analysis</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {NAV_ITEMS.map(item => {
          if (item.href === '/reveal') {
            const active = isActive('/reveal')
            if (latestRevealId) {
              return (
                <a
                  key={item.href}
                  href={`/reveal/${latestRevealId}`}
                  style={navItemStyle(active)}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              )
            } else {
              return (
                <span
                  key={item.href}
                  title="Complete your intake first"
                  style={navItemStyle(false, true)}
                >
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              )
            }
          }

          const active = isActive(item.href)
          return (
            <a
              key={item.href}
              href={item.href}
              style={navItemStyle(active)}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          )
        })}

        {/* Admin section */}
        {user.is_admin && (
          <>
            <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
            <a
              href="/admin"
              style={navItemStyle(pathname.startsWith('/admin'))}
              onMouseEnter={e => {
                if (!pathname.startsWith('/admin')) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                if (!pathname.startsWith('/admin')) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: '14px' }}>⚙️</span>
              <span>Admin</span>
            </a>
          </>
        )}
      </nav>

      {/* Bottom: user + sign out */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
      }}>
        <div style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: '8px',
        }}>
          {user.email}
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '12px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            textDecoration: 'underline',
            textDecorationColor: 'transparent',
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'var(--text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
        >
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div style={{ display: 'none' }} className="sidebar-desktop">
        {sidebarContent}
      </div>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sidebar-hamburger"
        style={{
          display: 'none',
          position: 'fixed',
          top: '12px',
          left: '12px',
          zIndex: 100,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          width: '36px',
          height: '36px',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        aria-label="Open menu"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Mobile: overlay + sidebar */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex',
          }}
          className="sidebar-mobile-overlay"
        >
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.3)',
            }}
            onClick={() => setMobileOpen(false)}
          />
          <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
            {sidebarContent}
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .sidebar-desktop { display: flex !important; }
          .sidebar-hamburger { display: none !important; }
        }
        @media (max-width: 767px) {
          .sidebar-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
