import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>
}) {
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { user: selectedUserId } = await searchParams

  // Fetch all profiles
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, email, last_active')
    .order('last_active', { ascending: false, nullsFirst: false })

  // For each profile, get latest reveal status + reaction verdict
  const profilesWithMeta = await Promise.all(
    (profiles ?? []).map(async (p: { id: string; email: string; last_active: string }) => {
      const { data: reveals } = await adminClient
        .from('pattern_reveals')
        .select('id, status')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: reactions } = await adminClient
        .from('pattern_reveal_reactions')
        .select('verdict')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(1)

      return {
        ...p,
        latestReveal: reveals?.[0] ?? null,
        latestReaction: reactions?.[0] ?? null,
      }
    })
  )

  // Fetch selected user detail
  let selectedUser = null
  if (selectedUserId) {
    const [
      { data: profile },
      { data: intakes },
      { data: reveal },
      { data: assessment },
      { data: reactions },
      { data: feedback },
    ] = await Promise.all([
      adminClient.from('profiles').select('id, email, last_active').eq('id', selectedUserId).single(),
      adminClient.from('intakes').select('role, content, created_at').eq('user_id', selectedUserId).eq('stage', 'intake').order('created_at', { ascending: true }),
      adminClient.from('pattern_reveals').select('*').eq('user_id', selectedUserId).order('created_at', { ascending: false }).limit(1).single(),
      adminClient.from('assessments').select('mbti, enneagram, ocean_openness, ocean_conscientiousness, ocean_extraversion, ocean_agreeableness, ocean_neuroticism').eq('user_id', selectedUserId).order('created_at', { ascending: false }).limit(1).single(),
      adminClient.from('pattern_reveal_reactions').select('verdict, note, created_at').eq('user_id', selectedUserId).order('created_at', { ascending: false }),
      adminClient.from('feedback').select('message, page_url, created_at').eq('user_id', selectedUserId).order('created_at', { ascending: false }),
    ])

    selectedUser = {
      profile,
      intakes: intakes ?? [],
      reveal,
      assessment,
      reactions: reactions ?? [],
      feedback: feedback ?? [],
    }
  }

  return (
    <AdminDashboard
      profiles={profilesWithMeta}
      selectedUserId={selectedUserId ?? null}
      selectedUser={selectedUser}
    />
  )
}
