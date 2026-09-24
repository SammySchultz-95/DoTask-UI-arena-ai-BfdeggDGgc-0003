/**
 * Local DoTask dev backend — a self-contained, in-memory implementation of
 * the /api/v1/admin API from swagger.json, used to run the panel in the
 * sandbox live preview (no real backend is available here).
 *
 * Run: node dev-backend/server.js  (listens on 127.0.0.1:8080)
 * Panel: API_PROXY_TARGET=http://127.0.0.1:8080 npm run dev|start
 *
 * Seeded accounts:
 *   admin/admin123     (superadmin)
 *   operator/operator123 (normaladmin)
 *   viewer/viewer123   (readonlyadmin, must_change_password=true)
 */
'use strict';

const http = require('http');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8080);
const now = () => new Date().toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400_000).toISOString();
const daysAhead = (d) => new Date(Date.now() + d * 86400_000).toISOString();

/* ------------------------------------------------------------------ */
/* In-memory state                                                     */
/* ------------------------------------------------------------------ */

const state = {
  admins: [
    {
      username: 'admin',
      password: 'admin123',
      role: 'superadmin',
      is_active: true,
      must_change_password: false,
      creation_time: daysAgo(120),
      admin_ip_stack: ['10.0.0.5'],
    },
    {
      username: 'operator',
      password: 'operator123',
      role: 'normaladmin',
      is_active: true,
      must_change_password: false,
      creation_time: daysAgo(60),
      admin_ip_stack: ['10.0.0.6'],
    },
    {
      username: 'viewer',
      password: 'viewer123',
      role: 'readonlyadmin',
      is_active: true,
      must_change_password: true,
      creation_time: daysAgo(30),
      admin_ip_stack: [],
    },
  ],
  clients: [
    {
      client_id: 'c-0001', client_name: 'Office-1', creation_time: daysAgo(90),
      last_check_in: hoursAgo(0.05), requests_count: 48211,
      client_ip_stack: ['192.168.1.11', '192.168.1.10', '10.0.0.11'],
      wait_time: 5000, wait_time_2: 7000, status: 'running',
      last_max_wait_time: 7000, online_status: 'online',
    },
    {
      client_id: 'c-0002', client_name: 'Office-2', creation_time: daysAgo(85),
      last_check_in: hoursAgo(2.3), requests_count: 30112,
      client_ip_stack: ['192.168.1.12'],
      wait_time: 6000, wait_time_2: 9000, status: 'running',
      last_max_wait_time: 9000, online_status: 'offline',
    },
    {
      client_id: 'c-0003', client_name: 'Warehouse', creation_time: daysAgo(40),
      last_check_in: hoursAgo(0.01), requests_count: 998,
      client_ip_stack: ['172.16.4.21', '172.16.4.20'],
      wait_time: 10000, wait_time_2: 15000, status: 'running',
      last_max_wait_time: 15000, online_status: 'online',
    },
    {
      client_id: 'c-0004', client_name: 'Laptop-1', creation_time: daysAgo(20),
      last_check_in: daysAgo(3), requests_count: 1560,
      client_ip_stack: ['10.20.0.44'],
      wait_time: 5000, wait_time_2: 5000, status: 'suspended',
      last_max_wait_time: 5000, online_status: 'offline',
    },
    {
      client_id: 'c-0005', client_name: 'Kiosk', creation_time: daysAgo(15),
      last_check_in: daysAgo(9), requests_count: 74,
      client_ip_stack: ['172.16.9.9'],
      wait_time: 8000, wait_time_2: 8000, status: 'shutdown',
      last_max_wait_time: 8000, online_status: 'offline',
    },
    {
      client_id: 'c-0006', client_name: 'Home-1', creation_time: daysAgo(5),
      last_check_in: hoursAgo(0.02), requests_count: 230,
      client_ip_stack: ['88.15.20.3', '88.15.20.1'],
      wait_time: 5000, wait_time_2: 12000, status: 'running',
      last_max_wait_time: 12000, online_status: 'online',
    },
  ],
  pending: [
    {
      client_id: 'p-1001', first_request_time: hoursAgo(0.1),
      last_request_time: hoursAgo(0.02), requests_count: 12,
      client_ip_stack: ['192.168.50.5', '192.168.50.4'],
    },
    {
      client_id: 'p-1002', first_request_time: hoursAgo(5),
      last_request_time: hoursAgo(1.4), requests_count: 41,
      client_ip_stack: ['10.9.9.9'],
    },
    {
      client_id: 'p-1003', first_request_time: daysAgo(2),
      last_request_time: hoursAgo(3), requests_count: 8,
      client_ip_stack: ['172.31.1.100', '172.31.1.101'],
    },
  ],
  taskTypes: [
    { task_type_id: 1, task_type_name: 'Screenshot', description: 'Capture the current desktop and send it back.' },
    { task_type_id: 2, task_type_name: 'Copy files', description: null },
    { task_type_id: 3, task_type_name: 'Run diagnostic', description: 'Collect system diagnostics (CPU, RAM, disk, network) and report them.' },
    { task_type_id: 4, task_type_name: 'Clean cache', description: null },
  ],
  tasks: [
    {
      task_id: 't-9001', task_type_id: 1, client_id: 'c-0001',
      task_context: 'Full primary monitor, PNG.',
      wait_time: 5000, wait_time_2: 7000, use_schedule: false, schedule: null,
      status: 'completed', creator: 'admin', creation_time: daysAgo(1),
      send_time: daysAgo(0.98), response_time: daysAgo(0.96),
      response: 'OK base64: iVBORw0KGgoAAAANSUhEUg==',
      client_pull_ip: '192.168.1.11', client_response_ip: '192.168.1.11',
    },
    {
      task_id: 't-9002', task_type_id: 2, client_id: 'c-0001',
      task_context: 'Copy C:\\Reports to D:\\Backup',
      wait_time: 6000, wait_time_2: 6000, use_schedule: false, schedule: null,
      status: 'sent', creator: 'operator', creation_time: daysAgo(0.5),
      send_time: daysAgo(0.49), response_time: null, response: null,
      client_pull_ip: '192.168.1.11', client_response_ip: null,
    },
    {
      task_id: 't-9003', task_type_id: 3, client_id: 'c-0003',
      task_context: 'Warehouse rack diagnostics',
      wait_time: 10000, wait_time_2: 15000, use_schedule: false, schedule: null,
      status: 'not_sent', creator: 'admin', creation_time: hoursAgo(4),
      send_time: null, response_time: null, response: null,
      client_pull_ip: null, client_response_ip: null,
    },
    {
      task_id: 't-9004', task_type_id: 4, client_id: 'c-0002',
      task_context: null,
      wait_time: 5000, wait_time_2: 5000, use_schedule: true,
      schedule: daysAhead(1),
      status: 'scheduled', creator: 'operator', creation_time: hoursAgo(6),
      send_time: null, response_time: null, response: null,
      client_pull_ip: null, client_response_ip: null,
    },
    {
      task_id: 't-9005', task_type_id: 1, client_id: 'c-0006',
      task_context: 'Both monitors',
      wait_time: 5000, wait_time_2: 12000, use_schedule: false, schedule: null,
      status: 'completed', creator: 'admin', creation_time: daysAgo(3),
      send_time: daysAgo(2.9), response_time: daysAgo(2.8),
      response: 'OK base64: iVBORw0KGgoAAAANSUhEUg==',
      client_pull_ip: '88.15.20.3', client_response_ip: '88.15.20.3',
    },
    {
      task_id: 't-9006', task_type_id: 2, client_id: 'c-0003',
      task_context: 'Sync folder /srv/incoming -> /srv/archive',
      wait_time: 10000, wait_time_2: 10000, use_schedule: false, schedule: null,
      status: 'sent', creator: 'admin', creation_time: hoursAgo(2),
      send_time: hoursAgo(1.9), response_time: null, response: null,
      client_pull_ip: '172.16.4.21', client_response_ip: null,
    },
    {
      task_id: 't-9007', task_type_id: 3, client_id: 'c-0004',
      task_context: 'Before suspension cleanup check',
      wait_time: 5000, wait_time_2: 5000, use_schedule: false, schedule: null,
      status: 'completed', creator: 'operator', creation_time: daysAgo(5),
      send_time: daysAgo(5), response_time: daysAgo(4.9),
      response: 'CPU 12%, RAM 40%, DISK OK, NET OK',
      client_pull_ip: '10.20.0.44', client_response_ip: '10.20.0.44',
    },
    {
      task_id: 't-9008', task_type_id: 1, client_id: 'c-0001',
      task_context: 'Second attempt after kiosk reset',
      wait_time: 5000, wait_time_2: 7000, use_schedule: false, schedule: null,
      status: 'not_sent', creator: 'admin', creation_time: hoursAgo(1),
      send_time: null, response_time: null, response: null,
      client_pull_ip: null, client_response_ip: null,
    },
  ],
  downloadFiles: [
    {
      file_id: 'f-2001', file_name: 'installer-2.3.1.exe',
      content_type: 'application/octet-stream', size_bytes: 1048576,
      uploaded_by: 'admin', uploaded_time: daysAgo(12),
    },
    {
      file_id: 'f-2002', file_name: 'readme.txt',
      content_type: 'text/plain', size_bytes: 2048,
      uploaded_by: 'operator', uploaded_time: daysAgo(7),
    },
  ],
  downloadLinks: [
    {
      link_id: 'l-3001', file_id: 'f-2001', client_id: 'c-0001',
      created_by: 'admin', created_time: daysAgo(10),
      expires_time: daysAhead(7), status: 'active',
      download_url: 'https://dotask.local/d/l-3001',
    },
    {
      link_id: 'l-3002', file_id: 'f-2001', client_id: null,
      created_by: 'admin', created_time: daysAgo(20),
      expires_time: daysAgo(3), status: 'expired',
      download_url: 'https://dotask.local/d/l-3002',
    },
    {
      link_id: 'l-3003', file_id: 'f-2002', client_id: null,
      created_by: 'operator', created_time: daysAgo(6),
      expires_time: null, status: 'active',
      download_url: 'https://dotask.local/d/l-3003',
    },
  ],
  uploadLinks: [
    {
      link_id: 'u-4001', client_id: 'c-0003', created_by: 'admin',
      created_time: daysAgo(2), expires_time: daysAhead(1), status: 'active',
      upload_url: 'https://dotask.local/u/u-4001',
    },
    {
      link_id: 'u-4002', client_id: 'c-0001', created_by: 'operator',
      created_time: daysAgo(4), expires_time: null, status: 'used',
      upload_url: 'https://dotask.local/u/u-4002',
    },
  ],
  uploadFiles: [
    {
      file_id: 'uf-5001', upload_link_id: 'u-4001', client_id: 'c-0003',
      file_name: 'scan-result.zip', content_type: 'application/zip',
      size_bytes: 524288, uploaded_time: hoursAgo(1),
    },
    {
      file_id: 'uf-5002', upload_link_id: 'u-4002', client_id: 'c-0001',
      file_name: 'report.txt', content_type: 'text/plain',
      size_bytes: 8192, uploaded_time: daysAgo(3),
    },
  ],
  logs: [
    { log_id: 1001, actor: 'admin', actor_ip: '10.0.0.5', level: 'info', context: 'Admin login successful (admin).', time: hoursAgo(26) },
    { log_id: 1002, actor: 'c-0001', actor_ip: '192.168.1.11', level: 'info', context: 'Client pull: delivered task t-9001.', time: daysAgo(0.98) },
    { log_id: 1003, actor: 'c-0001', actor_ip: '192.168.1.11', level: 'info', context: 'Task t-9001 completed — response received (48 KB).', time: daysAgo(0.96) },
    { log_id: 1004, actor: 'server', actor_ip: null, level: 'warning', context: 'Client c-0005 marked shutdown; pulls now return 0:0.', time: daysAgo(9) },
    { log_id: 1005, actor: 'operator', actor_ip: '10.0.0.6', level: 'info', context: 'Download link l-3003 created for file f-2002.', time: daysAgo(6) },
    { log_id: 1006, actor: 'p-1001', actor_ip: '192.168.50.5', level: 'warning', context: 'Unknown client_id p-1001 — added to pending list (request 1).', time: hoursAgo(0.1) },
    { log_id: 1007, actor: 'admin', actor_ip: '10.0.0.5', level: 'info', context: 'Task t-9008 created for client c-0001 (type 1).', time: hoursAgo(1) },
    { log_id: 1008, actor: 'c-0003', actor_ip: '172.16.4.21', level: 'info', context: 'Upload link u-4001 used: file scan-result.zip (524 KB).', time: hoursAgo(1) },
    { log_id: 1009, actor: 'server', actor_ip: null, level: 'error', context: 'Backup job failed: password mismatch for scope "tasks".', time: hoursAgo(12) },
    { log_id: 1010, actor: 'viewer', actor_ip: '10.0.0.9', level: 'warning', context: 'Rejected admin list access for readonlyadmin (visibility rules).', time: hoursAgo(13) },
    { log_id: 1011, actor: 'admin', actor_ip: '10.0.0.5', level: 'info', context: 'Server config updated: default_response_wait_time=5000, default_response_wait_time_2=7000.', time: daysAgo(2) },
    { log_id: 1012, actor: 'c-0006', actor_ip: '88.15.20.3', level: 'info', context: 'Client pull: no task, waited 12000 ms.', time: hoursAgo(0.02) },
    { log_id: 1013, actor: 'operator', actor_ip: '10.0.0.6', level: 'info', context: 'Task t-9004 scheduled for 2026-09-25 (client c-0002).', time: hoursAgo(6) },
    { log_id: 1014, actor: 'server', actor_ip: null, level: 'info', context: 'Daily summary: 6 clients, 48211 pulls in the last 24 h.', time: hoursAgo(20) },
    { log_id: 1015, actor: 'admin', actor_ip: '10.0.0.5', level: 'info', context: 'Upload link u-4001 created for client c-0003.', time: daysAgo(2) },
    { log_id: 1016, actor: 'p-1002', actor_ip: '10.9.9.9', level: 'warning', context: 'Unknown client_id p-1002 — added to pending list (request 41).', time: hoursAgo(1.4) },
    { log_id: 1017, actor: 'viewer', actor_ip: '10.0.0.9', level: 'error', context: 'Login failed for unknown user "root".', time: hoursAgo(30) },
    { log_id: 1018, actor: 'c-0004', actor_ip: '10.20.0.44', level: 'warning', context: 'Client suspended by admin; pending task t-9007 excluded from delivery.', time: daysAgo(3) },
  ],
  settings: { default_response_wait_time: 5000, default_response_wait_time_2: 7000 },
  tokens: new Map(), // token -> username
  nextLogId: 1019,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function send(res, status, payload, headers = {}) {
  const body =
    payload === undefined
      ? ''
      : typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);
  res.writeHead(status, {
    'content-type':
      typeof payload === 'string' && !headers['content-type']
        ? 'text/plain'
        : 'application/json',
    ...headers,
    ...(body ? { 'content-length': Buffer.byteLength(body) } : {}),
  });
  res.end(body);
}

