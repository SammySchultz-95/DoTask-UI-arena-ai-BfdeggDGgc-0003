# DoTask Admin Panel

Dark, neon-green admin panel for the **DoTask API v1**, built with Next.js (App
Router), TypeScript, Tailwind CSS and TanStack Query.

`swagger.json` is the single source of truth — the API client types are
generated from it, and every screen is wired against the real endpoints (no
mocked data).

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Typed API client** — `lib/api-client/schema.ts` generated from
  `swagger.json` via `openapi-typescript`; a thin fetch wrapper
  (`lib/api-client/client.ts`) + typed endpoint functions
  (`lib/api-client/endpoints.ts`)
- **TanStack Query** — every query/mutation/poll goes through hooks
  (`features/*/hooks.ts`, `lib/hooks/use-live-query.ts`), 5 s live polling
  with pause-while-editing
- **Auth** — JWT + role from `POST /api/v1/admin/auth/login` stored in
  localStorage (internal-tool trade-off documented in `lib/auth/storage.ts`);
  forced change-password flow when `must_change_password`; on 401 the session
  is cleared and you land back on `/login`

## Getting started

```bash
npm install
# point the dev server at your DoTask backend, then:
API_PROXY_TARGET=http://localhost:8080 npm run dev
```

Open http://localhost:3000 — the browser always talks to same-origin
`/api/v1/*`; Next proxies those paths to `API_PROXY_TARGET`, so no CORS
configuration is needed (also how the sandboxed live preview works).

Alternatively set `NEXT_PUBLIC_API_URL=https://api.example.com` to call the
API cross-origin directly. Copy `.env.example` to `.env.local` to persist
either setting.

### Regenerating API types after a swagger change

```bash
npm run generate:types
```

## Role model

| Capability | superadmin | normaladmin | readonlyadmin |
| --- | :-: | :-: | :-: |
| View everything | ✓ | ✓ | ✓ (except Admins) |
| Ordinary writes (tasks, clients, links, confirm/reject, expire, delete links…) | ✓ | ✓ | — |
| Task Types + Admins create/edit/delete | ✓ | — | — |
| Task Types / Admins details (view-only) | ✓ | ✓ | task types only |
| Server Config view / modify | ✓ / ✓ | ✓ / — | ✓ / — |

Admin visibility is API-enforced: superadmins see all admins, normal admins
see only normal + read-only admins, and read-only admins see no admins at all
(the Admins page is hidden for them).

Sidebar badges show live counts: running clients (status `running`), pending
clients, and active ("online") admins.

## Pages

| Route | Purpose |
| --- | --- |
| `/login` | Sign-in card (DoTask wordmark, show/hide password, inline errors) |
| `/change-password` | Forced first-login password change |
| `/dashboard` | Summary stat cards + clients/tasks status breakdowns |
| `/clients` | Clients table · edit client · add task · delete · jump to tasks |
| `/pending-clients` | Confirm (modal) / reject pending registrations |
| `/task-types` | Table · create modal · edit panel (superadmin) · 409-aware delete |
| `/client-tasks` | Client scope dropdown (`?client_id=`), add-task bar, task detail editor (frozen once past `not_sent`/`scheduled`) |
| `/downloads` | Upload files · links sub-table per file · create/expire links · 409-aware delete |
| `/uploads` | Single-use upload links (create/expire/delete) · files per link with download/delete |
| `/admins` | Admin CRUD (superadmin), view-only details for normal admins, own-row guard |
| `/server-config` | Default response wait times — viewable by all admins, editable by superadmin |
| `/logs` | Audit log table + full-context detail |

Clicking the admin avatar at the bottom of the sidebar opens a menu with
**Profile** (own account info + change password) and **Sign out**.

## Notes / assumptions

- `client_ip_stack[0]` is shown as the client's latest IP (first = most
  recent — confirm ordering with the backend if unsure).
- Task editing freeze for statuses other than `not_sent`/`scheduled` is a
  UI convention; the API's documented 400s only block the `scheduled`
  transition and schedule edits on non-scheduled tasks.
- The task detail editor freezes edits once a task leaves
  `not_sent`/`scheduled`.
