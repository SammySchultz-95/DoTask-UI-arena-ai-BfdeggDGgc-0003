'use client';

/**
 * Forced change-password step: after login, when the API returns
 * `must_change_password: true`, the admin must set a new password here before
 * entering the app.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Spinner } from '@/components/ui/spinner';
import { ChangePasswordForm } from '@/features/auth/change-password-modal';

export default function ForceChangePasswordPage() {
  const { status, mustChangePassword, passwordChanged, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
    else if (status === 'signedIn' && !mustChangePassword)
      router.replace('/dashboard');
  }, [status, mustChangePassword, router]);

  if (status !== 'signedIn') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-500/[0.06] blur-3xl"
      />
      <div className="panel relative w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-300">
            <ShieldAlert size={22} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-fog">Set a new password</h1>
            <p className="mt-1 text-xs leading-relaxed text-fog-dim">
              This account requires a password change before you can continue.
            </p>
          </div>
        </div>

        <ChangePasswordForm
          autoFocus
          onDone={() => {
            passwordChanged();
            router.replace('/dashboard');
          }}
        />

        <div className="mt-5 border-t border-ink-600 pt-4 text-center">
          <button
            onClick={() => void logout()}
            className="inline-flex items-center gap-1.5 text-xs text-fog-faint transition hover:text-red-300"
          >
            <CheckCheck size={12} />
            Sign in with a different account
          </button>
        </div>
      </div>
    </div>
  );
}
