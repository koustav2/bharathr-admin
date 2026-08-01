'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, session } from '@/lib/api';
import { Button, Card, ErrorText, Field, TextInput } from '@/components/ui';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const forced = session.user?.mustChangePassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      const u = session.user;
      if (u) session.save(session.token!, { ...u, mustChangePassword: false });
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <Card title={forced ? 'Set a new password to continue' : 'Change password'}>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Current password">
              <TextInput type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
            </Field>
            <Field label="New password (min 8, upper+lower+digit+special)">
              <TextInput type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required />
            </Field>
            <Field label="Confirm new password">
              <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </Field>
            <ErrorText error={error} />
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Saving…' : 'Change password'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