function fail(res, status, code, message) {
  send(res, status, { error: { code, message } });
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function makeToken(username) {
  const token = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    username,
    sub: username,
    exp: Math.floor(Date.now() / 1000) + 86400,
  })}.${crypto.randomBytes(16).toString('base64url')}`;
  state.tokens.set(token, username);
  return token;
}

function adminPublic(a) {
  return {
    username: a.username,
    role: a.role,
    is_active: a.is_active,
    must_change_password: a.must_change_password,
    creation_time: a.creation_time,
    admin_ip_stack: a.admin_ip_stack,
  };
}

function taskTypePublic(t) {
  return {
    task_type_id: t.task_type_id,
    task_type_name: t.task_type_name,
    description: t.description,
  };
}

function taskPublic(t) {
  const type = state.taskTypes.find((x) => x.task_type_id === t.task_type_id);
  return { ...t, task_type_name: type ? type.task_type_name : null };
}

function log(actor, actor_ip, level, context) {
  state.logs.push({
    log_id: state.nextLogId++,
    actor,
    actor_ip: actor_ip ?? null,
    level,
    context,
    time: now(),
  });
}

function pageOf(res, items, query) {
  const page = Math.max(1, Number(query.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize')) || 20));
  const sortBy = query.get('sortBy');
  const sortDir = query.get('sortDir') === 'asc' ? 1 : -1;
  if (sortBy) {
    items = [...items].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return (av < bv ? -1 : 1) * sortDir;
    });
  }
  const start = (page - 1) * pageSize;
  send(res, 200, {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalCount: items.length,
  });
}

const asBool = (v) => (v === 'true' ? true : v === 'false' ? false : undefined);
const num = (v) => (v === null || v === undefined || v === '' ? undefined : Number(v));

function ipMatches(stack, filter) {
  if (!stack || !stack.length) return false;
  const f = String(filter);
  if (f.includes('/')) {
    const [base, bits] = f.split('/');
    const toInt = (ip) =>
      ip.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
    const mask = bits === '0' ? 0 : (~0 << (32 - Number(bits))) >>> 0;
    const net = toInt(base) & mask;
    return stack.some((ip) => toInt(ip) & mask === net);
  }
  return stack.some((ip) => ip === f || ip.includes(f));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 110 * 1024 * 1024) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Minimal multipart/form-data parser — returns { fields, files }. */
function parseMultipart(buffer, contentType) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)?.[2];
  const result = { fields: {}, files: [] };
  if (!boundary) return result;
  const delim = Buffer.from(`--${boundary}`);
  const firstIdx = buffer.indexOf(delim);
  if (firstIdx === -1) return result;
  let start = firstIdx + delim.length + 2; // skip CRLF after first boundary
  while (true) {
    const next = buffer.indexOf(delim, start);
    if (next === -1) break;
    const part = buffer.subarray(start, next);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const head = part.subarray(0, headerEnd).toString();
      let body = part.subarray(headerEnd + 4);
      // multipart separates each part body from the next boundary with \r\n
      if (body.length >= 2 && body[body.length - 2] === 13 && body[body.length - 1] === 10) {
        body = body.subarray(0, body.length - 2);
      }
      const name = /name="([^"]*)"/i.exec(head)?.[1];
      const filename = /filename="([^"]*)"/i.exec(head)?.[1];
      if (name) {
        if (filename !== undefined) result.files.push({ name, filename, data: body });
        else result.fields[name] = body.toString();
      }
    }
    start = next + delim.length + 2;
    if (buffer.subarray(start - 2, start).toString() === '--') break;
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Filters per endpoint (mirroring the documented query parameters)    */
/* ------------------------------------------------------------------ */

function filterClients(q) {
  return state.clients.filter((c) => {
    if (q.get('client_id') && c.client_id !== q.get('client_id')) return false;
    if (q.get('client_name') && c.client_name !== q.get('client_name')) return false;
    if (q.get('client_name_contains') && !(c.client_name ?? '').toLowerCase().includes(q.get('client_name_contains').toLowerCase())) return false;
    if (q.get('status') && c.status !== q.get('status')) return false;
    if (q.get('online_status') && c.online_status !== q.get('online_status')) return false;
    if (q.has('wait_time') && num(q.get('wait_time')) !== undefined && c.wait_time !== num(q.get('wait_time'))) return false;
    if (num(q.get('wait_time_min')) !== undefined && c.wait_time < num(q.get('wait_time_min'))) return false;
    if (num(q.get('wait_time_max')) !== undefined && c.wait_time > num(q.get('wait_time_max'))) return false;
    if (q.has('wait_time_2') && num(q.get('wait_time_2')) !== undefined && c.wait_time_2 !== num(q.get('wait_time_2'))) return false;
    if (num(q.get('wait_time_2_min')) !== undefined && c.wait_time_2 < num(q.get('wait_time_2_min'))) return false;
    if (num(q.get('wait_time_2_max')) !== undefined && c.wait_time_2 > num(q.get('wait_time_2_max'))) return false;
    if (num(q.get('last_max_wait_time_min')) !== undefined && (c.last_max_wait_time ?? 0) < num(q.get('last_max_wait_time_min'))) return false;
    if (num(q.get('last_max_wait_time_max')) !== undefined && (c.last_max_wait_time ?? 0) > num(q.get('last_max_wait_time_max'))) return false;
    if (q.has('requests_count') && num(q.get('requests_count')) !== undefined && c.requests_count !== num(q.get('requests_count'))) return false;
    if (num(q.get('requests_count_min')) !== undefined && c.requests_count < num(q.get('requests_count_min'))) return false;
    if (num(q.get('requests_count_max')) !== undefined && c.requests_count > num(q.get('requests_count_max'))) return false;
    if (q.get('has_ip') && !ipMatches(c.client_ip_stack, q.get('has_ip'))) return false;
    if (q.get('createdAfter') && c.creation_time < q.get('createdAfter')) return false;
    if (q.get('createdBefore') && c.creation_time > q.get('createdBefore')) return false;
    if (q.get('last_check_in_after') && (c.last_check_in ?? '') < q.get('last_check_in_after')) return false;
    if (q.get('last_check_in_before') && (c.last_check_in ?? '') > q.get('last_check_in_before')) return false;
    const hci = asBool(q.get('has_checked_in'));
    if (hci !== undefined && (c.last_check_in ? true : false) !== hci) return false;
    return true;
  });
}

function filterPending(q) {
  return state.pending.filter((p) => {
    if (q.get('client_id') && p.client_id !== q.get('client_id')) return false;
    if (q.get('client_id_contains') && !p.client_id.toLowerCase().includes(q.get('client_id_contains').toLowerCase())) return false;
    if (q.get('first_request_time_after') && p.first_request_time < q.get('first_request_time_after')) return false;
    if (q.get('first_request_time_before') && p.first_request_time > q.get('first_request_time_before')) return false;
    if (q.get('last_request_time_after') && p.last_request_time < q.get('last_request_time_after')) return false;
    if (q.get('last_request_time_before') && p.last_request_time > q.get('last_request_time_before')) return false;
    if (num(q.get('requests_count')) !== undefined && p.requests_count !== num(q.get('requests_count'))) return false;
    if (num(q.get('requests_count_min')) !== undefined && p.requests_count < num(q.get('requests_count_min'))) return false;
    if (num(q.get('requests_count_max')) !== undefined && p.requests_count > num(q.get('requests_count_max'))) return false;
    if (q.get('has_ip') && !ipMatches(p.client_ip_stack, q.get('has_ip'))) return false;
    return true;
  });
}

function filterTaskTypes(q) {
  return state.taskTypes.filter((t) => {
    if (q.has('task_type_id') && num(q.get('task_type_id')) !== undefined && t.task_type_id !== num(q.get('task_type_id'))) return false;
    if (q.get('task_type_name') && t.task_type_name !== q.get('task_type_name')) return false;
    if (q.get('task_type_name_contains') && !(t.task_type_name ?? '').toLowerCase().includes(q.get('task_type_name_contains').toLowerCase())) return false;
    if (q.get('description_contains') && !(t.description ?? '').toLowerCase().includes(q.get('description_contains').toLowerCase())) return false;
    return true;
  });
}

function filterTasks(q) {
  const types = state.taskTypes;
  return state.tasks.filter((t) => {
    if (q.get('task_id') && t.task_id !== q.get('task_id')) return false;
    if (q.has('task_type_id') && num(q.get('task_type_id')) !== undefined && t.task_type_id !== num(q.get('task_type_id'))) return false;
    if (q.get('task_type_name') && taskPublic(t).task_type_name !== q.get('task_type_name')) return false;
    if (q.get('client_id') && t.client_id !== q.get('client_id')) return false;
    if (q.get('status') && t.status !== q.get('status')) return false;
    if (q.get('creator') && t.creator !== q.get('creator')) return false;
    if (q.get('client_pull_ip') && t.client_pull_ip !== q.get('client_pull_ip')) return false;
    if (q.get('client_response_ip') && t.client_response_ip !== q.get('client_response_ip')) return false;
    const hr = asBool(q.get('has_response'));
    if (hr !== undefined && (t.response ? true : false) !== hr) return false;
    if (q.get('response_contains') && !(t.response ?? '').toLowerCase().includes(q.get('response_contains').toLowerCase())) return false;
    if (q.get('context_contains') && !(t.task_context ?? '').toLowerCase().includes(q.get('context_contains').toLowerCase())) return false;
    if (num(q.get('wait_time')) !== undefined && t.wait_time !== num(q.get('wait_time'))) return false;
    if (num(q.get('wait_time_min')) !== undefined && t.wait_time < num(q.get('wait_time_min'))) return false;
    if (num(q.get('wait_time_max')) !== undefined && t.wait_time > num(q.get('wait_time_max'))) return false;
    if (num(q.get('wait_time_2')) !== undefined && t.wait_time_2 !== num(q.get('wait_time_2'))) return false;
    if (num(q.get('wait_time_2_min')) !== undefined && t.wait_time_2 < num(q.get('wait_time_2_min'))) return false;
    if (num(q.get('wait_time_2_max')) !== undefined && t.wait_time_2 > num(q.get('wait_time_2_max'))) return false;
    if (q.get('createdAfter') && t.creation_time < q.get('createdAfter')) return false;
    if (q.get('createdBefore') && t.creation_time > q.get('createdBefore')) return false;
    if (q.get('send_time_after') && (t.send_time ?? '') < q.get('send_time_after')) return false;
    if (q.get('send_time_before') && (t.send_time ?? '') > q.get('send_time_before')) return false;
    if (q.get('response_time_after') && (t.response_time ?? '') < q.get('response_time_after')) return false;
    if (q.get('response_time_before') && (t.response_time ?? '') > q.get('response_time_before')) return false;
    if (q.get('schedule_after') && (t.schedule ?? '') < q.get('schedule_after')) return false;
    if (q.get('schedule_before') && (t.schedule ?? '') > q.get('schedule_before')) return false;
    const hs = asBool(q.get('has_schedule'));
    if (hs !== undefined && (t.use_schedule ? true : false) !== hs) return false;
    return true;
  });
}

function filterDownloadFiles(q) {
  return state.downloadFiles.filter((f) => {
    if (q.get('file_id') && f.file_id !== q.get('file_id')) return false;
    if (q.get('file_name') && f.file_name !== q.get('file_name')) return false;
    if (q.get('file_name_contains') && !f.file_name.toLowerCase().includes(q.get('file_name_contains').toLowerCase())) return false;
    if (q.get('content_type') && f.content_type !== q.get('content_type')) return false;
    if (q.get('content_type_contains') && !f.content_type.toLowerCase().includes(q.get('content_type_contains').toLowerCase())) return false;
    if (q.get('uploaded_by') && f.uploaded_by !== q.get('uploaded_by')) return false;
    if (q.get('uploaded_by_contains') && !f.uploaded_by.toLowerCase().includes(q.get('uploaded_by_contains').toLowerCase())) return false;
    if (num(q.get('size_bytes_min')) !== undefined && f.size_bytes < num(q.get('size_bytes_min'))) return false;
    if (num(q.get('size_bytes_max')) !== undefined && f.size_bytes > num(q.get('size_bytes_max'))) return false;
    if (q.get('uploaded_time_after') && f.uploaded_time < q.get('uploaded_time_after')) return false;
    if (q.get('uploaded_time_before') && f.uploaded_time > q.get('uploaded_time_before')) return false;
    return true;
  });
}

function filterDownloadLinks(q) {
  return state.downloadLinks.filter((l) => {
    if (q.get('link_id') && l.link_id !== q.get('link_id')) return false;
    if (q.get('file_id') && l.file_id !== q.get('file_id')) return false;
    if (q.get('client_id') && l.client_id !== q.get('client_id')) return false;
    if (q.get('created_by') && l.created_by !== q.get('created_by')) return false;
    if (q.get('status') && l.status !== q.get('status')) return false;
    if (q.get('created_time_after') && l.created_time < q.get('created_time_after')) return false;
    if (q.get('created_time_before') && l.created_time > q.get('created_time_before')) return false;
    if (q.get('expires_time_after') && (l.expires_time ?? '') < q.get('expires_time_after')) return false;
    if (q.get('expires_time_before') && (l.expires_time ?? '') > q.get('expires_time_before')) return false;
    const he = asBool(q.get('has_expiry'));
    if (he !== undefined && (l.expires_time ? true : false) !== he) return false;
    return true;
  });
}

function filterUploadLinks(q) {
  return state.uploadLinks.filter((l) => {
    if (q.get('link_id') && l.link_id !== q.get('link_id')) return false;
    if (q.get('client_id') && l.client_id !== q.get('client_id')) return false;
    if (q.get('created_by') && l.created_by !== q.get('created_by')) return false;
    if (q.get('status') && l.status !== q.get('status')) return false;
    if (q.get('created_time_after') && l.created_time < q.get('created_time_after')) return false;
    if (q.get('created_time_before') && l.created_time > q.get('created_time_before')) return false;
    if (q.get('expires_time_after') && (l.expires_time ?? '') < q.get('expires_time_after')) return false;
    if (q.get('expires_time_before') && (l.expires_time ?? '') > q.get('expires_time_before')) return false;
    const he = asBool(q.get('has_expiry'));
    if (he !== undefined && (l.expires_time ? true : false) !== he) return false;
    return true;
  });
}

function filterUploadFiles(q) {
  return state.uploadFiles.filter((f) => {
    if (q.get('file_id') && f.file_id !== q.get('file_id')) return false;
    if (q.get('upload_link_id') && f.upload_link_id !== q.get('upload_link_id')) return false;
    if (q.get('client_id') && f.client_id !== q.get('client_id')) return false;
    if (q.get('file_name') && f.file_name !== q.get('file_name')) return false;
    if (q.get('file_name_contains') && !f.file_name.toLowerCase().includes(q.get('file_name_contains').toLowerCase())) return false;
    if (q.get('content_type') && f.content_type !== q.get('content_type')) return false;
    if (num(q.get('size_bytes_min')) !== undefined && f.size_bytes < num(q.get('size_bytes_min'))) return false;
    if (num(q.get('size_bytes_max')) !== undefined && f.size_bytes > num(q.get('size_bytes_max'))) return false;
    if (q.get('uploaded_time_after') && f.uploaded_time < q.get('uploaded_time_after')) return false;
    if (q.get('uploaded_time_before') && f.uploaded_time > q.get('uploaded_time_before')) return false;
    return true;
  });
}

function filterLogs(q) {
  return state.logs.filter((l) => {
    if (num(q.get('log_id')) !== undefined && l.log_id !== num(q.get('log_id'))) return false;
    if (num(q.get('log_id_min')) !== undefined && l.log_id < num(q.get('log_id_min'))) return false;
    if (num(q.get('log_id_max')) !== undefined && l.log_id > num(q.get('log_id_max'))) return false;
    if (q.get('actor') && l.actor !== q.get('actor')) return false;
    if (q.get('actor_contains') && !l.actor.toLowerCase().includes(q.get('actor_contains').toLowerCase())) return false;
    if (q.get('actor_ip') && l.actor_ip !== q.get('actor_ip')) return false;
    if (q.get('level') && l.level !== q.get('level')) return false;
    const ctx = q.get('context') ?? q.get('q') ?? q.get('context_contains');
    if (ctx && !l.context.toLowerCase().includes(ctx.toLowerCase())) return false;
    const after = q.get('timeAfter') ?? q.get('time_after') ?? q.get('after');
    if (after && l.time < after) return false;
    const before = q.get('timeBefore') ?? q.get('time_before') ?? q.get('before');
    if (before && l.time > before) return false;
    return true;
  });
}

function filterAdmins(actor, q) {
  // Visibility rules: readonlyadmins see no admins at all.
  if (actor.role === 'readonlyadmin') return [];
  return state.admins.filter((a) => {
    if (q.get('username') && a.username !== q.get('username')) return false;
    if (q.get('username_contains') && !a.username.toLowerCase().includes(q.get('username_contains').toLowerCase())) return false;
    if (q.get('role') && a.role !== q.get('role')) return false;
    const ia = asBool(q.get('is_active'));
    if (ia !== undefined && a.is_active !== ia) return false;
    const mcp = asBool(q.get('must_change_password'));
    if (mcp !== undefined && a.must_change_password !== mcp) return false;
    if (q.get('creation_time_after') && a.creation_time < q.get('creation_time_after')) return false;
    if (q.get('creation_time_before') && a.creation_time > q.get('creation_time_before')) return false;
    if (q.get('has_ip') && !ipMatches(a.admin_ip_stack, q.get('has_ip'))) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname.replace(/\/+$/, '');
    const q = url.searchParams;
    const method = req.method.toUpperCase();

    if (p === '/health') return send(res, 200, { status: 'ok' });

    if (!p.startsWith('/api/v1/admin/')) {
      return fail(res, 404, 'NOT_FOUND', `No such route: ${method} ${p}`);
    }

    /* ------------------------------ auth ------------------------------ */
    if (p === '/api/v1/admin/auth/login' && method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      const admin = state.admins.find((a) => a.username === body.username);
      if (!admin || admin.password !== body.password) {
        log(body.username ?? 'unknown', null, 'warning', `Login failed for user "${body.username ?? '?'}".`);
        return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
      }
      if (!admin.is_active) return fail(res, 403, 'ADMIN_DISABLED', 'This admin account is disabled.');
      log(admin.username, null, 'info', `Admin login successful (${admin.username}).`);
      return send(res, 200, {
        token: makeToken(admin.username),
        role: admin.role,
        must_change_password: admin.must_change_password,
      });
    }

    // Everything else needs a valid token.
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const username = token ? state.tokens.get(token) : null;
    const actor = username ? state.admins.find((a) => a.username === username) : null;
    if (!actor) return fail(res, 401, 'UNAUTHORIZED', 'Missing/invalid token.');
    if (!actor.is_active) return fail(res, 403, 'ADMIN_DISABLED', 'This admin account is disabled.');

    if (p === '/api/v1/admin/auth/logout' && method === 'POST') {
      state.tokens.delete(token);
      log(actor.username, null, 'info', `Admin logout (${actor.username}).`);
      return send(res, 200, { message: 'Logged out.' });
    }

    if (p === '/api/v1/admin/me/change-password' && method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      if (actor.password !== body.current_password) {
        return fail(res, 400, 'BAD_PASSWORD', 'Current password is incorrect.');
      }
      if (!body.new_password || String(body.new_password).length < 6) {
        return fail(res, 400, 'WEAK_PASSWORD', 'New password must be at least 6 characters.');
      }
      actor.password = String(body.new_password);
      actor.must_change_password = false;
      log(actor.username, null, 'info', `Password changed by ${actor.username}.`);
      return send(res, 200, { message: 'Password changed.' });
    }

    if (p === '/api/v1/admin/dashboard/summary' && method === 'GET') {
      const cbs = { running: 0, shutdown: 0, suspended: 0 };
      state.clients.forEach((c) => {
        if (cbs[c.status] !== undefined) cbs[c.status] += 1;
      });
      const tbs = { scheduled: 0, not_sent: 0, sent: 0, completed: 0 };
      state.tasks.forEach((t) => {
        if (tbs[t.status] !== undefined) tbs[t.status] += 1;
      });
      return send(res, 200, {
        total_clients: state.clients.length,
        online_clients: state.clients.filter((c) => c.online_status === 'online').length,
        clients_by_status: cbs,
        tasks_by_status: tbs,
        pending_clients: state.pending.length,
        active_download_links: state.downloadLinks.filter((l) => l.status === 'active').length,
        active_upload_links: state.uploadLinks.filter((l) => l.status === 'active').length,
      });
    }

    /* ------------------------------ clients ------------------------------ */
    if (p === '/api/v1/admin/clients/query' && method === 'GET') {
      return pageOf(res, filterClients(q).map((c) => ({ ...c })), q);
    }
    if (p === '/api/v1/admin/clients/search' && method === 'GET') {
      const term = (q.get('q') ?? '').toLowerCase();
      const items = state.clients.filter(
        (c) => c.client_id.toLowerCase().includes(term) || (c.client_name ?? '').toLowerCase().includes(term),
      );
      return pageOf(res, items, q);
    }
    const clientMatch = /^\/api\/v1\/admin\/clients\/([^/]+)$/.exec(p);
    if (clientMatch) {
      const id = decodeURIComponent(clientMatch[1]);
      const client = state.clients.find((c) => c.client_id === id);
      if (method === 'GET') {
        if (!client) return fail(res, 404, 'NOT_FOUND', `Client ${id} not found.`);
        return send(res, 200, { ...client });
      }
      if (method === 'PATCH') {
        if (!client) return fail(res, 404, 'NOT_FOUND', `Client ${id} not found.`);
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        if (body.client_name !== undefined) client.client_name = body.client_name;
        if (body.wait_time !== undefined) client.wait_time = Number(body.wait_time);
        if (body.wait_time_2 !== undefined) client.wait_time_2 = Number(body.wait_time_2);
        if (body.status) {
          if (!['running', 'shutdown', 'suspended'].includes(body.status)) {
            return fail(res, 400, 'BAD_STATUS', 'status must be running, shutdown or suspended.');
          }
          client.status = body.status;
        }
        log(actor.username, null, 'info', `Client ${id} updated by ${actor.username}.`);
        return send(res, 200, { ...client });
      }
      if (method === 'DELETE') {
        if (!client) return fail(res, 404, 'NOT_FOUND', `Client ${id} not found.`);
        state.clients = state.clients.filter((c) => c.client_id !== id);
        log(actor.username, null, 'info', `Client ${id} deleted by ${actor.username}.`);
        return send(res, 204);
      }
    }
    if (p === '/api/v1/admin/clients' && method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      if (!body.client_id) return fail(res, 400, 'BAD_REQUEST', 'client_id is required.');
      if (state.clients.some((c) => c.client_id === body.client_id)) {
        return fail(res, 409, 'CONFLICT', `Client ${body.client_id} already exists.`);
      }
      const client = {
        client_id: body.client_id,
        client_name: body.client_name ?? null,
        creation_time: now(),
        last_check_in: null,
        requests_count: 0,
        client_ip_stack: [],
        wait_time: Number(body.wait_time) || state.settings.default_response_wait_time,
        wait_time_2: Number(body.wait_time_2) || state.settings.default_response_wait_time_2,
        status: 'running',
        last_max_wait_time: null,
        online_status: 'offline',
      };
      state.clients.push(client);
      log(actor.username, null, 'info', `Client ${body.client_id} created by ${actor.username}.`);
      return send(res, 201, client);
    }

    /* -------------------------- pending clients -------------------------- */
    if (p === '/api/v1/admin/pending-clients/query' && method === 'GET') {
      return pageOf(res, filterPending(q), q);
    }
    if (p === '/api/v1/admin/pending-clients/search' && method === 'GET') {
      const term = (q.get('q') ?? '').toLowerCase();
      return pageOf(res, state.pending.filter((c) => c.client_id.toLowerCase().includes(term)), q);
    }
    const pendingMatch = /^\/api\/v1\/admin\/pending-clients\/([^/]+)(\/confirm)?$/.exec(p);
    if (pendingMatch) {
      const id = decodeURIComponent(pendingMatch[1]);
      const isConfirm = Boolean(pendingMatch[2]);
      const idx = state.pending.findIndex((c) => c.client_id === id);
      if (method === 'POST' && isConfirm) {
        if (idx === -1) return fail(res, 404, 'NOT_FOUND', `Pending client ${id} not found.`);
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        state.pending.splice(idx, 1);
        const client = {
          client_id: id,
          client_name: body.client_name ?? null,
          creation_time: now(),
          last_check_in: now(),
          requests_count: 0,
          client_ip_stack: [],
          wait_time: Number(body.wait_time) || state.settings.default_response_wait_time,
          wait_time_2: Number(body.wait_time_2) || state.settings.default_response_wait_time_2,
          status: 'running',
          last_max_wait_time: null,
          online_status: 'online',
        };
        state.clients.push(client);
        log(actor.username, null, 'info', `Pending client ${id} confirmed as new client by ${actor.username}.`);
        return send(res, 201, client);
      }
      if (method === 'DELETE' && !isConfirm) {
        if (idx === -1) return fail(res, 404, 'NOT_FOUND', `Pending client ${id} not found.`);
        state.pending.splice(idx, 1);
        log(actor.username, null, 'info', `Pending client ${id} rejected by ${actor.username}.`);
        return send(res, 204);
      }
    }

    /* ---------------------------- task types ---------------------------- */
    if (p === '/api/v1/admin/task-types' && method === 'GET') {
      return send(res, 200, state.taskTypes.map(taskTypePublic));
    }
    if (p === '/api/v1/admin/task-types' && method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      const id = Number(body.task_type_id);
      if (!Number.isInteger(id)) return fail(res, 400, 'BAD_REQUEST', 'task_type_id must be an integer.');
      if (state.taskTypes.some((t) => t.task_type_id === id)) {
        return fail(res, 409, 'CONFLICT', `Task type ${id} already exists.`);
      }
      const t = {
        task_type_id: id,
        task_type_name: body.task_type_name ?? null,
        description: body.description ?? null,
      };
      state.taskTypes.push(t);
      log(actor.username, null, 'info', `Task type ${id} created by ${actor.username}.`);
      return send(res, 201, taskTypePublic(t));
    }
    if (p === '/api/v1/admin/task-types/query' && method === 'GET') {
      return pageOf(res, filterTaskTypes(q).map(taskTypePublic), q);
    }
    if (p === '/api/v1/admin/task-types/search' && method === 'GET') {
      const term = (q.get('q') ?? '').toLowerCase();
      const items = state.taskTypes.filter(
        (t) => String(t.task_type_id).includes(term) || (t.task_type_name ?? '').toLowerCase().includes(term),
      );
      return pageOf(res, items.map(taskTypePublic), q);
    }
    const typeMatch = /^\/api\/v1\/admin\/task-types\/([^/]+)$/.exec(p);
    if (typeMatch) {
      const id = Number(decodeURIComponent(typeMatch[1]));
      const t = state.taskTypes.find((x) => x.task_type_id === id);
      if (method === 'PATCH') {
        if (!t) return fail(res, 404, 'NOT_FOUND', `Task type ${id} not found.`);
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        if (body.task_type_name !== undefined) t.task_type_name = body.task_type_name;
        if (body.description !== undefined) t.description = body.description;
        log(actor.username, null, 'info', `Task type ${id} updated by ${actor.username}.`);
        return send(res, 200, taskTypePublic(t));
      }
      if (method === 'DELETE') {
        if (!t) return fail(res, 404, 'NOT_FOUND', `Task type ${id} not found.`);
        if (state.tasks.some((task) => task.task_type_id === id)) {
          return fail(res, 409, 'CONFLICT', `Task type ${id} is still referenced by tasks.`);
        }
        state.taskTypes = state.taskTypes.filter((x) => x.task_type_id !== id);
        log(actor.username, null, 'info', `Task type ${id} deleted by ${actor.username}.`);
        return send(res, 204);
      }
    }

    /* ------------------------------- tasks ------------------------------- */
    if (p === '/api/v1/admin/tasks' && method === 'GET') {
      return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Use /tasks/query or /tasks/search.');
    }
    if (p === '/api/v1/admin/tasks' && method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      if (!Number.isInteger(Number(body.task_type_id))) {
        return fail(res, 400, 'BAD_REQUEST', 'task_type_id is required.');
      }
      if (!state.taskTypes.some((t) => t.task_type_id === Number(body.task_type_id))) {
        return fail(res, 404, 'NOT_FOUND', `Task type ${body.task_type_id} not found.`);
      }
      const task = {
        task_id: `t-${9000 + state.tasks.length + 1 + Math.floor(Math.random() * 100)}`,
        task_type_id: Number(body.task_type_id),
        client_id: body.client_id ?? null,
        task_context: body.task_context ?? null,
        wait_time: Number(body.wait_time) || state.settings.default_response_wait_time,
        wait_time_2: Number(body.wait_time_2) || state.settings.default_response_wait_time_2,
        use_schedule: Boolean(body.use_schedule),
        schedule: body.use_schedule ? body.schedule ?? null : null,
        status: body.use_schedule ? 'scheduled' : 'not_sent',
        creator: actor.username,
        creation_time: now(),
        send_time: null,
        response_time: null,
        response: null,
        client_pull_ip: null,
        client_response_ip: null,
      };
      state.tasks.push(task);
      log(actor.username, null, 'info', `Task ${task.task_id} created for client ${task.client_id ?? 'n/a'} (type ${task.task_type_id}).`);
      return send(res, 201, taskPublic(task));
    }
    if (p === '/api/v1/admin/tasks/query' && method === 'GET') {
      return pageOf(res, filterTasks(q).map(taskPublic), q);
    }
    if (p === '/api/v1/admin/tasks/search' && method === 'GET') {
      const term = (q.get('q') ?? '').toLowerCase();
      const items = state.tasks.filter(
        (t) =>
          t.task_id.toLowerCase().includes(term) ||
          (t.task_context ?? '').toLowerCase().includes(term) ||
          (t.response ?? '').toLowerCase().includes(term) ||
          (t.client_id ?? '').toLowerCase().includes(term),
      );
      return pageOf(res, items.map(taskPublic), q);
    }
    const taskMatch = /^\/api\/v1\/admin\/tasks\/([^/]+)$/.exec(p);
    if (taskMatch) {
      const id = decodeURIComponent(taskMatch[1]);
      const t = state.tasks.find((x) => x.task_id === id);
      if (method === 'GET') {
        if (!t) return fail(res, 404, 'NOT_FOUND', `Task ${id} not found.`);
        return send(res, 200, taskPublic(t));
      }
      if (method === 'PATCH') {
        if (!t) return fail(res, 404, 'NOT_FOUND', `Task ${id} not found.`);
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        if (body.task_context !== undefined) t.task_context = body.task_context;
        if (body.wait_time !== undefined) t.wait_time = Number(body.wait_time);
        if (body.wait_time_2 !== undefined) t.wait_time_2 = Number(body.wait_time_2);
        if (body.schedule !== undefined) {
          t.schedule = body.schedule;
          t.use_schedule = Boolean(body.schedule);
        }
        log(actor.username, null, 'info', `Task ${id} updated by ${actor.username}.`);
        return send(res, 200, taskPublic(t));
      }
      if (method === 'DELETE') {
        if (!t) return fail(res, 404, 'NOT_FOUND', `Task ${id} not found.`);
        state.tasks = state.tasks.filter((x) => x.task_id !== id);
        log(actor.username, null, 'info', `Task ${id} deleted by ${actor.username}.`);
        return send(res, 204);
      }
    }

    /* --------------------------- downloadable files --------------------------- */
    if (p === '/api/v1/admin/files/downloadable/query' && method === 'GET') {
      return pageOf(res, filterDownloadFiles(q), q);
    }
    if (p === '/api/v1/admin/files/downloadable/search' && method === 'GET') {
      const term = (q.get('q') ?? '').toLowerCase();
      const items = state.downloadFiles.filter(
        (f) => f.file_name.toLowerCase().includes(term) || f.file_id.toLowerCase().includes(term),
      );
      return pageOf(res, items, q);
    }
    if (p === '/api/v1/admin/files/downloadable' && method === 'POST') {
      const raw = await readBody(req);
      const { files } = parseMultipart(raw, req.headers['content-type'] ?? '');
      if (!files.length) return fail(res, 400, 'BAD_REQUEST', 'Missing file part.');
      const file = files[0];
      const f = {
        file_id: `f-${Date.now().toString(36)}`,
        file_name: file.filename,
        content_type: req.headers['x-content-type'] ?? 'application/octet-stream',
        size_bytes: file.data.length,
        uploaded_by: actor.username,
        uploaded_time: now(),
      };
      state.downloadFiles.push(f);
      log(actor.username, null, 'info', `Downloadable file ${f.file_name} uploaded by ${actor.username}.`);
      return send(res, 201, f);
    }
    const dlFileMatch = /^\/api\/v1\/admin\/files\/downloadable\/([^/]+)$/.exec(p);
    if (dlFileMatch) {
      const id = decodeURIComponent(dlFileMatch[1]);
      const f = state.downloadFiles.find((x) => x.file_id === id);
      if (method === 'DELETE') {
        if (!f) return fail(res, 404, 'NOT_FOUND', `File ${id} not found.`);
        if (state.downloadLinks.some((l) => l.file_id === id && l.status === 'active')) {
          return fail(res, 409, 'CONFLICT', 'File still referenced by active download links.');
        }
        state.downloadFiles = state.downloadFiles.filter((x) => x.file_id !== id);
        log(actor.username, null, 'info', `Downloadable file ${id} deleted by ${actor.username}.`);
        return send(res, 204);
      }
    }
    if (p === '/api/v1/admin/files/downloadable/links/query' && method === 'GET') {
      return pageOf(res, filterDownloadLinks(q), q);
    }
    const dlLinkCreate = /^\/api\/v1\/admin\/files\/downloadable\/([^/]+)\/links$/.exec(p);
    if (dlLinkCreate && method === 'POST') {
      const fileId = decodeURIComponent(dlLinkCreate[1]);
      const f = state.downloadFiles.find((x) => x.file_id === fileId);
      if (!f) return fail(res, 404, 'NOT_FOUND', `File ${fileId} not found.`);
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      const l = {
        link_id: `l-${Date.now().toString(36)}`,
        file_id: fileId,
        client_id: body.client_id ?? null,
        created_by: actor.username,
        created_time: now(),
        expires_time: body.expires_time ?? null,
        status: 'active',
        download_url: `https://dotask.local/d/${''}`,
      };
      l.download_url = `https://dotask.local/d/${l.link_id}`;
      state.downloadLinks.push(l);
      log(actor.username, null, 'info', `Download link ${l.link_id} created for file ${fileId}.`);
      return send(res, 201, l);
    }
    const dlLinkMatch = /^\/api\/v1\/admin\/files\/downloadable\/links\/([^/]+)(\/expire)?$/.exec(p);
    if (dlLinkMatch) {
      const id = decodeURIComponent(dlLinkMatch[1]);
      const l = state.downloadLinks.find((x) => x.link_id === id);
      if (method === 'POST' && dlLinkMatch[2] === 'expire') {
        if (!l) return fail(res, 404, 'NOT_FOUND', `Link ${id} not found.`);
        l.status = 'expired';
        log(actor.username, null, 'info', `Download link ${id} expired by ${actor.username}.`);
        return send(res, 200, l);
      }
      if (method === 'DELETE') {
        if (!l) return fail(res, 404, 'NOT_FOUND', `Link ${id} not found.`);
        state.downloadLinks = state.downloadLinks.filter((x) => x.link_id !== id);
        log(actor.username, null, 'info', `Download link ${id} deleted by ${actor.username}.`);
        return send(res, 204);
      }
    }

    /* ----------------------------- uploadable ----------------------------- */
    if (p === '/api/v1/admin/files/uploadable/links/query' && method === 'GET') {
      return pageOf(res, filterUploadLinks(q), q);
    }
    if (p === '/api/v1/admin/files/uploadable/links' && method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      if (!body.client_id) return fail(res, 400, 'BAD_REQUEST', 'client_id is required.');
      const l = {
        link_id: `u-${Date.now().toString(36)}`,
        client_id: body.client_id,
        created_by: actor.username,
        created_time: now(),
        expires_time: body.expires_time ?? null,
        status: 'active',
        upload_url: `https://dotask.local/u/${''}`,
      };
      l.upload_url = `https://dotask.local/u/${l.link_id}`;
      state.uploadLinks.push(l);
      log(actor.username, null, 'info', `Upload link ${l.link_id} created for client ${body.client_id}.`);
      return send(res, 201, l);
    }
    const ulLinkMatch = /^\/api\/v1\/admin\/files\/uploadable\/links\/([^/]+)(\/expire)?$/.exec(p);
    if (ulLinkMatch) {
      const id = decodeURIComponent(ulLinkMatch[1]);
      const l = state.uploadLinks.find((x) => x.link_id === id);
      if (method === 'POST' && ulLinkMatch[2] === 'expire') {
        if (!l) return fail(res, 404, 'NOT_FOUND', `Link ${id} not found.`);
        l.status = 'expired';
        log(actor.username, null, 'info', `Upload link ${id} expired by ${actor.username}.`);
        return send(res, 200, l);
      }
      if (method === 'DELETE') {
        if (!l) return fail(res, 404, 'NOT_FOUND', `Link ${id} not found.`);
        state.uploadLinks = state.uploadLinks.filter((x) => x.link_id !== id);
        log(actor.username, null, 'info', `Upload link ${id} deleted by ${actor.username}.`);
        return send(res, 204);
      }
    }
    if (p === '/api/v1/admin/files/uploadable/query' && method === 'GET') {
      return pageOf(res, filterUploadFiles(q), q);
    }
    const ufMatch = /^\/api\/v1\/admin\/files\/uploadable\/([^/]+)(\/download)?$/.exec(p);
    if (ufMatch) {
      const id = decodeURIComponent(ufMatch[1]);
      const f = state.uploadFiles.find((x) => x.file_id === id);
      if (method === 'GET' && ufMatch[2] === 'download') {
        if (!f) return fail(res, 404, 'NOT_FOUND', `File ${id} not found.`);
        const content = Buffer.from(`DoTask dev backend placeholder content for ${f.file_name}`);
        return send(res, 200, content.toString('binary'), {
          'content-type': f.content_type,
          'content-disposition': `attachment; filename="${f.file_name}"`,
        });
      }
      if (method === 'DELETE') {
        if (!f) return fail(res, 404, 'NOT_FOUND', `File ${id} not found.`);
        state.uploadFiles = state.uploadFiles.filter((x) => x.file_id !== id);
        log(actor.username, null, 'info', `Uploaded file ${f.file_name} deleted by ${actor.username}.`);
        return send(res, 204);
      }
    }

    /* ------------------------------- admins ------------------------------- */
    if (p === '/api/v1/admin/admins/query' && method === 'GET') {
      return pageOf(res, filterAdmins(actor, q).map(adminPublic), q);
    }
    if (p === '/api/v1/admin/admins/search' && method === 'GET') {
      const term = (q.get('q') ?? '').toLowerCase();
      const items = filterAdmins(actor, q).filter((a) => a.username.toLowerCase().includes(term));
      return pageOf(res, items.map(adminPublic), q);
    }
    if (p === '/api/v1/admin/admins' && method === 'POST') {
      if (actor.role !== 'superadmin') {
        return fail(res, 403, 'FORBIDDEN_ROLE', 'Only superadmin can manage admins.');
      }
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      if (state.admins.some((a) => a.username === body.username)) {
        return fail(res, 409, 'CONFLICT', `Admin ${body.username} already exists.`);
      }
      const a = {
        username: body.username,
        password: body.password,
        role: body.role,
        is_active: true,
        must_change_password: true,
        creation_time: now(),
        admin_ip_stack: [],
      };
      state.admins.push(a);
      log(actor.username, null, 'info', `Admin ${body.username} created by ${actor.username}.`);
      return send(res, 201, adminPublic(a));
    }
    const adminMatch = /^\/api\/v1\/admin\/admins\/([^/]+)$/.exec(p);
    if (adminMatch) {
      const uname = decodeURIComponent(adminMatch[1]);
      const a = state.admins.find((x) => x.username === uname);
      if (method === 'PATCH') {
        if (actor.role !== 'superadmin') {
          return fail(res, 403, 'FORBIDDEN_ROLE', 'Only superadmin can manage admins.');
        }
        if (!a) return fail(res, 404, 'NOT_FOUND', `Admin ${uname} not found.`);
        if (uname === actor.username) {
          return fail(res, 400, 'BAD_REQUEST', 'You cannot modify your own account.');
        }
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        if (body.role) a.role = body.role;
        if (body.is_active !== undefined) a.is_active = Boolean(body.is_active);
        if (body.password) a.password = body.password;
        log(actor.username, null, 'info', `Admin ${uname} updated by ${actor.username}.`);
        return send(res, 200, adminPublic(a));
      }
      if (method === 'DELETE') {
        if (actor.role !== 'superadmin') {
          return fail(res, 403, 'FORBIDDEN_ROLE', 'Only superadmin can manage admins.');
        }
        if (!a) return fail(res, 404, 'NOT_FOUND', `Admin ${uname} not found.`);
        if (uname === actor.username) {
          return fail(res, 400, 'BAD_REQUEST', 'You cannot delete your own account.');
        }
        if (a.role === 'superadmin' && state.admins.filter((x) => x.role === 'superadmin').length <= 1) {
          return fail(res, 409, 'CONFLICT', 'The last superadmin cannot be deleted.');
        }
        state.admins = state.admins.filter((x) => x.username !== uname);
        log(actor.username, null, 'info', `Admin ${uname} deleted by ${actor.username}.`);
        return send(res, 204);
      }
    }

    /* -------------------------------- logs -------------------------------- */
    if (p === '/api/v1/admin/logs/query' && method === 'GET') {
      return pageOf(res, filterLogs(q), q);
    }

    /* ----------------------------- server config ----------------------------- */
    if (p === '/api/v1/admin/settings' && method === 'GET') {
      return send(res, 200, { ...state.settings });
    }
    if (p === '/api/v1/admin/settings' && method === 'PATCH') {
      if (actor.role !== 'superadmin') {
        return fail(res, 403, 'FORBIDDEN_ROLE', 'Only superadmin can modify server config.');
      }
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      const w1 = body.default_response_wait_time;
      const w2 = body.default_response_wait_time_2;
      if (w1 !== undefined && (!Number.isInteger(Number(w1)) || Number(w1) <= 0)) {
        return fail(res, 400, 'BAD_REQUEST', 'default_response_wait_time must be a positive integer (ms).');
      }
      if (w2 !== undefined && (!Number.isInteger(Number(w2)) || Number(w2) <= 0)) {
        return fail(res, 400, 'BAD_REQUEST', 'default_response_wait_time_2 must be a positive integer (ms).');
      }
      if (w1 !== undefined) state.settings.default_response_wait_time = Number(w1);
      if (w2 !== undefined) state.settings.default_response_wait_time_2 = Number(w2);
      log(actor.username, null, 'info', `Server config updated: default_response_wait_time=${state.settings.default_response_wait_time}, default_response_wait_time_2=${state.settings.default_response_wait_time_2}.`);
      return send(res, 200, { ...state.settings });
    }

    /* ------------------------------- backups ------------------------------- */
    if (p.startsWith('/api/v1/admin/backup/') || p === '/api/v1/admin/logs/backup') {
      if (actor.role !== 'superadmin') {
        return fail(res, 403, 'FORBIDDEN_ROLE', 'Only superadmin can perform backup operations.');
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const dump = (scope, data, name) => {
        log(actor.username, null, 'info', `Backup ${name} downloaded by ${actor.username} (password ${q.get('password') ? 'provided' : 'missing'}).`);
        return send(res, 200, JSON.stringify(data, null, 2), {
          'content-type': 'text/plain',
          'content-disposition': `attachment; filename="dotask-${name}-${stamp}.json"`,
        });
      };
      if (p === '/api/v1/admin/backup/clients' && method === 'GET') {
        return dump('clients', filterClients(q), 'clients');
      }
      if (p === '/api/v1/admin/backup/tasks' && method === 'GET') {
        return dump('tasks', filterTasks(q).map(taskPublic), 'tasks');
      }
      if (p === '/api/v1/admin/backup/pending-clients' && method === 'GET') {
        return dump('pending-clients', filterPending(q), 'pending-clients');
      }
      if (p === '/api/v1/admin/backup/uploaded-files' && method === 'GET') {
        return dump('uploaded-files', state.uploadFiles, 'uploaded-files');
      }
      if (p === '/api/v1/admin/backup/task-types' && method === 'GET') {
        return dump('task-types', state.taskTypes.map(taskTypePublic), 'task-types');
      }
      if (p === '/api/v1/admin/backup/logs' && method === 'GET') {
        return dump('logs', filterLogs(q), 'logs');
      }
      if (p === '/api/v1/admin/logs/backup' && method === 'GET') {
        return dump('logs', filterLogs(q), 'logs');
      }
      if (p === '/api/v1/admin/backup/full' && method === 'GET') {
        return dump(
          'full',
          {
            clients: state.clients,
            pending_clients: state.pending,
            task_types: state.taskTypes.map(taskTypePublic),
            tasks: state.tasks.map(taskPublic),
            downloadable_files: state.downloadFiles,
            download_links: state.downloadLinks,
            upload_links: state.uploadLinks,
            uploaded_files: state.uploadFiles,
            admins: state.admins.map(adminPublic),
            logs: state.logs,
            settings: state.settings,
          },
          'full',
        );
      }
      if (p === '/api/v1/admin/backup/task-types/restore' && method === 'POST') {
        const raw = await readBody(req);
        const { files } = parseMultipart(raw, req.headers['content-type'] ?? '');
        if (!files.length) return fail(res, 400, 'BAD_REQUEST', 'Missing file part.');
        let parsed;
        try {
          parsed = JSON.parse(files[0].data.toString());
        } catch {
          return fail(res, 400, 'BAD_FILE', 'Backup file is not valid JSON.');
        }
        const list = Array.isArray(parsed) ? parsed : parsed.task_types;
        if (!Array.isArray(list)) return fail(res, 400, 'BAD_FILE', 'Backup file must contain a task type array.');
        const overwrite = q.get('overwrite') === 'true';
        if (!overwrite) {
          const clash = list.some((t) => state.taskTypes.some((x) => x.task_type_id === Number(t.task_type_id)));
          if (clash) {
            return fail(res, 409, 'CONFLICT', 'Task type ids already exist — enable override to replace them.');
          }
          state.taskTypes.push(...list.map((t) => ({
            task_type_id: Number(t.task_type_id),
            task_type_name: t.task_type_name ?? null,
            description: t.description ?? null,
          })));
        } else {
          state.taskTypes = list.map((t) => ({
            task_type_id: Number(t.task_type_id),
            task_type_name: t.task_type_name ?? null,
            description: t.description ?? null,
          }));
        }
        log(actor.username, null, 'info', `Task types restored by ${actor.username} (override=${overwrite}).`);
        return send(res, 200, {});
      }
    }

    return fail(res, 404, 'NOT_FOUND', `No such route: ${method} ${p}`);
  } catch (err) {
    console.error('unhandled', err);
    return fail(res, 500, 'INTERNAL_ERROR', 'Unhandled server error.');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`DoTask dev backend on http://127.0.0.1:${PORT} (accounts: admin/admin123, operator/operator123, viewer/viewer123)`);
});
