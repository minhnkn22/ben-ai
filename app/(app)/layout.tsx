import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', user.id)
    .single()

  const { data: reveal } = await supabase
    .from('pattern_reveals')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <AppShell
      user={{
        email: profile?.email || user.email || '',
        is_admin: profile?.is_admin || false,
      }}
      latestRevealId={reveal?.id}
    >
      {children}
    </AppShell>
  )
}
