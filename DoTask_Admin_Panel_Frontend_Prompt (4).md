# Prompt: Build the DoTask Admin Panel Frontend (Next.js)

## Role

Senior frontend engineer: Next.js, TypeScript, Tailwind CSS, admin panels over OpenAPI REST APIs. Admin panel only — don't build the DoTask Windows client or the public `ClientPull`/`ClientFile` endpoints' consumer flows, beyond showing links generated for them.

## Source of truth

`swagger.json` is the single source of truth for every route, field, shape, status code, and role restriction — this prompt only describes the UI/UX layered on top of it, and every read/write in the app must be a real call against it (no mocked, stubbed, or hardcoded data).

## Tech stack (required)

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- **API client:** typed client generated from `swagger.json` (`openapi-typescript` + thin fetch wrapper, or `orval`) — no hand-written, untyped fetch calls
- **Data fetching:** all API calls — every query and every mutation, including polling — go through **TanStack Query (`react-query`)** hooks built on top of the generated client. No raw `fetch`/`axios` calls anywhere outside that layer.

## Auth

- Login: `POST /api/v1/admin/auth/login` → `{ token, role, must_change_password }`. `role` ∈ `superadmin`/`normaladmin`/`readonlyadmin`, returned at login — no `/me` endpoint, store `role` from login.
- Logout: `POST /api/v1/admin/auth/logout`. Change password: `POST /api/v1/admin/me/change-password` (force this flow when `must_change_password`).
- No refresh-token endpoint — on `401`, clear auth state and redirect to `/login`.
- Store JWT + role in a React auth context backed by `localStorage` (fine for an internal tool; note the XSS trade-off in a comment).
- **Role gating:** `readonlyadmin` — read-only everywhere, hide every write/delete/expire/confirm/reject action. Admins and Task Types create/edit/delete — `superadmin` only. Everything else — `superadmin`/`normaladmin` can write.

## Login page (`/login`)

A polished, modern login screen matching the dark/green theme — this is the first thing anyone sees, so it should feel deliberate, not like a placeholder form:

- Centered card on the dark background, DoTask wordmark/logo above the form, subtle green accent (e.g. a glow on the primary button or an accent border).
- Fields: `username`, `password` (masked, with a show/hide toggle). Submit button uses the green accent as its primary color.
- Client-side validation (both fields required) before calling the API; disable the submit button and show a spinner while the request is in flight.
- On submit → `POST /api/v1/admin/auth/login`. On success, store `token`/`role`, then redirect to `/dashboard` — unless `must_change_password` is true, in which case redirect to a forced change-password step first (`POST /api/v1/admin/me/change-password`) before letting them into the app.
- On `401`, show an inline error near the form ("Invalid username or password") — don't leak which field was wrong. On `400`/`500`, show a generic error in the same spot.
- Pressing Enter in either field submits the form; autofocus the username field on load.

## Global layout & theme

- App name **DoTask** — sidebar wordmark (expanded) + browser tab title.
- Dark theme: near-black background, slightly lighter panels, shiny/neon-green accent for primary actions/active nav/focus rings. Soft off-white body text.
- Left sidebar, collapsible (icon+label expanded / icon-only minimized), toggle at top, state persisted.
- Sidebar order: Dashboard, Clients, Pending Clients, Task Types, Client Tasks, Downloads, Uploads, Admins, Logs.

## Shared/reusable building blocks

- **`DataTable`** — paginated table, auto-numbering row index, configurable columns, row-click detail selection, row actions.
- **Live-polling `useQuery` wrapper** — `refetchInterval: 5000` + manual `refetch()`. Pause polling while a detail-panel edit form is dirty.
- **Sort control** — `<select>` bound to each endpoint's actual `sortBy`/`sortDir` values (per page below).
- **Filter bar** — built from each endpoint's actual query params (plain query string, not a `FilterQuery` body: `GET /resource/query?field=value&page=&pageSize=&sortBy=&sortDir=`). Numeric/date fields typically come as exact + `_min`/`_max` or `_after`/`_before` + sometimes a `has_x` boolean — group these as "exact / from / to" rather than one raw input each; put high-cardinality range filters behind an "advanced filters" disclosure.
- **Search box** — `GET /resource/search?q=` where one exists.
- **Pagination envelope**: `{ items, page, pageSize, totalCount }` (no `total_pages`).
- Modal component for all "create X" pop-ups; confirm dialog for every delete.

