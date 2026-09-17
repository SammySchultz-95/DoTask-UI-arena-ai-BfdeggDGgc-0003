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
| Requests | `requests_count` |
| Created | `creation_time` |
| Latest IP | `client_ip_stack[0]` — ⚠ *assumption:* "first ip in the stack" is treated as the most recent; confirm this ordering with the backend if unclear. |

- Data: `GET /admin/clients/query`. Manual reload + `refetchInterval: 5000`.
- Sort: `sortBy` = `creation_time` (default) | `client_id` | `client_name` | `last_check_in` | `status` | `wait_time` | `wait_time_2` | `requests_count`. Pass `client_name` explicitly per your ask, since the API's own default is `creation_time`. `sortDir` asc/desc.
- Filter — the documented set is bigger than a first pass suggests: `client_id` (exact), `client_name` (exact), `client_name_contains` (partial, case-insensitive), `status`, `wait_time`/`wait_time_min`/`wait_time_max`, `wait_time_2`/`wait_time_2_min`/`wait_time_2_max`, `requests_count`/`requests_count_min`/`requests_count_max`, `has_ip` (matches clients whose `client_ip_stack` contains the given IP), `createdAfter`/`createdBefore` (`creation_time` range), `last_check_in_after`/`last_check_in_before`, `has_checked_in` (boolean — has the client ever checked in). ⚠ **Correction:** the earlier draft said `last_check_in` and IP weren't filterable and needed a client-side workaround — they are server-side filterable (`last_check_in_after`/`before` and `has_ip`); drop the workaround. Put `status`, `client_name_contains`, `has_ip`, and the two date ranges in the main filter bar; the wait-time/request-count ranges and `has_checked_in` are good candidates for an "advanced filters" disclosure since there are a lot of them.
- Search: `GET /admin/clients/search?q=`.
- Row action: jump to **Client Tasks**, pre-selecting this `client_id` (route with a query param, e.g. `/client-tasks?client_id=...`).
- **Delete** button per row → `DELETE /admin/clients/{client_id}`. ⚠ **Gap (missing from the original draft):** this endpoint exists but wasn't specified — without it there's no way to remove a client. Unlike task types/downloadable files, the API documents no `409` conflict guard here (deleting a client with existing tasks/links isn't blocked per the spec), so put a confirmation dialog in front of it client-side since the backend won't stop an accidental delete.

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
- Sort: `sortBy` = `last_request_time` (default) | `first_request_time` | `client_id` | `requests_count`. ⚠ *Correction:* the earlier draft said the default sort field was `request_time` and that filtering covered "every task info" — that looks like it was carried over from the Task Types section by mistake, since pending clients have no task fields; the field is also actually named `last_request_time`, not `request_time`. Sort/filter below are scoped to `PendingClientResponse`'s own fields instead.
- Filter: `client_id`, `first_request_time_after`/`first_request_time_before`, `last_request_time_after`/`last_request_time_before`, `requests_count`/`requests_count_min`/`requests_count_max`, `has_ip` (matches entries whose `client_ip_stack` contains the given IP). ⚠ **Correction:** the earlier draft said `requests_count` and the IP stack weren't filterable — they are, via the params above; drop the client-side workaround.
- Search: `GET /admin/pending-clients/search?q=`. ⚠ **Correction (swagger update):** the earlier draft said no search endpoint existed for this resource — it's been added since. Wire up the search box like every other page instead of the client-side-filter stand-in.
- **Reject** button per row → `DELETE /admin/pending-clients/{client_id}`.
- **Confirm** button per row → opens a modal (`ConfirmPendingClientRequest`: `client_name`, `wait_time`, `wait_time_2`) → `POST /admin/pending-clients/{client_id}/confirm`. On success, invalidate both the pending-clients list and the clients list (the new registration now shows up on the Clients page).

## Page 4 — Task Types (`/task-types`)

⚠ **Correction (swagger update):** the earlier draft said there was no `/task-types/query` or `/task-types/search` endpoint and had you fetch the full list once and do everything client-side — both endpoints have been added since. Use them like every other resource: `GET /admin/task-types/query` for the table (filters: `task_type_id` (exact), `task_type_name` (exact), `task_type_name_contains` (partial), `description_contains` (partial), `has_description` (boolean); sort: `sortBy` = `task_type_id` (default) | `task_type_name`) and `GET /admin/task-types/search?q=` for the search box. The plain `GET /admin/task-types` (full unpaginated array) is still there too — keep using it just to populate the `task_type_id` select on the "Add task" forms (Pages 2 and 5), since a full in-memory list is exactly what a `<select>` needs.

**Left: Task Types table** (`TaskTypeResponse`)

| Column | Field |
|---|---|
| # | row index |
| Name | `task_type_name` |
| ID | `task_type_id` |
| Description | `description` |

- Delete button per row → `DELETE /admin/task-types/{task_type_id}` (superadmin only; hidden for other roles; API returns `409` if the type is still referenced by existing tasks — surface that error message directly).
- "Create task type" button → modal (`CreateTaskTypeRequest`: `task_type_id` [number, chosen by the admin, immutable after creation], `task_type_name`, `description`) → `POST /admin/task-types` (superadmin only).
- Server-side sort (default `task_type_id`, pass `task_type_name` explicitly if you want name-first per your original ask), filter, and search per the corrected endpoints above.

**Right — Edit task type** (`PatchTaskTypeRequest`: `task_type_name`, `description` — superadmin only) via `PATCH /admin/task-types/{id}`. `task_type_id` is immutable, shown read-only.

## Page 5 — Client Tasks (`/client-tasks`)

Header dropdown: pick a client (options from the clients list) or "— no client selected —"; reads/writes an optional `client_id` query param so the Page-2 row action can deep-link here.

**Left: Tasks table** (`TaskAdminResponse`)

| Column | Field |
|---|---|
| Task ID | `task_id` |
| Client | `client_id` |
| Type | `task_type_name` |
| Creator | `creator` |
| Status | `status` (`scheduled`\|`not_sent`\|`sent`\|`completed`) |
| Wait / Wait 2 | `wait_time` / `wait_time_2` |
| Created | `creation_time` |
| Scheduled for | `schedule` |
| Sent | `send_time` |
| Responded | `response_time` |
| Response | `response`, truncated in the table — full text lives only in the detail panel |

- "Add task" bar at top of the table — same form as Page 2's add-task box (`client_id` prefilled if a client is selected).
- Data: `GET /admin/tasks/query`, scoped by `client_id` when one is selected. Manual reload + 5s polling.
- Sort: `sortBy` = `creation_time` (default) | `task_id` | `task_type_id` | `client_id` | `status` | `send_time` | `response_time` | `wait_time` | `wait_time_2` | `schedule` | `creator`.
- Filter — considerably more than a first pass suggests: `client_id`, `task_id`, `task_type_id`, `task_type_name` (exact, the denormalized name), `status`, `creator`, `client_pull_ip` (exact), `client_response_ip` (exact), `has_response` (boolean), `response_contains` (case-insensitive partial match on `response`), `context_contains` (case-insensitive partial match on `task_context`), `wait_time`/`wait_time_min`/`wait_time_max`, `wait_time_2`/`wait_time_2_min`/`wait_time_2_max`, `createdAfter`/`createdBefore`, `send_time_after`/`send_time_before`, `response_time_after`/`response_time_before`, `schedule_after`/`schedule_before`, `has_schedule` (boolean). ⚠ **Correction:** the earlier draft claimed `response`, `wait_time`, `send_time`, `response_time`, `client_pull_ip`, and `client_response_ip` had no server-side filter and needed a client-side workaround — all of them are covered above (`response` via the `response_contains` partial match, the rest as exact/range filters). Drop the workaround and wire the filter bar to these directly.
- Search: `GET /admin/tasks/search?q=`.

**Right — Task detail** (full `response` text, no truncation):
- Editable via `PatchTaskRequest` (`response`, `status`, `send_time`, `response_time`, `task_context`, `wait_time`, `wait_time_2`, `client_pull_ip`, `client_response_ip`, `schedule`) → `PATCH /admin/tasks/{task_id}`.
- Per your rule: **disable all edit controls once `status !== "not_sent"` / `"scheduled"`** (i.e. once it's `sent` or `completed`). ⚠ Note: this is a UI-side convention you're asking for — the API's documented `400` cases only explicitly block moving a task *into* `scheduled` after creation and changing `schedule` on a non-scheduled task. It may not itself reject other edits to a sent task, so enforce the freeze in the frontend and don't rely on the backend to reject it.

## Page 6 — Downloads (`/downloads`)

⚠ **Correction (swagger update):** the earlier draft said `GET /admin/files/downloadable` only supported `page`/`pageSize` and had you do sort/filter/search client-side — a proper query endpoint has been added since. Use `GET /admin/files/downloadable/query` for the table instead: filters `file_id` (exact), `file_name` (exact), `file_name_contains` (partial), `content_type` (exact), `content_type_contains` (partial), `uploaded_by` (exact), `uploaded_by_contains` (partial), `size_bytes_min`/`size_bytes_max`, `uploaded_time_after`/`uploaded_time_before`; sort `sortBy` = `uploaded_time` (default) | `file_name` | `content_type` | `uploaded_by` | `size_bytes`. Search box: `GET /admin/files/downloadable/search?q=`. There's still no update endpoint for file metadata, so keep the info panel **read-only** — nothing here needs a PATCH.

**Left: Files table** (`DownloadableFileResponse`: `file_name`, `content_type`, `size_bytes`, `uploaded_by`, `uploaded_time`)
- "Upload new file" button → multipart `POST /admin/files/downloadable`.
- **Delete** button per row → `DELETE /admin/files/downloadable/{file_id}`. ⚠ **Gap (missing from the original draft):** this endpoint exists but wasn't specified — without it there's no way to remove a file. It returns `409` ("Active download link(s) still reference this file; expire them first.") if any of its links are still active; surface that message and point the admin at the file's links sub-table rather than trying to auto-expire on their behalf.
- Manual reload + 5s polling.
- Row click expands a nested sub-table of that file's links: `GET /admin/files/downloadable/links/query?file_id=...` (`DownloadLinkResponse`: `link_id`, `token`, `client_id`, `created_by`, `created_time`, `expires_time`, `status`, `download_url`). ⚠ **Correction:** the earlier draft said only `created_time` sort and only `file_id`/`client_id`/`status` filters were supported — the actual set is bigger. Sort: `sortBy` = `created_time` (default) | `expires_time` | `status` | `created_by`. Filter: `link_id`, `file_id`, `client_id`, `created_by`, `status` (`active`\|`expired`), `created_time_after`/`created_time_before`, `expires_time_after`/`expires_time_before`, `has_expiry` (boolean).

**Right — contextual detail panel:**
- **File selected:** read-only info display (see Gap above — there's no metadata-edit endpoint, and no admin-facing "download this file back" endpoint either; the only way to retrieve the bytes is via a download link/token, same as a client would) + a "Create link" form (`CreateDownloadLinkRequest`: `expires_time`, optional `client_id`) → `POST /admin/files/downloadable/{file_id}/links`.
- **Link selected (from a file's sub-table):** read-only link info (⚠ no update endpoint for links either — only expiry) + an **Expire** button → `POST /admin/files/downloadable/links/{link_id}/expire`.

## Page 7 — Uploads (`/uploads`)

**Left: Upload links table** (`UploadLinkResponse`: `link_id`, `token`, `client_id`, `created_by`, `created_time`, `expires_time`, `status`, `upload_url`)
- "Create upload link" form at top (`CreateUploadLinkRequest`: `client_id` [required, select from clients], `expires_time` [optional]) → `POST /admin/files/uploadable/links`. ⚠ Note: unlike some upload-link systems, there's no `max_usage_count`/`suggested_file_name` field here — upload links are inherently single-use per the backend design, so don't build inputs for fields that don't exist.
- Data: `GET /admin/files/uploadable/links/query`. Manual reload + 5s polling. ⚠ **Correction:** the earlier draft said only `created_time` sort and only `client_id`/`status` filters were supported — the actual set is bigger. Sort: `sortBy` = `created_time` (default) | `expires_time` | `status` | `client_id` | `created_by`. Filter: `link_id`, `client_id`, `created_by`, `status` (`active`\|`expired`\|`used`), `created_time_after`/`created_time_before`, `expires_time_after`/`expires_time_before`, `has_expiry` (boolean).

**Right — Upload link detail:**
- Read-only info (⚠ no update endpoint — link fields aren't editable, only expirable) + **Expire** button → `POST /admin/files/uploadable/links/{link_id}/expire`.
- "Files uploaded through this link" (`UploadedFileResponse`: `file_id`, `client_id`, `file_name`, `content_type`, `size_bytes`, `uploaded_time`): `GET /admin/files/uploadable/query?upload_link_id={link_id}`. ⚠ **Correction:** the earlier draft said there was no `upload_link_id` filter and worked around it via `client_id` — there **is** a direct, exact-match `upload_link_id` filter; query by it directly and drop the workaround. (The same endpoint also supports `file_id`, `client_id`, `file_name`, `file_name_contains`, `content_type`, `size_bytes_min`/`size_bytes_max`, `uploaded_time_after`/`uploaded_time_before`, and `sortBy` = `uploaded_time` (default) | `file_name` | `client_id` | `size_bytes` | `content_type`, useful if you ever want a standalone "all uploaded files" view — this page only needs the `upload_link_id` scoping.)
- Per uploaded file: **Download** button → `GET /admin/files/uploadable/{file_id}/download` (raw bytes; read the file name from the response's `Content-Disposition` header) and **Delete** button → `DELETE /admin/files/uploadable/{file_id}`. ⚠ **Gap (missing from the original draft):** both endpoints exist in the API but weren't specified — without them there's no way to retrieve or remove a file a client has uploaded.

## Page 8 — Admins (`/admins`)

⚠ **Correction (swagger update):** the earlier draft said `GET /admin/admins` had no query/search endpoint and had you do everything client-side — both have been added since. Use `GET /admin/admins/query` for the table instead: filters `username` (exact), `username_contains` (partial), `role` (exact), `is_active` (boolean), `must_change_password` (boolean), `creation_time_after`/`creation_time_before`; sort `sortBy` = `creation_time` (default) | `username` | `role` | `is_active`. Search box: `GET /admin/admins/search?q=`. The plain `GET /admin/admins` (full unpaginated array) is still there too, but there's no reason to use it now that the paginated, filterable version exists.

**Left: Admins table** (`AdminResponse`: `username`, `role`, `is_active`, `must_change_password`, `creation_time`)
- All create/edit/delete actions on this page are **superadmin-only** — hide them entirely for other roles.
- "Create admin" button → modal (`CreateAdminRequest`: `username`, `password`, `role`) → `POST /admin/admins`.
- Delete button per row → `DELETE /admin/admins/{username}` (blocked by the API — `400`/`409` — for deleting your own account or the last active superadmin; surface those errors as-is).

**Right — Edit admin** (`PatchAdminRequest`: `role`, `is_active`, `password`) via `PUT`/`PATCH /admin/admins/{username}`. `username` is immutable. ⚠ **Gap (missing from the original draft):** the API guards edits the same way it guards deletes — `400` for deactivating your own account or an invalid `role` value, `409` if the change would demote/deactivate the last active superadmin. Surface those as errors, and as a UX nicety, pre-disable the `is_active` toggle on the currently-logged-in admin's own row so the `400` case is rare rather than the default outcome of clicking it.

## Page 9 — Logs (`/logs`)

Mostly clean, but the sort/filter list in the earlier draft was incomplete — see the corrections below.

**Left: Logs table** (`LogEntryResponse`: `log_id`, `actor`, `time`, `context`, `level`)
- Data: `GET /admin/logs/query`. Manual reload (polling optional here — logs are historical, less critical to auto-refresh, but fine to include at 5s if you want parity with the other tables).
- Sort: `sortBy` = `time` (default) | `log_id` | `actor` | `level`. ⚠ **Correction:** the earlier draft omitted `log_id` and `level` as sort options.
- Filter: `log_id` (exact), `log_id_min`/`log_id_max` (range), `actor` (exact), `actor_contains` (partial, case-insensitive), `level` (`info`\|`warning`\|`error`), `context` (partial/`LIKE`-style match, aliases `q` and `context_contains` — this doubles as your search box for this page), `timeAfter`/`timeBefore` (aliases `time_after`/`after` and `time_before`/`before`). ⚠ **Correction:** the earlier draft omitted `log_id`/`log_id_min`/`log_id_max` and `actor_contains`.

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
