/**
 * Typed endpoint functions for the DoTask API v1.
 *
 * Types are generated from swagger.json (`npm run generate:types`).
 * Query-parameter interfaces mirror the documented parameters of each
 * endpoint exactly (plain query string — never a FilterQuery body).
 */
import { apiFetch, buildApiUrl, type QueryParams } from './client';
import type { components } from './schema';

export type Schemas = components['schemas'];

export type LoginRequest = Schemas['LoginRequest'];
export type LoginResponse = Schemas['LoginResponse'];
export type MessageResponse = Schemas['MessageResponse'];
export type ChangePasswordRequest = Schemas['ChangePasswordRequest'];
export type DashboardSummaryResponse = Schemas['DashboardSummaryResponse'];

export type ClientResponse = Schemas['ClientResponse'];
export type ClientPage = Schemas['ClientResponsePaginatedResponse'];
export type PatchClientRequest = Schemas['PatchClientRequest'];
export type CreateClientRequest = Schemas['CreateClientRequest'];

export type PendingClientResponse = Schemas['PendingClientResponse'];
export type PendingClientPage = Schemas['PendingClientResponsePaginatedResponse'];
export type ConfirmPendingClientRequest = Schemas['ConfirmPendingClientRequest'];

export type TaskTypeResponse = Schemas['TaskTypeResponse'];
export type TaskTypePage = Schemas['TaskTypeResponsePaginatedResponse'];
export type CreateTaskTypeRequest = Schemas['CreateTaskTypeRequest'];
export type PatchTaskTypeRequest = Schemas['PatchTaskTypeRequest'];

export type TaskAdminResponse = Schemas['TaskAdminResponse'];
export type TaskPage = Schemas['TaskAdminResponsePaginatedResponse'];
export type CreateTaskRequest = Schemas['CreateTaskRequest'];
export type PatchTaskRequest = Schemas['PatchTaskRequest'];

export type DownloadableFileResponse = Schemas['DownloadableFileResponse'];
export type DownloadableFilePage = Schemas['DownloadableFileResponsePaginatedResponse'];
export type DownloadLinkResponse = Schemas['DownloadLinkResponse'];
export type DownloadLinkPage = Schemas['DownloadLinkResponsePaginatedResponse'];
export type CreateDownloadLinkRequest = Schemas['CreateDownloadLinkRequest'];

export type UploadLinkResponse = Schemas['UploadLinkResponse'];
export type UploadLinkPage = Schemas['UploadLinkResponsePaginatedResponse'];
export type CreateUploadLinkRequest = Schemas['CreateUploadLinkRequest'];
export type UploadedFileResponse = Schemas['UploadedFileResponse'];
export type UploadedFilePage = Schemas['UploadedFileResponsePaginatedResponse'];

export type AdminResponse = Schemas['AdminResponse'];
export type AdminPage = Schemas['AdminResponsePaginatedResponse'];
export type CreateAdminRequest = Schemas['CreateAdminRequest'];
export type PatchAdminRequest = Schemas['PatchAdminRequest'];

export type LogEntryResponse = Schemas['LogEntryResponse'];
export type LogPage = Schemas['LogEntryResponsePaginatedResponse'];

export type ServerConfigResponse = Schemas['ServerConfigResponse'];
export type PatchServerConfigRequest = Schemas['PatchServerConfigRequest'];