## Page 1 — Dashboard (`/dashboard`)

- `GET /api/v1/admin/dashboard/summary` → `DashboardSummaryResponse`.
- Stat cards: `pending_clients`, `active_download_links`, `active_upload_links` as numbers; `clients_by_status` / `tasks_by_status` as small breakdown lists or bar charts. Keep it simple.

## Page 2 — Clients (`/clients`)

**Left: Clients table** (`ClientResponse`) — columns: #, `client_id`, `client_name`, `last_check_in`, `status`, `requests_count`, `creation_time`, Latest IP = `client_ip_stack[0]` (⚠ assumption: first = most recent — confirm ordering with backend if unsure).

- Data: `GET /admin/clients/query`. Manual reload + 5s polling.
- Sort: `creation_time` (default; pass `client_name` explicitly per your ask) | `client_id` | `client_name` | `last_check_in` | `status` | `wait_time` | `wait_time_2` | `requests_count`.
- Filter: `client_id`, `client_name`, `client_name_contains`, `status`, `wait_time`/`_min`/`_max`, `wait_time_2`/`_min`/`_max`, `requests_count`/`_min`/`_max`, `has_ip`, `createdAfter`/`createdBefore`, `last_check_in_after`/`before`, `has_checked_in`. Main bar: `status`, `client_name_contains`, `has_ip`, date ranges; rest under "advanced."
- Search: `GET /admin/clients/search?q=`.
- Row action: jump to Client Tasks pre-filtered to this `client_id`.
- **Delete** → `DELETE /admin/clients/{client_id}`. No backend conflict-guard here, so confirm client-side before deleting.

**Right, top — Edit client** (`PatchClientRequest`): `client_name`, `wait_time`, `wait_time_2`, `status`. `client_id`/`creation_time` read-only.

**Right, bottom — Add task** (`CreateTaskRequest`, `client_id` prefilled): `task_type_id` select, `wait_time`, `wait_time_2`, `task_context`, `use_schedule` checkbox, `schedule` datetime (submit as ISO-8601 UTC, e.g. `2026-09-16T12:20:50.0Z`) → `POST /admin/tasks`.

## Page 3 — Pending Clients (`/pending-clients`)

Single table, no detail panel (Confirm opens its own modal).

**Table** (`PendingClientResponse`) — #, `client_id`, `last_request_time`, `requests_count`.

- Data: `GET /admin/pending-clients/query`. Manual reload + 5s polling.
- Sort: `last_request_time` (default) | `first_request_time` | `client_id` | `requests_count`.
- Filter: `client_id`, `first_request_time_after`/`before`, `last_request_time_after`/`before`, `requests_count`/`_min`/`_max`, `has_ip`.
- Search: `GET /admin/pending-clients/search?q=`.
- **Reject** → `DELETE /admin/pending-clients/{client_id}`.
- **Confirm** → modal (`ConfirmPendingClientRequest`: `client_name`, `wait_time`, `wait_time_2`) → `POST /admin/pending-clients/{client_id}/confirm`; invalidate both this list and Clients on success.

## Page 4 — Task Types (`/task-types`)

**Left: Task Types table** (`TaskTypeResponse`) — #, `task_type_name`, `task_type_id`, `description`.

- Data: `GET /admin/task-types/query`. Filter: `task_type_id`, `task_type_name`, `task_type_name_contains`, `description_contains`, `has_description`. Sort: `task_type_id` (default) | `task_type_name`. Search: `GET /admin/task-types/search?q=`.
- Use the plain `GET /admin/task-types` (full array) only to populate the `task_type_id` select on the Add-task forms (Pages 2 & 5).
- **Delete** → `DELETE /admin/task-types/{task_type_id}` (superadmin only; `409` if still referenced by tasks — surface it).
- "Create task type" → modal (`CreateTaskTypeRequest`: `task_type_id` [number, immutable], `task_type_name`, `description`) → `POST /admin/task-types` (superadmin only).

