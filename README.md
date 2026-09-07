# Tube Tiers

A standalone Next.js App Router + Supabase app for ranking the 19 London transport services. This directory has its own dependencies, database migrations, environment, and local ports. It does not use Viewi's database.

## Run locally

```sh
pnpm install
pnpm db:start
# Copy the local Supabase API URL and publishable/anon key into .env.local.
# The values and optional CAPTCHA setting are documented in .env.example.
pnpm dev
```

Open http://localhost:3100. Local Supabase uses port 55321 (API) and 55322 (Postgres), to avoid the parent project's ports.

If unused local services fail health checks, this smaller stack is sufficient:

```sh
pnpm exec supabase start --exclude storage-api,imgproxy,vector,logflare,supavisor,realtime,edge-runtime,inbucket,studio
```

The application stays usable as a draft board without database configuration. It shows an explicit connection notice and disables submission; it never invents community votes or pretends a draft was submitted.

## Pages

- `/`: Community tier board and average scores across **all** submissions, aggregated in Postgres rather than a limited API result set.
- `/rank`: Desktop and touch drag-and-drop, plus keyboard arrow-key tier selection; device-local draft; public name; submission and update.
- `/submissions`: Every submission's name and expandable individual board, in pages of 20. Duplicate names are allowed and are distinguished by submission ID.

## Connect a hosted Supabase project

1. Create a separate Supabase project, then enable anonymous sign-ins under Authentication settings.
2. Run `pnpm exec supabase login`, `pnpm exec supabase link --project-ref YOUR_PROJECT_REF`, then `pnpm exec supabase db push` **from this directory**. The CLI applies the checked-in migration; don't create tables manually in the dashboard.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and your hosting environment. The legacy anon key also works. No service-role key is needed.
4. Deploy this directory as the root of a Next.js project on Vercel. Use `pnpm install --frozen-lockfile` and `pnpm build`. Set your production site URL in Supabase Auth.
5. For public use, enable Turnstile CAPTCHA in Supabase Auth, configure its secret there, and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the app. Register your hosting domain with Turnstile. The app already passes the verification token to anonymous sign-in.

A local Docker database cannot be reached by a hosted app. Use a hosted Supabase project before publishing. No hosted database or deployment is provisioned by this source directory.

## Is just a name safe enough?

For a casual poll among friends, this is a reasonable starting point. The name is a public label, **not proof of identity**. The app silently creates a Supabase anonymous identity on first submission, kept in HTTP-only, same-site cookies (secure in production). There is no signup form, email, or password.

- One current vote per anonymous identity; updates replace rather than add to the average.
- The database takes identity from the verified JWT. Entering someone else's name creates a separate list; it cannot overwrite their vote.
- RLS and column grants allow public reads of names and rankings, but hide session identity IDs. Raw inserts, updates and deletes are denied. A constrained database function performs writes with server-side identity and database validation.
- A database trigger applies a 30-second update cooldown, including concurrent writes. Supabase's anonymous-signup rate limits apply to new identities.
- React renders names as text. Validation rejects HTML, control characters, oversized names, incomplete rankings, unknown services, and invalid tiers.
- Anonymous sign-in is not ballot integrity: clearing cookies, private browsing or another browser allows more votes; names can be impersonated. Use verified accounts for trusted results, prizes, or one-person-one-vote requirements.
- Names and rankings are intentionally public. Use a nickname; don't collect private information. Moderation/reporting is not included. A database administrator can remove abusive submissions.
- Drafts live in browser storage. Clearing cookies does not clear the visible draft, but does lose the identity that owns the previous vote. If browser storage is unavailable the editor warns that the draft lasts only while the page stays open.
- For a public launch, enable CAPTCHA and review abuse controls. Supabase Auth sees the Next.js server as the caller of anonymous sign-in; its IP-based limits may group visitors behind the server. Do not forward an untrusted user-supplied IP header to bypass this limit.

Supabase guidance: https://supabase.com/docs/guides/auth/auth-anonymous

## Scoring

A* = 6, A = 5, B = 4, C = 3, D = 2, E = 1, F = 0. Each complete submission has equal weight. A line appears in the nearest tier to its arithmetic mean; exact half scores go to the lower tier. Hovering over a logo shows its mean to one decimal place. Within a tier, higher averages appear first. Averages are fetched afresh when the page is visited or reloaded, and revalidated after submission; there is no live subscription.

The service list includes the original 18 services plus Metropolitan. Overground remains grouped together. Existing submissions received Metropolitan at C when it was added, as requested; new voters choose its tier. Branding is an unofficial adaptation using small CSS roundels, not copied logo assets.

## Checks

```sh
pnpm test          # Pure validation and tier-boundary tests
pnpm test:db       # Real local Postgres / pgTAP: permissions, identity, cooldown, aggregates
pnpm lint
pnpm typecheck
pnpm build
```

For schema work use `pnpm exec supabase migration new NAME`. After editing a migration that has only been applied locally, replay it with `pnpm db:reset` (this deletes **this project's local** votes), then regenerate types with `pnpm db:types`. Never edit `src/db/types.ts` by hand. Seed data is deliberately empty so no fake submissions appear in the community totals. Database tests use temporary fixtures and roll them back.

The optional `stage_tube_ranking` WebMCP tool stages a complete visible draft in supported browsers. It does not submit a vote; the normal submit action is still required. Its browser registration is not tested in unsupported environments.

## Submission limit

A maximum of 10,000 current submissions is enforced by `submit_ranking()` in Postgres. Its transaction lock serializes the capacity check and insert, including simultaneous final-slot attempts. Existing voters can update at capacity, subject to the usual 30-second cooldown. Removing a vote administratively frees a slot.

When full, the app checks capacity before creating a new anonymous identity. Direct calls to Supabase Auth can still create identities; this is a stored-vote limit, not a signup, request, or spending cap. Enable CAPTCHA and review Supabase billing cost controls for that separate concern.

Run `python3 tests/submission-cap-concurrency.py` with local Supabase running to verify two requests competing for the final slot. The test uses an isolated schema and removes its own fixtures afterward.

### Community result caching
Only the public community aggregate is cached for 60 seconds using the Next data cache. Count and averages come from one database snapshot. The next visit after expiry triggers background refresh; this is not a strict 60-second freshness guarantee. Failed reads throw inside the cache so an error is never stored as an empty board; an existing good result can remain visible during a database outage. Submissions, individual rankings, authentication and capacity checks stay uncached. Saves deliberately do not invalidate the homepage cache.

The 10,000 limit requires migration `20260907223317_raise_submission_limit_to_10000.sql` as well as the app deployment. Local testing uses `supabase migration up --local`; do not apply remotely until the release is approved.
