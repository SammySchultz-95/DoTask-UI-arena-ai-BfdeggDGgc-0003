# Prompt: Build the DoTask Admin Panel Frontend (Next.js)

## Role

You are a senior frontend engineer specializing in Next.js, TypeScript, Tailwind CSS, and data-heavy admin panels backed by OpenAPI-described REST APIs.

## Source of truth

Two documents are attached and must be treated as authoritative, in this priority order:

1. **`swagger.json`** (DoTask API, OpenAPI 3.0.4) — the exact truth for every route, field name, request/response shape, status code, and role restriction. Do not invent fields or endpoints that aren't in it.
2. **This prompt** — the UI/UX layout and behavior on top of that API.

Where the UI description below asks for something the API doesn't support (e.g. a filter field with no matching query parameter), a **"⚠ Gap"** note explains the mismatch and gives the resolution to build. Don't silently invent a fake capability — follow the stated resolution, or flag it back if genuinely blocking.

This is the **admin panel only**, for the app named **DoTask**. Do not build anything for the DoTask Windows client or the public client-facing endpoints (`ClientPull`, `ClientFile` tags in the spec) beyond what's needed to show links generated for them.

## Tech stack (required)

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- **API client:** generate a typed client from `swagger.json` (`openapi-typescript` + a thin fetch wrapper, or `orval`) — no hand-written, untyped fetch calls
- **Server state:** TanStack Query (`react-query`) for every request — queries, mutations, polling, cache invalidation

## Auth

- Login: `POST /api/v1/admin/auth/login` → `{ token, role, must_change_password }`. `role` is one of `superadmin`, `normaladmin`, `readonlyadmin`, returned **at login** — there is no `/me` endpoint, so don't build one; store `role` alongside the token in your auth context.
- Logout: `POST /api/v1/admin/auth/logout`.
- Change password: `POST /api/v1/admin/me/change-password` (`{ current_password, new_password }`) — force this flow when `must_change_password` is true.
- **No refresh-token endpoint exists.** On any `401`, clear auth state and redirect to `/login`. Don't build silent refresh.
- Store the JWT + role in a React auth context backed by `localStorage` (acceptable for an internal tool; note the XSS trade-off in a code comment — swap for an httpOnly cookie later if stricter security is needed).
- **Role gating:** hide or disable an action if the current role can't perform it, based on the spec's per-endpoint role guards:
  - `readonlyadmin` — read-only everywhere; every write/create/delete/expire/confirm/reject action is hidden for this role.
  - Creating/editing/deleting **admins** and creating/editing/deleting **task types** — `superadmin` only.
  - Everything else (clients, pending clients, tasks, files, links) — `superadmin` and `normaladmin` can write.

## Global layout & theme

- App name **DoTask** — show it as the sidebar header/logo text (expanded mode) and in the browser tab title.
- Dark theme. Palette: near-black background (`#0a0a0a`/`#111`), panels a shade lighter (`#151515`/`#1a1a1a`), a **shiny/neon green** accent (`#00ff9c`-ish) for primary actions, active nav state, focus rings, and status-positive indicators. Keep body text a soft off-white/gray, not pure white, for contrast comfort.
- **Left sidebar**, collapsible via a toggle button at its top: expanded = icon + label per item (plus the "DoTask" wordmark at the top); minimized = icon only (just a logo mark at the top). Persist the collapsed state (e.g. `localStorage`).
- Sidebar items, in order:
  1. Dashboard
  2. Clients
  3. Pending Clients
  4. Task Types
  5. Client Tasks
  6. Downloads
  7. Uploads
  8. Admins
  9. Logs

## Shared/reusable building blocks

Build these once, reuse across every page — don't rebuild table/filter/polling logic per tab:

- **`DataTable`** — generic paginated table: leading auto-numbering column (`1, 2, 3…`, purely a rendered row index, not from the API), configurable columns, row-click for detail selection, row-action buttons.
- **`useLivePolling`**-style wrapper around `useQuery`: `refetchInterval: 5000` + an exposed `refetch()` for a manual "Reload" button, for every table the spec below marks as live. **Pause polling while a row's edit form in the detail panel is dirty**, so in-flight typing isn't clobbered by a refetch.
- **Sort control** — a simple `<select>` bound to each endpoint's **actual, documented** `sortBy`/`sortDir` values (see per-page tables below — these are narrower than "any field," don't imply support that isn't there).
- **Filter bar** — built from each endpoint's **actual, documented** query parameters (again, narrower than "every field" in places — see gaps below). Composes a plain query string, not a generic filter-object body: this API's list endpoints are `GET /resource/query?field=value&page=&pageSize=&sortBy=&sortDir=`, not a POST `FilterQuery` body.
- **Search box** — wired to each resource's `GET /resource/search?q=` endpoint where one exists (not every resource has one — see gaps).
- **Pagination envelope**, used everywhere lists are paginated: `{ items, page, pageSize, totalCount }` (note the exact casing — no `total_pages`, compute it client-side if needed).
- A modal component for all "create X" pop-ups.

