# DoTask Admin Panel

Dark, neon-green admin panel for the DoTask API. The UI is built with Next.js App Router, TypeScript, Tailwind CSS, and a typed OpenAPI client generated from `swagger.json`.

## Run the panel

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Connect to the .NET 10 backend

The panel calls the API through relative URLs such as `/api/v1/admin/dashboard/summary`. Next.js can proxy those requests to your ASP.NET Core server, which avoids browser CORS problems and keeps the backend URL out of browser code.

### 1. Set the backend URL

Create `.env.local` in the project root:

```env
# Use the URL where your .NET API is listening. Do not add /api/v1 here.
DOTASK_BACKEND_URL=https://localhost:7025
```

For a plain HTTP .NET profile, use for example:

```env
DOTASK_BACKEND_URL=http://localhost:5000
```

The included `next.config.mjs` forwards `/api/*` to `${DOTASK_BACKEND_URL}/api/*`. Restart `npm run dev` after changing `.env.local`.

### 2. Start the .NET API

From the backend project, make sure the API is listening on the same URL configured above:

```bash
dotnet run --urls "https://localhost:7025"
```

If the HTTPS development certificate is not trusted, trust it once with:

```bash
dotnet dev-certs https --trust
```

Verify the API is reachable before opening the UI:

```bash
curl -i https://localhost:7025/health
```

The backend routes must match the paths in `swagger.json`, for example:

- `POST /api/v1/admin/auth/login`
- `GET /api/v1/admin/dashboard/summary`
- `GET /api/v1/admin/clients/query`
- `GET /api/v1/admin/tasks/query`

### 3. Authentication flow

The helper in `lib/api.ts` reads these browser storage values:

- `dotask_token` — JWT returned by the login endpoint
- `dotask_role` — `superadmin`, `normaladmin`, or `readonlyadmin`

It sends the token as:

```http
Authorization: Bearer <token>
```

On a `401`, it clears both values and sends the user to `/login`. The current visual prototype does not yet include a login screen; wire the login form to the API like this:

```ts
const result = await fetch('/api/v1/admin/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
}).then((res) => {
  if (!res.ok) throw new Error('Login failed');
  return res.json() as Promise<{
    token: string;
    role: 'superadmin' | 'normaladmin' | 'readonlyadmin';
    must_change_password: boolean;
  }>;
});

localStorage.setItem('dotask_token', result.token);
localStorage.setItem('dotask_role', result.role);
```

If `must_change_password` is `true`, redirect to the password-change screen and call `POST /api/v1/admin/me/change-password` before allowing normal panel access. There is no refresh-token endpoint; let a `401` log the user out.

### 4. Calling a typed API helper

`lib/api-types.ts` is generated from the repository's OpenAPI document. `lib/api.ts` adds the JWT header and handles `401` responses:

```ts
import { apiFetch } from '@/lib/api';

const summary = await apiFetch(
  '/api/v1/admin/dashboard/summary',
  'get',
);
```

When the backend contract changes, regenerate the types:

```bash
npx openapi-typescript swagger.json -o lib/api-types.ts
```

Keep API requests inside TanStack Query hooks in `features/` or page components. Use query invalidation after mutations and `refetchInterval: 5000` for the live tables described in the prompt.

### 5. Alternative: direct browser requests with CORS

The recommended setup is the Next.js proxy above. If you intentionally call the .NET URL directly from the browser, expose the URL with `NEXT_PUBLIC_API_BASE_URL` and enable a narrowly scoped ASP.NET Core CORS policy:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("DoTaskPanel", policy => policy
        .WithOrigins("http://localhost:3000")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors("DoTaskPanel");
```

Do not use `AllowAnyOrigin()` together with credentials in production. For a deployed panel, replace `http://localhost:3000` with the exact panel origin.

## Production notes

Build and run the panel with:

```bash
npm run build
npm start
```

Set `DOTASK_BACKEND_URL` in the hosting environment before starting Next.js. Use HTTPS for both services, keep JWT storage in mind, and prefer an httpOnly secure cookie if the backend can support it. The current localStorage approach is acceptable for this internal prototype but is more exposed to XSS.