**Right — Edit task type** (`PatchTaskTypeRequest`: `task_type_name`, `description`, superadmin only) via `PATCH /admin/task-types/{id}`. `task_type_id` read-only.

## Page 5 — Client Tasks (`/client-tasks`)

Header dropdown: pick a client or "— none —"; syncs an optional `client_id` query param (deep-linked from Page 2).

**Left: Tasks table** (`TaskAdminResponse`) — `task_id`, `client_id`, `task_type_name`, `creator`, `status`, `wait_time`/`wait_time_2`, `creation_time`, `schedule`, `send_time`, `response_time`, `response` (truncated — full text only in detail panel).

- "Add task" bar at top — same form as Page 2's add-task box.
- Data: `GET /admin/tasks/query`, scoped by `client_id` if selected. Manual reload + 5s polling.
- Sort: `creation_time` (default) | `task_id` | `task_type_id` | `client_id` | `status` | `send_time` | `response_time` | `wait_time` | `wait_time_2` | `schedule` | `creator`.
- Filter: `client_id`, `task_id`, `task_type_id`, `task_type_name`, `status`, `creator`, `client_pull_ip`, `client_response_ip`, `has_response`, `response_contains`, `context_contains`, `wait_time`/`_min`/`_max`, `wait_time_2`/`_min`/`_max`, `createdAfter`/`before`, `send_time_after`/`before`, `response_time_after`/`before`, `schedule_after`/`before`, `has_schedule`.
- Search: `GET /admin/tasks/search?q=`.

**Right — Task detail** (full `response`, no truncation): editable via `PatchTaskRequest` (`response`, `status`, `send_time`, `response_time`, `task_context`, `wait_time`, `wait_time_2`, `client_pull_ip`, `client_response_ip`, `schedule`) → `PATCH /admin/tasks/{task_id}`. Per your rule, **disable all edit controls once status isn't `not_sent`/`scheduled`** — ⚠ this freeze is a UI convention, the API's documented `400`s only block moving into `scheduled` and schedule edits on non-scheduled tasks, so don't rely on the backend to reject other edits.

## Page 6 — Downloads (`/downloads`)

**Left: Files table** (`DownloadableFileResponse`: `file_name`, `content_type`, `size_bytes`, `uploaded_by`, `uploaded_time`)