/** Pagination + sorting parameters shared by every query/search endpoint. */
export interface PageParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const authApi = {
  login: (body: LoginRequest) =>
    apiFetch<LoginResponse>('POST', '/api/v1/admin/auth/login', {
      body,
      auth: false,
    }),
  logout: () => apiFetch<MessageResponse>('POST', '/api/v1/admin/auth/logout'),
  changePassword: (body: ChangePasswordRequest) =>
    apiFetch<void>('POST', '/api/v1/admin/me/change-password', { body }),
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export const dashboardApi = {
  summary: () =>
    apiFetch<DashboardSummaryResponse>('GET', '/api/v1/admin/dashboard/summary'),
};

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export interface ClientsQueryParams extends PageParams {
  client_id?: string;
  client_name?: string;
  client_name_contains?: string;
  status?: string;
  /** Exact match: online | offline. */
  online_status?: string;
  wait_time?: number;
  wait_time_min?: number;
  wait_time_max?: number;
  wait_time_2?: number;
  wait_time_2_min?: number;
  wait_time_2_max?: number;
  last_max_wait_time_min?: number;
  last_max_wait_time_max?: number;
  requests_count?: number;
  requests_count_min?: number;
  requests_count_max?: number;
  /** IP address or CIDR matched against client_ip_stack. */
  has_ip?: string;
  createdAfter?: string;
  createdBefore?: string;
  last_check_in_after?: string;
  last_check_in_before?: string;
  has_checked_in?: boolean;
}

export interface SearchParams extends PageParams {
  q?: string;
}

export const clientsApi = {
  query: (params: ClientsQueryParams = {}) =>
    apiFetch<ClientPage>('GET', '/api/v1/admin/clients/query', {
      params: params as QueryParams,
    }),
  search: (params: SearchParams = {}) =>
    apiFetch<ClientPage>('GET', '/api/v1/admin/clients/search', {
      params: params as QueryParams,
    }),
  get: (clientId: string) =>
    apiFetch<ClientResponse>(
      'GET',
      `/api/v1/admin/clients/${encodeURIComponent(clientId)}`,
    ),
  patch: (clientId: string, body: PatchClientRequest) =>
    apiFetch<ClientResponse>(
      'PATCH',
      `/api/v1/admin/clients/${encodeURIComponent(clientId)}`,
      { body },
    ),
  remove: (clientId: string) =>
    apiFetch<void>(
      'DELETE',
      `/api/v1/admin/clients/${encodeURIComponent(clientId)}`,
    ),
};

/* ------------------------------------------------------------------ */
/* Pending clients                                                     */
/* ------------------------------------------------------------------ */

export interface PendingClientsQueryParams extends PageParams {
  client_id?: string;
  first_request_time_after?: string;
  first_request_time_before?: string;
  last_request_time_after?: string;
  last_request_time_before?: string;
  requests_count?: number;
  requests_count_min?: number;
  requests_count_max?: number;
  /** IP address or CIDR matched against client_ip_stack. */
  has_ip?: string;
}

export const pendingClientsApi = {
  query: (params: PendingClientsQueryParams = {}) =>
    apiFetch<PendingClientPage>(
      'GET',
      '/api/v1/admin/pending-clients/query',
      { params: params as QueryParams },
    ),
  search: (params: SearchParams = {}) =>
    apiFetch<PendingClientPage>(
      'GET',
      '/api/v1/admin/pending-clients/search',
      { params: params as QueryParams },
    ),
  confirm: (clientId: string, body: ConfirmPendingClientRequest) =>
    apiFetch<ClientResponse>(
      'POST',
      `/api/v1/admin/pending-clients/${encodeURIComponent(clientId)}/confirm`,
      { body },
    ),
  reject: (clientId: string) =>
    apiFetch<void>(
      'DELETE',
      `/api/v1/admin/pending-clients/${encodeURIComponent(clientId)}`,
    ),
};

/* ------------------------------------------------------------------ */
/* Task types                                                          */
/* ------------------------------------------------------------------ */

export interface TaskTypesQueryParams extends PageParams {
  task_type_id?: number;
  task_type_name?: string;
  task_type_name_contains?: string;
  description_contains?: string;
}

export const taskTypesApi = {
  /** Full array — used to populate task_type_id selects on add-task forms. */
  list: () => apiFetch<TaskTypeResponse[]>('GET', '/api/v1/admin/task-types'),
  query: (params: TaskTypesQueryParams = {}) =>
    apiFetch<TaskTypePage>('GET', '/api/v1/admin/task-types/query', {
      params: params as QueryParams,
    }),
  search: (params: SearchParams = {}) =>
    apiFetch<TaskTypePage>('GET', '/api/v1/admin/task-types/search', {
      params: params as QueryParams,
    }),
  create: (body: CreateTaskTypeRequest) =>
    apiFetch<TaskTypeResponse>('POST', '/api/v1/admin/task-types', { body }),
  patch: (taskTypeId: number, body: PatchTaskTypeRequest) =>
    apiFetch<TaskTypeResponse>(
      'PATCH',
      `/api/v1/admin/task-types/${taskTypeId}`,
      { body },
    ),
  remove: (taskTypeId: number) =>
    apiFetch<void>('DELETE', `/api/v1/admin/task-types/${taskTypeId}`),
};

/* ------------------------------------------------------------------ */
/* Client tasks                                                        */
/* ------------------------------------------------------------------ */

export interface TasksQueryParams extends PageParams {
  task_id?: string;
  task_type_id?: number;
  task_type_name?: string;
  client_id?: string;
  status?: string;
  creator?: string;
  client_pull_ip?: string;
  client_response_ip?: string;
  has_response?: boolean;
  response_contains?: string;
  context_contains?: string;
  wait_time?: number;
  wait_time_min?: number;
  wait_time_max?: number;
  wait_time_2?: number;
  wait_time_2_min?: number;
  wait_time_2_max?: number;
  createdAfter?: string;
  createdBefore?: string;
  send_time_after?: string;
  send_time_before?: string;
  response_time_after?: string;
  response_time_before?: string;
  schedule_after?: string;
  schedule_before?: string;
  has_schedule?: boolean;
}

export const tasksApi = {
  query: (params: TasksQueryParams = {}) =>
    apiFetch<TaskPage>('GET', '/api/v1/admin/tasks/query', {
      params: params as QueryParams,
    }),
  search: (params: SearchParams = {}) =>
    apiFetch<TaskPage>('GET', '/api/v1/admin/tasks/search', {
      params: params as QueryParams,
    }),
  get: (taskId: string) =>
    apiFetch<TaskAdminResponse>(
      'GET',
      `/api/v1/admin/tasks/${encodeURIComponent(taskId)}`,
    ),
  create: (body: CreateTaskRequest) =>
    apiFetch<TaskAdminResponse>('POST', '/api/v1/admin/tasks', { body }),
  patch: (taskId: string, body: PatchTaskRequest) =>
    apiFetch<TaskAdminResponse>(
      'PATCH',
      `/api/v1/admin/tasks/${encodeURIComponent(taskId)}`,
      { body },
    ),
  remove: (taskId: string) =>
    apiFetch<void>('DELETE', `/api/v1/admin/tasks/${encodeURIComponent(taskId)}`),
};

/* ------------------------------------------------------------------ */
/* Downloadable files + download links                                 */
/* ------------------------------------------------------------------ */

export interface DownloadableFilesQueryParams extends PageParams {
  file_id?: string;
  file_name?: string;
  file_name_contains?: string;
  content_type?: string;
  content_type_contains?: string;
  uploaded_by?: string;
  uploaded_by_contains?: string;
  size_bytes_min?: number;
  size_bytes_max?: number;
  uploaded_time_after?: string;
  uploaded_time_before?: string;
}

export interface DownloadLinksQueryParams extends PageParams {
  link_id?: string;
  file_id?: string;
  client_id?: string;
  created_by?: string;
  status?: string;
  created_time_after?: string;
  created_time_before?: string;
  expires_time_after?: string;
  expires_time_before?: string;
  has_expiry?: boolean;
}

export const downloadableFilesApi = {
  query: (params: DownloadableFilesQueryParams = {}) =>
    apiFetch<DownloadableFilePage>(
      'GET',
      '/api/v1/admin/files/downloadable/query',
      { params: params as QueryParams },
    ),
  search: (params: SearchParams = {}) =>
    apiFetch<DownloadableFilePage>(
      'GET',
      '/api/v1/admin/files/downloadable/search',
      { params: params as QueryParams },
    ),
  /** multipart/form-data upload — field name `file`, max 100 MB. */
  upload: (file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return apiFetch<DownloadableFileResponse>(
      'POST',
      '/api/v1/admin/files/downloadable',
      { formData },
    );
  },
  remove: (fileId: string) =>
    apiFetch<void>(
      'DELETE',
      `/api/v1/admin/files/downloadable/${encodeURIComponent(fileId)}`,
    ),
};

export const downloadLinksApi = {
  query: (params: DownloadLinksQueryParams = {}) =>
    apiFetch<DownloadLinkPage>(
      'GET',
      '/api/v1/admin/files/downloadable/links/query',
      { params: params as QueryParams },
    ),
  create: (fileId: string, body: CreateDownloadLinkRequest) =>
    apiFetch<DownloadLinkResponse>(
      'POST',
      `/api/v1/admin/files/downloadable/${encodeURIComponent(fileId)}/links`,
      { body },
    ),
  expire: (linkId: string) =>
    apiFetch<void>(
      'POST',
      `/api/v1/admin/files/downloadable/links/${encodeURIComponent(linkId)}/expire`,
    ),
  remove: (linkId: string) =>
    apiFetch<void>(
      'DELETE',
      `/api/v1/admin/files/downloadable/links/${encodeURIComponent(linkId)}`,
    ),
};

/* ------------------------------------------------------------------ */
/* Upload links + uploaded files                                       */
/* ------------------------------------------------------------------ */

export interface UploadLinksQueryParams extends PageParams {
  link_id?: string;
  client_id?: string;
  created_by?: string;
  status?: string;
  created_time_after?: string;
  created_time_before?: string;
  expires_time_after?: string;
  expires_time_before?: string;
  has_expiry?: boolean;
}

export interface UploadedFilesQueryParams extends PageParams {
  file_id?: string;
  upload_link_id?: string;
  client_id?: string;
  file_name?: string;
  file_name_contains?: string;
  content_type?: string;
  size_bytes_min?: number;
  size_bytes_max?: number;
  uploaded_time_after?: string;
  uploaded_time_before?: string;
}

export const uploadLinksApi = {
  query: (params: UploadLinksQueryParams = {}) =>
    apiFetch<UploadLinkPage>(
      'GET',
      '/api/v1/admin/files/uploadable/links/query',
      { params: params as QueryParams },
    ),
  create: (body: CreateUploadLinkRequest) =>
    apiFetch<UploadLinkResponse>(
      'POST',
      '/api/v1/admin/files/uploadable/links',
      { body },
    ),
  expire: (linkId: string) =>
    apiFetch<void>(
      'POST',
      `/api/v1/admin/files/uploadable/links/${encodeURIComponent(linkId)}/expire`,
    ),
  remove: (linkId: string) =>
    apiFetch<void>(
      'DELETE',
      `/api/v1/admin/files/uploadable/links/${encodeURIComponent(linkId)}`,
    ),
};

export const uploadedFilesApi = {
  query: (params: UploadedFilesQueryParams = {}) =>
    apiFetch<UploadedFilePage>(
      'GET',
      '/api/v1/admin/files/uploadable/query',
      { params: params as QueryParams },
    ),
  remove: (fileId: string) =>
    apiFetch<void>(
      'DELETE',
      `/api/v1/admin/files/uploadable/${encodeURIComponent(fileId)}`,
    ),
  /**
   * Fetch file bytes (same path a client uses) and trigger a browser
   * download. Filename is read from Content-Disposition.
   */
  download: async (fileId: string): Promise<void> => {
    const { getSessionToken } = await import('@/lib/auth/storage');
    const { ApiError, buildApiUrl } = await import('./client');
    const token = getSessionToken();
    const response = await fetch(
      buildApiUrl(`/api/v1/admin/files/uploadable/${encodeURIComponent(fileId)}/download`),
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) {
      let message = `Download failed with status ${response.status}.`;
      try {
        const payload = (await response.json()) as {
          error?: { message?: string };
        };
        if (payload?.error?.message) message = payload.error.message;
      } catch {
        /* keep generic */
      }
      throw new ApiError(response.status, message);
    }
    const disposition = response.headers.get('content-disposition') ?? '';
    const match =
      /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition) ??
      /filename="?([^";]+)"?/i.exec(disposition);
    const filename = match
      ? decodeURIComponent(match[1].trim())
      : `file-${fileId}`;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  },
};

