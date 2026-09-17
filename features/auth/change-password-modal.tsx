'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api-client/endpoints';
import { errorMessage, useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Field, PasswordInput } from '@/components/ui/inputs';
import { Modal } from '@/components/ui/modal';

/**
 * Change-password form (`POST /api/v1/admin/me/change-password`).
 * Rendered inside a modal for voluntary changes; the forced first-login flow
 * reuses the same inner form at /change-password.
 */
export function ChangePasswordForm({
  onDone,
  autoFocus = false,
}: {
  onDone: () => void;
  autoFocus?: boolean;
}) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      toast.success('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onDone();
    },
    onError: (error) =>
      setLocalError(errorMessage(error, 'Could not change the password.')),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (newPassword !== confirmPassword) {
      setLocalError('New passwords do not match.');
      return;
    }
    if (newPassword.length === 0) {
      setLocalError('New password must not be empty.');
      return;
    }
    mutation.mutate();
  }

  const valid =
    currentPassword !== '' && newPassword !== '' && confirmPassword !== '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Current password" htmlFor="cp-current">
        <PasswordInput
          id="cp-current"
          value={currentPassword}
          autoFocus={autoFocus}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
        />
      </Field>
      <Field label="New password" htmlFor="cp-new">
        <PasswordInput
          id="cp-new"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirm new password" htmlFor="cp-confirm">
        <PasswordInput
          id="cp-confirm"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
        />
      </Field>

      {localError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {localError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={!valid} loading={mutation.isPending}>
          Update password
        </Button>
      </div>
    </form>
  );
}

export function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Reset internal state every time the modal is reopened.
  const [mounted, setMounted] = useState(open);
  useEffect(() => setMounted(open), [open]);
  if (!mounted) return null;

  return (
    <Modal open={open} title="Change password" onClose={onClose}>
      <ChangePasswordForm onDone={onClose} />
    </Modal>
  );
}
