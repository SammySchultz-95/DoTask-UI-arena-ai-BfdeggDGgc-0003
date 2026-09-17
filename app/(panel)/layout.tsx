'use client';

/**
 * Authenticated shell: guards the session, enforces the forced
 * change-password step, and renders the collapsible sidebar.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Spinner } from '@/components/ui/spinner';

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, mustChangePassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
    else if (status === 'signedIn' && mustChangePassword)
      router.replace('/change-password');
  }, [status, mustChangePassword, router]);

  if (status !== 'signedIn' || mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] p-6">{children}</div>
      </main>
    </div>
  );
}