- Data: `GET /admin/files/downloadable/query`. Filter: `file_id`, `file_name`, `file_name_contains`, `content_type`, `content_type_contains`, `uploaded_by`, `uploaded_by_contains`, `size_bytes_min`/`max`, `uploaded_time_after`/`before`. Sort: `uploaded_time` (default) | `file_name` | `content_type` | `uploaded_by` | `size_bytes`. Search: `GET /admin/files/downloadable/search?q=`.
- "Upload new file" → multipart `POST /admin/files/downloadable`. Manual reload + 5s polling.
- **Delete** → `DELETE /admin/files/downloadable/{file_id}` (`409` if active links still reference it — surface it, point at the sub-table, don't auto-expire).
- Row click expands sub-table of that file's links: `GET /admin/files/downloadable/links/query?file_id=...` (`DownloadLinkResponse`). Sort: `created_time` (default) | `expires_time` | `status` | `created_by`. Filter: `link_id`, `file_id`, `client_id`, `created_by`, `status`, `created_time_after`/`before`, `expires_time_after`/`before`, `has_expiry`.

**Right:** file selected → read-only info (no metadata-edit endpoint; retrieving bytes back is only via a download link, same as a client) + "Create link" form (`CreateDownloadLinkRequest`: `expires_time`, optional `client_id`) → `POST /admin/files/downloadable/{file_id}/links`. Link selected → read-only info (no update, only expiry) + **Expire** → `POST /admin/files/downloadable/links/{link_id}/expire`.

## Page 7 — Uploads (`/uploads`)

**Left: Upload links table** (`UploadLinkResponse`)

- "Create upload link" (`CreateUploadLinkRequest`: `client_id` required, `expires_time` optional) → `POST /admin/files/uploadable/links`. No usage-count field — links are single-use.
- Data: `GET /admin/files/uploadable/links/query`. Manual reload + 5s polling. Sort: `created_time` (default) | `expires_time` | `status` | `client_id` | `created_by`. Filter: `link_id`, `client_id`, `created_by`, `status`, `created_time_after`/`before`, `expires_time_after`/`before`, `has_expiry`.

**Right:** read-only link info + **Expire** → `POST /admin/files/uploadable/links/{link_id}/expire`. Files uploaded through this link: `GET /admin/files/uploadable/query?upload_link_id={link_id}` (direct filter — also supports `file_id`, `client_id`, `file_name`, `file_name_contains`, `content_type`, `size_bytes_min`/`max`, `uploaded_time_after`/`before`; sort `uploaded_time` default). Per file: **Download** → `GET /admin/files/uploadable/{file_id}/download` (read filename from `Content-Disposition`) and **Delete** → `DELETE /admin/files/uploadable/{file_id}`.

## Page 8 — Admins (`/admins`)

**Left: Admins table** (`AdminResponse`: `username`, `role`, `is_active`, `must_change_password`, `creation_time`)

- Data: `GET /admin/admins/query`. Filter: `username`, `username_contains`, `role`, `is_active`, `must_change_password`, `creation_time_after`/`before`. Sort: `creation_time` (default) | `username` | `role` | `is_active`. Search: `GET /admin/admins/search?q=`.
- All create/edit/delete on this page: **superadmin only** — hide entirely for other roles.
- "Create admin" → modal (`CreateAdminRequest`: `username`, `password`, `role`) → `POST /admin/admins`.
- **Delete** → `DELETE /admin/admins/{username}` (`400`/`409` guards: own account, last active superadmin — surface as-is).

**Right — Edit admin** (`PatchAdminRequest`: `role`, `is_active`, `password`) via `PUT`/`PATCH /admin/admins/{username}`, `username` immutable. Same guards apply to edits (`400` own-account/invalid role, `409` last-superadmin) — pre-disable the `is_active` toggle on the logged-in admin's own row so the `400` is rare rather than the default click outcome.

## Page 9 — Logs (`/logs`)

**Left: Logs table** (`LogEntryResponse`: `log_id`, `actor`, `time`, `context`, `level`)

- Data: `GET /admin/logs/query`. Manual reload (polling optional, fine at 5s for parity).
- Sort: `time` (default) | `log_id` | `actor` | `level`.
- Filter: `log_id`/`_min`/`_max`, `actor`, `actor_contains`, `level`, `context` (partial match, aliases `q`/`context_contains` — doubles as search), `timeAfter`/`timeBefore`.

**Right — Log detail:** full `context`, plus `log_id`, `actor`, `time`, `level`.

## Folder structure

```
app/
 ├─ (auth)/login/
 ├─ dashboard/
 ├─ clients/
 ├─ pending-clients/
 ├─ task-types/
 ├─ client-tasks/
 ├─ downloads/
 ├─ uploads/
 ├─ admins/
 └─ logs/
components/
 ├─ data-table/
 ├─ filter-bar/
 ├─ sidebar/
 └─ ui/ (modal, buttons, form inputs, confirm-dialog — dark/green theme primitives)
features/
 ├─ clients/ (hooks, types, components)
 ├─ pending-clients/
 ├─ task-types/
 ├─ tasks/
 ├─ files/        (downloadable files + download links)
 ├─ uploads/       (upload links + uploaded files)
 ├─ admins/
 └─ logs/
lib/
 ├─ api-client/    (generated from swagger.json)
 └─ auth/
```

## What not to build

- The DoTask Windows client, or the `ClientPull`/`ClientFile` consumer flows.
- Edit forms for downloadable files or either kind of link — not editable per the API; creation, deletion (files only), and expiry (links only) are the only mutations.
- A generic "any field" filter builder — build against each endpoint's actual documented query parameters.
- Silent token refresh, or a usage-count field on upload links — neither exists in the API.
- Any mocked/hardcoded data — every screen must be wired to the real API.

## First response

Confirm the endpoint/field mapping above against `swagger.json`, flag anything that doesn't match, then propose the `features/` folder contents (types + hook names per resource) for review before writing UI code.
