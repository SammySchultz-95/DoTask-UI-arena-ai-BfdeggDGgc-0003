'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';
import { ApiError } from '@/lib/api-client/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Field, Input, PasswordInput } from '@/components/ui/inputs';

export default function LoginPage() {
  const { status, mustChangePassword, login } = useAuth();
  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Straight to the app (or the forced password step).
  useEffect(() => {
    if (status === 'signedIn') {
      router.replace(mustChangePassword ? '/change-password' : '/dashboard');
    }
  }, [status, mustChangePassword, router]);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const fieldsValid = username.trim() !== '' && password !== '';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!fieldsValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await login(username.trim(), password);
      router.replace(
        response.must_change_password ? '/change-password' : '/dashboard',
      );
    } catch (caught) {
      if (caught instanceof ApiError) {
        // Never reveal which credential field was wrong.
        setError(
          caught.status === 401
            ? 'Invalid username or password.'
            : 'Something went wrong while signing in. Please try again.',
        );
      } else {
        setError('Something went wrong while signing in. Please try again.');
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      {/* Ambient glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-500/[0.06] blur-3xl"
      />

      <div className="panel relative w-full max-w-sm p-8">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon-gradient text-ink-950 shadow-glow animate-pulse-glow">
            <CheckCheck size={24} strokeWidth={2.6} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-fog">
              Do<span className="text-neon-400">Task</span>
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-fog-faint">
              Admin Panel
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Username" htmlFor="login-username">
            <Input
              id="login-username"
              ref={usernameRef}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              autoComplete="username"
              invalid={Boolean(error)}
            />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              invalid={Boolean(error)}
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!fieldsValid}
            loading={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
