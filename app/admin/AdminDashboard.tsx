'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function timeAgo(date: string | null): string {
  if (!date) return 'never'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const VERDICT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  resonated: { bg: '#dcfce7', color: '#15803d', label: 'resonated' },
  somewhat: { bg: '#fef9c3', color: '#a16207', label: 'somewhat' },
  generic: { bg: '#fee2e2', color: '#b91c1c', label: 'generic' },
}

type Profile = {
  id: string
  email: string | null
  last_active: string | null
  latestReveal: { id: string; status: string } | null
  latestReaction: { verdict: string } | null
}

type SelectedUser = {
  profile: { id: string; email: string | null; last_active: string | null } | null
  intakes: Array<{ role: string; content: string; created_at: string }>
  reveal: Record<string, unknown> | null
  assessment: Record<string, unknown> | null
  reactions: Array<{ verdict: string; note: string | null; created_at: string }>
  feedback: Array<{ message: string; page_url: string | null; created_at: string }>
} | null

export default function AdminDashboard({
  profiles,
  selectedUserId,
  selectedUser,
}: {
  profiles: Profile[]
  selectedUserId: string | null
  selectedUser: SelectedUser
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'transcript' | 'reveal' | 'assessment' | 'reactions' | 'feedback'>('transcript')

  function selectUser(id: string) {
    router.push(`/admin?user=${id}`)
    setActiveTab('transcript')
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', background: 'var(--bg)',
      fontFamily: 'var(--font)', overflow: 'hidden',
    }}>
      {/* Left panel */}
      <div style={{
        width: '320px', flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h1 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Admin — {profiles.length} users
          </h1>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {profiles.map(p => {
            const verdict = p.latestReaction?.verdict
            const vc = verdict ? VERDICT_COLORS[verdict] : null
            const isSelected = p.id === selectedUserId
            return (
              <div
                key={p.id}
                onClick={() => selectUser(p.id)}
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-hover)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-subtle)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 500, color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: vc ? '160px' : '220px',
                  }}>
                    {p.email ?? '(no email)'}
                  </span>
                  {vc && (
                    <span style={{
                      fontSize: '10px', fontWeight: 500,
                      background: vc.bg, color: vc.color,
                      padding: '2px 6px', borderRadius: '4px',
                      flexShrink: 0,
                    }}>
                      {vc.label}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {timeAgo(p.last_active)}
                  {p.latestReveal && (
                    <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                      · {p.latestReveal.status}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedUser ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Select a user to view details</p>
          </div>
        ) : (
          <>
            {/* User header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>
                {selectedUser.profile?.email ?? '(no email)'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Last active: {timeAgo(selectedUser.profile?.last_active ?? null)}
              </p>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: '0',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
              padding: '0 24px',
            }}>
              {(['transcript', 'reveal', 'assessment', 'reactions', 'feedback'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 14px',
                    fontSize: '12px', fontWeight: 500,
                    background: 'none', border: 'none',
                    cursor: 'pointer',
                    color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
                    borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                    textTransform: 'capitalize',
                    fontFamily: 'var(--font)',
                    marginBottom: '-1px',
                    transition: 'color 0.1s',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {activeTab === 'transcript' && (
                <TranscriptTab intakes={selectedUser.intakes} />
              )}
              {activeTab === 'reveal' && (
                <RevealTab reveal={selectedUser.reveal} />
              )}
              {activeTab === 'assessment' && (
                <AssessmentTab assessment={selectedUser.assessment} />
              )}
              {activeTab === 'reactions' && (
                <ReactionsTab reactions={selectedUser.reactions} />
              )}
              {activeTab === 'feedback' && (
                <FeedbackTab feedback={selectedUser.feedback} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TranscriptTab({ intakes }: { intakes: Array<{ role: string; content: string; created_at: string }> }) {
  if (intakes.length === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No intake messages.</p>
  }
  return (
    <div style={{ maxWidth: '680px' }}>
      {intakes.map((msg, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '16px',
          }}
        >
          {msg.role !== 'user' ? (
            <div style={{ maxWidth: '88%' }}>
              <p style={{
                fontSize: '14px', lineHeight: 1.7, color: 'var(--text)',
                whiteSpace: 'pre-wrap', margin: 0,
              }}>
                {msg.content}
              </p>
            </div>
          ) : (
            <div style={{
              maxWidth: '72%',
              background: 'var(--user-bubble)',
              borderRadius: '18px',
              padding: '10px 16px',
            }}>
              <p style={{
                fontSize: '14px', lineHeight: 1.65, color: 'var(--text)',
                whiteSpace: 'pre-wrap', margin: 0,
              }}>
                {msg.content}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RevealTab({ reveal }: { reveal: Record<string, unknown> | null }) {
  if (!reveal) return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No reveal generated yet.</p>

  const evidence = reveal.evidence_json as Array<{ claim: string; quote: string }> | null

  return (
    <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Field label="Status" value={String(reveal.status ?? '')} />
      <Field label="Model" value={String(reveal.model_used ?? '')} />
      <Field label="Completed" value={reveal.completed_at ? new Date(reveal.completed_at as string).toLocaleString() : '—'} />
      <Field label="Final pass" value={String(reveal.final_pass ?? '—')} />

      {!!reveal.pattern_paragraph && (
        <div>
          <Label>Pattern paragraph</Label>
          <p style={{ fontSize: '14px', lineHeight: 1.75, color: 'var(--text)', margin: 0 }}>
            {String(reveal.pattern_paragraph)}
          </p>
        </div>
      )}

      {!!reveal.one_question && (
        <div>
          <Label>One question</Label>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text)', margin: 0, fontStyle: 'italic' }}>
            {String(reveal.one_question)}
          </p>
        </div>
      )}

      {evidence && evidence.length > 0 && (
        <div>
          <Label>Evidence</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {evidence.map((e, i) => (
              <blockquote key={i} style={{
                margin: 0,
                padding: '12px 16px',
                borderLeft: '3px solid var(--border-focus)',
                background: 'var(--bg-subtle)',
                borderRadius: '0 6px 6px 0',
              }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 500 }}>{e.claim}</p>
                <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, fontStyle: 'italic' }}>&ldquo;{e.quote}&rdquo;</p>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      <Collapsible label="Draft JSON" data={reveal.draft_json} />
      <Collapsible label="Critique JSON" data={reveal.critique_json} />
      <Collapsible label="Revise JSON" data={reveal.revise_json} />
    </div>
  )
}

function AssessmentTab({ assessment }: { assessment: Record<string, unknown> | null }) {
  if (!assessment) return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No assessment data.</p>

  const OCEAN_LABELS: Record<string, string> = {
    ocean_openness: 'Openness',
    ocean_conscientiousness: 'Conscientiousness',
    ocean_extraversion: 'Extraversion',
    ocean_agreeableness: 'Agreeableness',
    ocean_neuroticism: 'Neuroticism',
  }

  return (
    <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Field label="MBTI" value={String(assessment.mbti ?? '—')} />
      <Field label="Enneagram" value={assessment.enneagram != null ? String(assessment.enneagram) : '—'} />
      <div>
        <Label>Big Five (OCEAN)</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.keys(OCEAN_LABELS).map(key => {
            const val = assessment[key] as number | null
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '140px' }}>
                  {OCEAN_LABELS[key]}
                </span>
                {val != null ? (
                  <>
                    <div style={{
                      flex: 1, height: '6px', background: 'var(--bg-hover)',
                      borderRadius: '3px', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${(val / 10) * 100}%`, height: '100%',
                        background: 'var(--accent)', borderRadius: '3px',
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500, minWidth: '32px' }}>
                      {val}/10
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-placeholder)' }}>not set</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ReactionsTab({ reactions }: { reactions: Array<{ verdict: string; note: string | null; created_at: string }> }) {
  if (reactions.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No reactions yet.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
      {reactions.map((r, i) => {
        const vc = VERDICT_COLORS[r.verdict]
        return (
          <div key={i} style={{
            padding: '14px 16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--bg-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: r.note ? '8px' : 0 }}>
              {vc && (
                <span style={{
                  fontSize: '11px', fontWeight: 500,
                  background: vc.bg, color: vc.color,
                  padding: '2px 8px', borderRadius: '4px',
                }}>
                  {vc.label}
                </span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            {r.note && (
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, lineHeight: 1.6 }}>{r.note}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FeedbackTab({ feedback }: { feedback: Array<{ message: string; page_url: string | null; created_at: string }> }) {
  if (feedback.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No feedback yet.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
      {feedback.map((f, i) => (
        <div key={i} style={{
          padding: '14px 16px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--bg-subtle)',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.6 }}>{f.message}</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {f.page_url && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.page_url}</span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {new Date(f.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      margin: '0 0 8px',
    }}>
      {children}
    </p>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0 }}>{value || '—'}</p>
    </div>
  )
}

function Collapsible({ label, data }: { label: string; data: unknown }) {
  if (!data) return null
  return (
    <details style={{ borderRadius: '6px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <summary style={{
        padding: '10px 14px',
        fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)',
        cursor: 'pointer',
        background: 'var(--bg-subtle)',
        userSelect: 'none',
      }}>
        {label}
      </summary>
      <pre style={{
        margin: 0,
        padding: '14px',
        fontSize: '11px',
        lineHeight: 1.6,
        color: 'var(--text)',
        background: 'var(--bg)',
        overflowX: 'auto',
        maxHeight: '400px',
        overflowY: 'auto',
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  )
}