/* ------------------------------------------------------------------ */
/* Admins                                                              */
/* ------------------------------------------------------------------ */

export interface AdminsQueryParams extends PageParams {
  username?: string;
  username_contains?: string;
  role?: string;
  is_active?: boolean;
  must_change_password?: boolean;
  creation_time_after?: string;
  creation_time_before?: string;
  /** IP address or CIDR matched against admin_ip_stack. */
  has_ip?: string;
}

export const adminsApi = {
  query: (params: AdminsQueryParams = {}) =>
    apiFetch<AdminPage>('GET', '/api/v1/admin/admins/query', {
      params: params as QueryParams,
    }),
  search: (params: SearchParams = {}) =>
    apiFetch<AdminPage>('GET', '/api/v1/admin/admins/search', {
      params: params as QueryParams,
    }),
  create: (body: CreateAdminRequest) =>
    apiFetch<AdminResponse>('POST', '/api/v1/admin/admins', { body }),
  patch: (username: string, body: PatchAdminRequest) =>
    apiFetch<AdminResponse>(
      'PATCH',
      `/api/v1/admin/admins/${encodeURIComponent(username)}`,
      { body },
    ),
  remove: (username: string) =>
    apiFetch<void>('DELETE', `/api/v1/admin/admins/${encodeURIComponent(username)}`),
};

