'use client'

import Sidebar from './Sidebar'

type AppShellProps = {
  children: React.ReactNode
  user: { email: string; is_admin: boolean }
  latestRevealId?: string
}

export function AppShell({ children, user, latestRevealId }: AppShellProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar user={user} latestRevealId={latestRevealId} />
      <main style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </main>
    </div>
  )
}