## Page 1 — Dashboard (`/dashboard`)

- `GET /api/v1/admin/dashboard/summary` → `DashboardSummaryResponse`.
- Render as clean stat cards: `pending_clients`, `active_download_links`, `active_upload_links` as single numbers; `clients_by_status` and `tasks_by_status` (both `{status: count}` maps) as small breakdown lists or bar charts. Keep it simple — this is a landing overview, not a full BI dashboard.

## Page 2 — Clients (`/clients`)

Two-column layout.

**Left: Clients table** (`ClientResponse`)

| Column | Field |
|---|---|
| # | row index |
| Client ID | `client_id` |
| Name | `client_name` |
| Last check-in | `last_check_in` |
| Status | `status` (`running`\|`shutdown`\|`suspended`) |
| Latest IP | `client_ip_stack[0]` — ⚠ *assumption:* "first ip in the stack" is treated as the most recent; confirm this ordering with the backend if unclear. |

- Data: `GET /admin/clients/query`. Manual reload + `refetchInterval: 5000`.
- Sort: `sortBy` = `creation_time` | `client_id` | `client_name` (default **`client_name`**, per your ask — pass it explicitly since the API's own default is `creation_time`). `sortDir` asc/desc.
- Filter: `client_id`, `client_name`, `status`, `createdAfter`/`createdBefore` (`creation_time` range) — these are the only server-side filters available. ⚠ **Gap:** there's no query param for `last_check_in` or IP. Resolution: filter those two client-side against the currently loaded page.
- Search: `GET /admin/clients/search?q=`.
- Row action: jump to **Client Tasks**, pre-selecting this `client_id` (route with a query param, e.g. `/client-tasks?client_id=...`).

**Right, top box — Edit client** (`PatchClientRequest`): `client_name`, `wait_time`, `wait_time_2`, `status`. `client_id` and `creation_time` are read-only.

**Right, bottom box — Add task for this client** (`CreateTaskRequest`, `client_id` prefilled):
- `task_type_id` — select, populated from `GET /admin/task-types`
- `wait_time`, `wait_time_2` — number inputs
- `task_context` — text field
- `use_schedule` — checkbox
- `schedule` — datetime picker, submitted as an ISO-8601 UTC string (e.g. `2026-09-16T12:20:50.0Z`); only enabled/required when `use_schedule` is checked
- Submit → `POST /admin/tasks`

## Page 3 — Pending Clients (`/pending-clients`)

Single table, no right-hand detail panel needed (the confirm action opens its own pop-up).

**Table** (`PendingClientResponse`)

| Column | Field |
|---|---|
| # | row index |
| Client ID | `client_id` |
| Last request | `last_request_time` |
| Request count | `requests_count` |

- Data: `GET /admin/pending-clients/query`. Manual reload + `refetchInterval: 5000` (these are clients actively knocking, so live refresh matters here too, matching the pattern used on the other list pages).
- Sort: `sortBy` = `request_time` (default) | `client_id`. ⚠ *Correction:* your note said "default is task_name" for this page's sort and "filter for every task info" — that looks like it was carried over from the Task Types section by mistake, since pending clients have no task fields. Sort/filter below are scoped to `PendingClientResponse`'s own fields instead.
- Filter: `client_id`, `request_time_after`/`request_time_before`. ⚠ **Gap:** no query param for `requests_count` or `client_ip_stack` — filter those client-side against the loaded page if needed.
- Search: ⚠ **Gap:** no `/pending-clients/search` endpoint exists. Omit the search box on this page, or implement a client-side text filter over `client_id` against the loaded page as a stand-in.
- **Reject** button per row → `DELETE /admin/pending-clients/{client_id}`.
- **Confirm** button per row → opens a modal (`ConfirmPendingClientRequest`: `client_name`, `wait_time`, `wait_time_2`) → `POST /admin/pending-clients/{client_id}/confirm`. On success, invalidate both the pending-clients list and the clients list (the new registration now shows up on the Clients page).

## Page 4 — Task Types (`/task-types`)

⚠ **Gap:** there is **no** `/task-types/query` or `/task-types/search` endpoint — only `GET /admin/task-types` (returns the full unpaginated array) and `GET /admin/task-types/{id}` (single item). **Resolution:** fetch the full list once (it's reference data, expected to be small) and implement sort/filter/search entirely client-side over that cached array.

**Left: Task Types table** (`TaskTypeResponse`)

| Column | Field |
|---|---|
| # | row index |
| Name | `task_type_name` |
| ID | `task_type_id` |
| Description | `description` |

- Delete button per row → `DELETE /admin/task-types/{task_type_id}` (superadmin only; hidden for other roles; API returns `409` if the type is still referenced by existing tasks — surface that error message directly).
- "Create task type" button → modal (`CreateTaskTypeRequest`: `task_type_id` [number, chosen by the admin, immutable after creation], `task_type_name`, `description`) → `POST /admin/task-types` (superadmin only).
- Client-side sort (default `task_type_name`), filter, and search per the Gap resolution above.

**Right — Edit task type** (`PatchTaskTypeRequest`: `task_type_name`, `description` — superadmin only) via `PATCH /admin/task-types/{id}`. `task_type_id` is immutable, shown read-only.

## Page 5 — Client Tasks (`/client-tasks`)

Header dropdown: pick a client (options from the clients list) or "— no client selected —"; reads/writes an optional `client_id` query param so the Page-2 row action can deep-link here.

**Left: Tasks table** (`TaskAdminResponse`)

| Column | Field |
|---|---|
| Task ID | `task_id` |
| Client | `client_id` |
| Type | `task_type_name` |
| Status | `status` (`scheduled`\|`not_sent`\|`sent`\|`completed`) |
| Wait / Wait 2 | `wait_time` / `wait_time_2` |
| Created | `creation_time` |
| Scheduled for | `schedule` |
| Sent | `send_time` |
| Responded | `response_time` |
| Response | `response`, truncated in the table — full text lives only in the detail panel |

- "Add task" bar at top of the table — same form as Page 2's add-task box (`client_id` prefilled if a client is selected).
- Data: `GET /admin/tasks/query`, scoped by `client_id` when one is selected. Manual reload + 5s polling.
- Sort: `sortBy` = `creation_time` (default) | `task_id` | `client_id` | `status` | `schedule`.
- Filter: `client_id`, `task_id`, `task_type_id`, `status`, `creator`, `createdAfter`/`createdBefore`, `schedule_after`/`schedule_before` — this is the full documented set. ⚠ **Gap:** there's no query filter for `response`, `wait_time`, `send_time`, `response_time`, `client_pull_ip`, or `client_response_ip`. Use the search box below for loose matching on those, or filter client-side within the loaded page.
- Search: `GET /admin/tasks/search?q=`.

**Right — Task detail** (full `response` text, no truncation):
- Editable via `PatchTaskRequest` (`response`, `status`, `send_time`, `response_time`, `task_context`, `wait_time`, `wait_time_2`, `client_pull_ip`, `client_response_ip`, `schedule`) → `PATCH /admin/tasks/{task_id}`.
- Per your rule: **disable all edit controls once `status !== "not_sent"` / `"scheduled"`** (i.e. once it's `sent` or `completed`). ⚠ Note: this is a UI-side convention you're asking for — the API's documented `400` cases only explicitly block moving a task *into* `scheduled` after creation and changing `schedule` on a non-scheduled task. It may not itself reject other edits to a sent task, so enforce the freeze in the frontend and don't rely on the backend to reject it.

## Page 6 — Downloads (`/downloads`)

⚠ **Gap:** `GET /admin/files/downloadable` supports only `page`/`pageSize` — no sort, filter, or search params, and no update endpoint for file metadata exists at all. **Resolution:** fetch with a larger `pageSize` (e.g. 200) and do sort/filter/search client-side over that page; treat the file's info panel as **read-only** (no edit form) since there's nothing to PATCH — note this in a code comment rather than building a non-functional edit form.

**Left: Files table** (`DownloadableFileResponse`: `file_name`, `content_type`, `size_bytes`, `uploaded_by`, `uploaded_time`)
- "Upload new file" button → multipart `POST /admin/files/downloadable`.
- Manual reload + 5s polling.
- Row click expands a nested sub-table of that file's links: `GET /admin/files/downloadable/links/query?file_id=...` (`DownloadLinkResponse`: `link_id`, `token`, `client_id`, `created_by`, `created_time`, `expires_time`, `status`, `download_url`). Sort: `created_time` only (the only supported field). Filter: `file_id`, `client_id`, `status`.

**Right — contextual detail panel:**
- **File selected:** read-only info display (see Gap above) + a "Create link" form (`CreateDownloadLinkRequest`: `expires_time`, optional `client_id`) → `POST /admin/files/downloadable/{file_id}/links`.
- **Link selected (from a file's sub-table):** read-only link info (⚠ no update endpoint for links either — only expiry) + an **Expire** button → `POST /admin/files/downloadable/links/{link_id}/expire`.

## Page 7 — Uploads (`/uploads`)

**Left: Upload links table** (`UploadLinkResponse`: `link_id`, `token`, `client_id`, `created_by`, `created_time`, `expires_time`, `status`, `upload_url`)
- "Create upload link" form at top (`CreateUploadLinkRequest`: `client_id` [required, select from clients], `expires_time` [optional]) → `POST /admin/files/uploadable/links`. ⚠ Note: unlike some upload-link systems, there's no `max_usage_count`/`suggested_file_name` field here — upload links are inherently single-use per the backend design, so don't build inputs for fields that don't exist.
- Data: `GET /admin/files/uploadable/links/query`. Sort: `created_time` only. Filter: `client_id`, `status` (`active`\|`expired`\|`used`). Manual reload + 5s polling.

**Right — Upload link detail:**
- Read-only info (⚠ no update endpoint — link fields aren't editable, only expirable) + **Expire** button → `POST /admin/files/uploadable/links/{link_id}/expire`.
- "Files uploaded through this link": `GET /admin/files/uploadable/query` supports `client_id` and `uploaded_time_after`/`before` but **not** an `upload_link_id` filter. ⚠ **Resolution:** query by the link's `client_id`, then filter the results client-side by matching `upload_link_id` to the selected link.

## Page 8 — Admins (`/admins`)

⚠ **Gap:** same as Task Types — `GET /admin/admins` returns the full array with no query/search endpoint. **Resolution:** client-side sort/filter/search.

**Left: Admins table** (`AdminResponse`: `username`, `role`, `is_active`, `must_change_password`, `creation_time`)
- All create/edit/delete actions on this page are **superadmin-only** — hide them entirely for other roles.
- "Create admin" button → modal (`CreateAdminRequest`: `username`, `password`, `role`) → `POST /admin/admins`.
- Delete button per row → `DELETE /admin/admins/{username}` (blocked by the API — `400`/`409` — for deleting your own account or the last active superadmin; surface those errors as-is).

**Right — Edit admin** (`PatchAdminRequest`: `role`, `is_active`, `password`) via `PUT`/`PATCH /admin/admins/{username}`. `username` is immutable.

## Page 9 — Logs (`/logs`)

This one maps cleanly to the API — no gaps.

**Left: Logs table** (`LogEntryResponse`: `log_id`, `actor`, `time`, `context`, `level`)
- Data: `GET /admin/logs/query`. Manual reload (polling optional here — logs are historical, less critical to auto-refresh, but fine to include at 5s if you want parity with the other tables).
- Sort: `sortBy` = `time` (default) | `actor`.
- Filter: `actor` (exact), `level` (`info`\|`warning`\|`error`), `context` (already a partial/`LIKE`-style match — this doubles as your search box for this page), `timeAfter`/`timeBefore`.

**Right — Log detail:** full `context` text (can be long), plus `log_id`, `actor`, `time`, `level`.

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
 └─ ui/ (modal, buttons, form inputs — dark/green theme primitives)
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

- The DoTask Windows client, or the `ClientPull`/`ClientFile` consumer flows — admin panel only.
- Edit forms for downloadable files or either kind of link — those objects aren't editable per the API; expiry/creation only.
- A generic "any field" filter builder — build against each endpoint's actual documented query parameters, per the tables above.
- Silent token refresh — there's no endpoint for it.

## First response

List the gaps flagged above back to me in a few bullets to confirm you've registered them, then propose the `features/` folder contents (types + hook names per resource) for review before writing UI code.