/* ------------------------------------------------------------------ */
/* Logs                                                                */
/* ------------------------------------------------------------------ */

export interface LogsQueryParams extends PageParams {
  log_id?: number;
  log_id_min?: number;
  log_id_max?: number;
  actor?: string;
  actor_contains?: string;
  /** IP address or CIDR matched against the actor's IP. */
  actor_ip?: string;
  level?: string;
  /** Partial match on context — aliases `q` / `context_contains`. */
  context?: string;
  timeAfter?: string;
  timeBefore?: string;
}

export const logsApi = {
  query: (params: LogsQueryParams = {}) =>
    apiFetch<LogPage>('GET', '/api/v1/admin/logs/query', {
      params: params as QueryParams,
    }),
};

/* ------------------------------------------------------------------ */
/* Server config                                                       */
/* ------------------------------------------------------------------ */

export const serverConfigApi = {
  get: () => apiFetch<ServerConfigResponse>('GET', '/api/v1/admin/settings'),
  patch: (body: PatchServerConfigRequest) =>
    apiFetch<ServerConfigResponse>('PATCH', '/api/v1/admin/settings', { body }),
};

/* ------------------------------------------------------------------ */
/* Backups (superadmin only — binary downloads)                        */
/* ------------------------------------------------------------------ */

/**
 * Filter values arrive as strings from the backup dialogs (the shared
 * `buildFilterParams` only produces strings); the query-string builder
 * stringifies everything, so numbers/booleans are accepted as-is too.
 */
