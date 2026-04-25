@AGENTS.md

# Ben AI — Project Context

Ben is a career counselor AI that produces a Pattern Reveal: a specific, resonant diagnosis of why the user's past jobs haven't clicked. Phase 1 MVP tests the wedge on 11 Marks.

## Supabase
- Project: `ben-dev` (ref: `jvogcdhcaknhkdusrpca`) — separate from Moon
- Dashboard: https://supabase.com/dashboard/project/jvogcdhcaknhkdusrpca
- Email confirmation: disabled (autoconfirm on)
- Redirect URLs: `https://ben-ai-opal.vercel.app/**`, `http://localhost:3000/**`

## Stack
- Next.js 16 App Router + TypeScript + Tailwind
- Supabase (@supabase/ssr) for auth + database
- Vercel AI SDK + Anthropic SDK (claude-sonnet-4-5 end-to-end)
- mammoth.js for DOCX parse

## Key files
- `app/intake/page.tsx` — intake chat (6-question narrative)
- `app/reveal/[id]/page.tsx` + `RevealClient.tsx` — Pattern Reveal page
- `app/api/chat/route.ts` — intake + post-reveal chat API
- `app/api/cv-upload/route.ts` — CV parse (PDF via Claude, DOCX via mammoth)
- `app/api/reveal/route.ts` — 3-pass synthesis pipeline
- `database/schema.sql` — full DB schema (run in Supabase SQL Editor)
- `lib/supabase/` — server/client/middleware (ported from Moon)
- `../dogfood/prompts/` — synthesis prompts (01-intake-system, 02-draft, 03-critique, 04-revise)

## Node
Always use `/opt/homebrew/opt/node@22/bin/node`

## Environment
Project root: `/Users/nmmacmini/projects/Atum Platform/ben/ben-ai/`

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Production URL: https://ben-ai-opal.vercel.app
- Deploy workflow: auto-deploy on push to main (GitHub integration)
- Deploy status command: HTTP health check
- Merge method: squash
- Project type: web app
- Post-deploy health check: https://ben-ai-opal.vercel.app

### Custom deploy hooks
- Pre-merge: npm run build
- Deploy trigger: automatic on push to main
- Deploy status: poll https://ben-ai-opal.vercel.app
- Health check: https://ben-ai-opal.vercel.app

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool.

Key routing rules:
- Bugs, errors, "why is this broken" → invoke /investigate
- Test the site → invoke /qa-only
- Code review → invoke /review
- Ship, deploy, create a PR → invoke /ship
- Merge + deploy + verify → invoke /land-and-deploy
- "Review everything" → invoke /autoplan
- Architecture decisions → invoke /plan-eng-review
- Save progress → invoke /context-save
