'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Spinner } from '@/components/ui/spinner';

export default function IndexPage() {
  const { status, mustChangePassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
    else if (status === 'signedIn')
      router.replace(mustChangePassword ? '/change-password' : '/dashboard');
  }, [status, mustChangePassword, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-6 w-6" />
    </div>
  );
}
