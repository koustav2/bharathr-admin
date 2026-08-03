'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, session, ApiUser } from '@/lib/api';
import { Button, ErrorText, Field, TextInput } from '@/components/ui';
import { LogoMark } from '@/components/Logo';

type LoginData = { otpRequired?: boolean; token?: string; user?: ApiUser };

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish(data: LoginData) {
    if (data.token && data.user) {
      session.save(data.token, data.user);
      router.replace(data.user.mustChangePassword ? '/change-password' : '/dashboard');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (otpStep) {
        finish(await api<LoginData>('/auth/login/verify-otp', { method: 'POST', body: { identifier, code }, auth: false }));
      } else {
        const data = await api<LoginData>('/auth/login', { method: 'POST', body: { identifier, password }, auth: false });
        if (data.otpRequired) setOtpStep(true);
        else finish(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={56} />
          <div className="mt-3 text-2xl font-bold text-navy">Bharat<span className="text-herb">HR</span></div>
          <p className="mt-1 text-sm text-slate-500">Admin portal — sign in</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {!otpStep ? (
            <>
              <Field label="Official email or Employee ID">
                <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus required />
              </Field>
              <Field label="Password">
                <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
            </>
          ) : (
            <Field label="6-digit code (sent to your email)">
              <TextInput value={code} onChange={(e) => setCode(e.target.value)} autoFocus required maxLength={6} />
            </Field>
          )}
          <ErrorText error={error} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : otpStep ? 'Verify code' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
