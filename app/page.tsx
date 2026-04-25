import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/intake')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: '60px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}>Ben</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/login" style={{
            padding: '7px 14px', fontSize: '13px', color: 'var(--text-muted)',
            textDecoration: 'none', borderRadius: '6px',
          }}>
            Sign in
          </Link>
          <Link href="/login?mode=signup" style={{
            padding: '7px 14px', fontSize: '13px', fontWeight: 500,
            background: 'var(--accent)', color: '#fff',
            textDecoration: 'none', borderRadius: '6px',
          }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <main style={{
        maxWidth: '640px', margin: '0 auto',
        padding: '96px 24px 80px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '12px', fontWeight: 500, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
          marginBottom: '20px',
        }}>
          Career counseling, not career advice
        </p>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 52px)',
          fontWeight: 600, letterSpacing: '-0.03em',
          lineHeight: 1.1, marginBottom: '20px',
        }}>
          What&apos;s the pattern<br />across your career?
        </h1>

        <p style={{
          fontSize: '17px', lineHeight: 1.65,
          color: 'var(--text-muted)', maxWidth: '480px',
          margin: '0 auto 40px',
        }}>
          Ben asks the right questions, listens to your actual stories, and gives
          you an honest diagnosis of the friction pattern you keep running into.
          Not generic advice — a specific read on you.
        </p>

        <Link href="/login?mode=signup" style={{
          display: 'inline-block',
          padding: '13px 28px', fontSize: '15px', fontWeight: 500,
          background: 'var(--accent)', color: '#fff',
          textDecoration: 'none', borderRadius: '8px',
          letterSpacing: '-0.01em',
        }}>
          Start the conversation
        </Link>

        <p style={{ marginTop: '14px', fontSize: '13px', color: 'var(--text-placeholder)' }}>
          Takes 15–20 min. Bring your career baggage.
        </p>
      </main>

      {/* ── EXAMPLE REVEAL ── */}
      <section style={{
        borderTop: '1px solid var(--border)',
        padding: '80px 24px',
        background: 'var(--bg-subtle)',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            marginBottom: '24px',
          }}>
            Example pattern reveal
          </p>

          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '32px',
          }}>
            <p style={{ fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '28px' }}>
              You keep leaving roles right when the ambiguity resolves. The first six months — when
              you&apos;re building the thing, figuring it out, making calls with no playbook — you&apos;re
              extraordinary. The moment it becomes a job with a process, you start finding reasons it
              isn&apos;t working. You call it a culture problem. It&apos;s actually a stimulus problem.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <p style={{
                  fontSize: '10px', fontWeight: 600, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px',
                }}>The trap</p>
                <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--text-muted)' }}>
                  You join stable companies and try to make them feel like startups. It never works, and you blame the company.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <p style={{
                  fontSize: '10px', fontWeight: 600, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px',
                }}>The flip</p>
                <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--text-muted)' }}>
                  You belong in the zero-to-one phase. Early-stage roles, founding team, or building new functions inside larger orgs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ borderTop: '1px solid var(--border)', padding: '80px 24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em',
            marginBottom: '48px', textAlign: 'center',
          }}>
            How it works
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
            {[
              {
                num: '01',
                title: 'Ben asks you six questions',
                body: 'What you hated about your last three jobs. When you were most energized. What you secretly think you could be great at. Real questions — not a personality quiz.',
              },
              {
                num: '02',
                title: 'You upload your CV',
                body: 'Ben cross-references what you said with your actual career history. The gaps between what you said and what you did are often where the real pattern lives.',
              },
              {
                num: '03',
                title: 'You get your Pattern Reveal',
                body: 'A short, direct diagnosis of the friction pattern you keep running into — plus the conditions where you thrive. Not a framework. An honest read.',
              },
            ].map(step => (
              <div key={step.num} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                  letterSpacing: '0.05em', minWidth: '24px', paddingTop: '3px',
                }}>
                  {step.num}
                </span>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', letterSpacing: '-0.01em' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-muted)' }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        borderTop: '1px solid var(--border)',
        padding: '80px 24px', textAlign: 'center',
        background: 'var(--bg-subtle)',
      }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em',
            marginBottom: '12px',
          }}>
            Ready to see your pattern?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
            Bring the career baggage. Ben doesn&apos;t flatter.
          </p>
          <Link href="/login?mode=signup" style={{
            display: 'inline-block',
            padding: '13px 28px', fontSize: '15px', fontWeight: 500,
            background: 'var(--accent)', color: '#fff',
            textDecoration: 'none', borderRadius: '8px',
          }}>
            Start the conversation
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '20px 24px', textAlign: 'center',
        fontSize: '12px', color: 'var(--text-placeholder)',
      }}>
        Ben — a product of{' '}
        <a href="https://www.atumplatform.com" target="_blank" rel="noopener"
          style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Atum Platform
        </a>
      </footer>
    </div>
  )
}