export interface BackupClientsParams {
  password: string;
  status?: string;
  client_name_contains?: string;
  online_status?: string;
  creation_time_after?: string;
  creation_time_before?: string;
  last_check_in_after?: string;
  last_check_in_before?: string;
  has_checked_in?: string;
  requests_count_min?: number | string;
  requests_count_max?: number | string;
  wait_time_min?: number | string;
  wait_time_max?: number | string;
}

export interface BackupTasksParams {
  password: string;
  status?: string;
  client_id?: string;
  task_type_id?: number | string;
  creator?: string;
  has_response?: string;
  context_contains?: string;
  creation_time_after?: string;
  creation_time_before?: string;
  send_time_after?: string;
  send_time_before?: string;
  response_time_after?: string;
  response_time_before?: string;
  has_schedule?: string;
}

export interface BackupPendingClientsParams {
  password: string;
  client_id?: string;
  client_id_contains?: string;
  first_request_time_after?: string;
  first_request_time_before?: string;
  last_request_time_after?: string;
  last_request_time_before?: string;
  requests_count_min?: number | string;
  requests_count_max?: number | string;
}

/**
 * Extracts the file name the server sent in `Content-Disposition`.
 * Handles `filename*=UTF-8''name` (RFC 5987, preferred) and plain
 * `filename=name` / `filename="name"`. Returns null when the header
 * carries no name.
 */
function filenameFromDisposition(disposition: string): string | null {
  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(disposition);
  if (star) {
    const raw = star[1].trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1].trim() : null;
}

/**
 * Shared download flow for every backup endpoint: build the query string,
 * fetch the binary response with the admin token, then trigger a browser
 * download. The file is saved under the EXACT name from the response's
 * Content-Disposition header — nothing is hardcoded client-side.
 */
async function downloadBackupFile(path: string, params: object): Promise<void> {
  const { getSessionToken } = await import('@/lib/auth/storage');
  const { ApiError } = await import('./client');
  const token = getSessionToken();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  const response = await fetch(`${buildApiUrl(path)}${qs ? `?${qs}` : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = `Backup failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (payload?.error?.message) message = payload.error.message;
    } catch {
      /* keep generic */
    }
    throw new ApiError(response.status, message);
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = filenameFromDisposition(disposition) ?? path.split('/').pop() ?? 'backup';
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export interface BackupLogsParams {
  password: string;
  log_id?: number | string;
  log_id_min?: number | string;
  log_id_max?: number | string;
  actor?: string;
  actor_contains?: string;
  actor_ip?: string;
  level?: string;
  context?: string;
  timeAfter?: string;
  timeBefore?: string;
  sortBy?: string;
  sortDir?: string;
}

export const backupApi = {
  clients: (params: BackupClientsParams) =>
    downloadBackupFile('/api/v1/admin/backup/clients', params),
  tasks: (params: BackupTasksParams) =>
    downloadBackupFile('/api/v1/admin/backup/tasks', params),
  pendingClients: (params: BackupPendingClientsParams) =>
    downloadBackupFile('/api/v1/admin/backup/pending-clients', params),
  uploadedFiles: (password: string) =>
    downloadBackupFile('/api/v1/admin/backup/uploaded-files', { password }),
  full: (password: string) => downloadBackupFile('/api/v1/admin/backup/full', { password }),
  taskTypes: (password: string) =>
    downloadBackupFile('/api/v1/admin/backup/task-types', { password }),
  logs: (params: BackupLogsParams) => downloadBackupFile('/api/v1/admin/backup/logs', params),
  /** multipart/form-data restore — field `file`, max 100 MB. */
  restoreTaskTypes: async (file: File, password: string, overwrite: boolean): Promise<void> => {
    const { getSessionToken } = await import('@/lib/auth/storage');
    const { ApiError } = await import('./client');
    const token = getSessionToken();
    const formData = new FormData();
    formData.set('file', file);
    const query = new URLSearchParams({ password, overwrite: String(overwrite) });
    const restoreQuery = query.toString();
    const response = await fetch(
      `${buildApiUrl('/api/v1/admin/backup/task-types/restore')}${
        restoreQuery ? `?${restoreQuery}` : ''
      }`,
      {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      let message = `Restore failed with status ${response.status}.`;
      try {
        const payload = (await response.json()) as { error?: { message?: string } };
        if (payload?.error?.message) message = payload.error.message;
      } catch {
        /* keep generic */
      }
      throw new ApiError(response.status, message);
    }
  },
};
