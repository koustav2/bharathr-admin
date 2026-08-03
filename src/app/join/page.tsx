'use client';

// PUBLIC candidate e-joining wizard. No login/session — every call is code-gated
// and passes { auth: false }. Rendered WITHOUT the admin Shell.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, API_BASE, fmt } from '@/lib/api';
import { Button, Card, ErrorText, Field, Loading, Modal, TextInput } from '@/components/ui';
import {
  JoinHeader, PersonalForm, FamilyForm, AddressForm, EducationForm, LanguagesForm, BankForm, DocsForm,
} from '@/components/JoinForms';

const STAGES = [
  { key: 'PERSONAL', label: 'Personal' },
  { key: 'FAMILY', label: 'Family' },
  { key: 'ADDRESS', label: 'Address' },
  { key: 'EDUCATION', label: 'Education' },
  { key: 'LANGUAGES', label: 'Languages' },
  { key: 'BANK', label: 'Bank' },
  { key: 'DOCS', label: 'Photo & signature' },
] as const;

type StageKey = (typeof STAGES)[number]['key'];

/** Full-width light page wrapper for every candidate screen. */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <JoinHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}

function CodeEntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <Page>
      <Card title="Enter your joining code">
        <p className="mb-4 text-sm text-slate-600">
          Paste the joining code from your invitation email to continue your e-joining.
        </p>
        <Field label="Joining code">
          <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ABCD-1234" />
        </Field>
        <div className="mt-4 flex justify-end">
          <Button disabled={!code.trim()} onClick={() => onSubmit(code.trim())}>Continue</Button>
        </div>
      </Card>
    </Page>
  );
}

function Terminal({ title, message, tone = 'default' }: { title: string; message: string; tone?: 'default' | 'good' | 'bad' }) {
  const ring = tone === 'good' ? 'border-herb bg-herb-soft' : tone === 'bad' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white';
  return (
    <Page>
      <div className={`rounded-xl border p-8 text-center ${ring}`}>
        <h1 className="text-xl font-bold text-navy">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">{message}</p>
      </div>
    </Page>
  );
}

function JoinInner() {
  const sp = useSearchParams();
  const [code, setCode] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Offer-screen action state
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Wizard state
  const [active, setActive] = useState<StageKey>('PERSONAL');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async (c: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await api<any>('/onboarding/lookup', { method: 'POST', body: { code: c }, auth: false });
      setData(d);
    } catch (err: any) {
      setError(err?.message || 'Could not look up this code.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Read ?code= on mount.
  useEffect(() => {
    const c = sp.get('code');
    if (c) { setCode(c); load(c); }
  }, [sp, load]);

  function startWithCode(c: string) {
    setCode(c);
    load(c);
  }

  async function accept() {
    if (!code) return;
    setActing(true);
    setActionError(null);
    try {
      await api('/onboarding/accept', { method: 'POST', body: { code }, auth: false });
      await load(code); // now ONBOARDING → wizard
    } catch (err: any) {
      setActionError(err?.message || 'Could not accept the offer.');
    } finally {
      setActing(false);
    }
  }

  async function reject() {
    if (!code) return;
    setActing(true);
    setActionError(null);
    try {
      await api('/onboarding/reject', { method: 'POST', body: { code }, auth: false });
      setConfirmReject(false);
      setRejected(true);
    } catch (err: any) {
      setActionError(err?.message || 'Could not reject the offer.');
    } finally {
      setActing(false);
    }
  }

  async function submitJoining() {
    if (!code) return;
    setSubmitError(null);
    try {
      await api('/onboarding/submit', { method: 'POST', body: { code }, auth: false });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Could not submit — please review the stages above.');
    }
  }

  // ----- No code yet -----
  if (!code && !data) return <CodeEntry onSubmit={startWithCode} />;

  if (loading && !data) return <Page><Loading /></Page>;

  if (rejected) return <Terminal title="Offer declined" message="You have declined this offer. Thank you for letting us know." tone="bad" />;
  if (submitted) return <Terminal title="e-Joining submitted" message="Thank you! Your e-joining has been submitted. HR will review it shortly and email your login details once approved." tone="good" />;

  if (error && !data) {
    return (
      <Page>
        <Card title="We couldn't find that code">
          <ErrorText error={error} />
          <p className="mb-4 text-sm text-slate-600">Please check the code from your invitation email, or contact HR.</p>
          <Button variant="ghost" onClick={() => { setCode(null); setError(null); }}>Enter a different code</Button>
        </Card>
      </Page>
    );
  }

  if (!data) return <Page><Loading /></Page>;

  const status: string = data.status;

  // ----- Terminal statuses -----
  if (status === 'OFFER_REJECTED') {
    return <Terminal title="Offer declined" message="This offer has been declined. If this is a mistake, please contact HR." tone="bad" />;
  }
  if (status === 'ACTIVE') {
    return <Terminal title="You're all set" message="Your onboarding is complete and your employee account is active. Please log in with the credentials emailed to you." tone="good" />;
  }
  if (status === 'PENDING_REVIEW') {
    return <Terminal title="Under review" message="Your e-joining has been submitted — HR will review it shortly." tone="good" />;
  }

  // ----- Offer screen -----
  if (status === 'OFFER_SENT') {
    return (
      <Page>
        <Card title="Your offer">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info label="Name" value={data.name} />
            <Info label="Designation" value={data.designation} />
            <Info label="Department" value={data.department} />
            <Info label="Date of joining" value={fmt.date(data.dateOfJoining)} />
          </div>
          {data.hasOfferLetter && (
            <div className="mt-5">
              <Button variant="ghost" onClick={() => window.open(`${API_BASE}/onboarding/offer-letter.pdf?code=${encodeURIComponent(code || '')}`, '_blank')}>
                View offer letter (PDF)
              </Button>
            </div>
          )}
          <ErrorText error={actionError} />
          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <Button variant="danger" disabled={acting} onClick={() => { setActionError(null); setConfirmReject(true); }}>Decline offer</Button>
            <Button disabled={acting} onClick={accept}>{acting ? 'Please wait…' : 'Accept & start e-joining'}</Button>
          </div>
        </Card>
        {confirmReject && (
          <Modal title="Decline this offer?" onClose={() => setConfirmReject(false)}>
            <p className="text-sm text-slate-600">This cannot be undone. Are you sure you want to decline the offer?</p>
            <ErrorText error={actionError} />
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmReject(false)}>Cancel</Button>
              <Button variant="danger" disabled={acting} onClick={reject}>{acting ? 'Declining…' : 'Yes, decline'}</Button>
            </div>
          </Modal>
        )}
      </Page>
    );
  }

  // ----- Wizard (ONBOARDING | SENT_BACK) -----
  const steps: Record<string, any> = data.steps || {};
  const docs: string[] = Array.isArray(steps.DOCUMENTS) ? steps.DOCUMENTS : [];
  const done: Record<StageKey, boolean> = {
    PERSONAL: !!steps.PERSONAL,
    FAMILY: !!steps.FAMILY,
    ADDRESS: !!steps.ADDRESS,
    EDUCATION: !!steps.EDUCATION,
    LANGUAGES: !!steps.LANGUAGES,
    BANK: !!steps.BANK,
    DOCS: docs.includes('PHOTO') && docs.includes('SIGNATURE'),
  };
  const allDone = STAGES.every((s) => done[s.key]);
  const refresh = () => { if (code) load(code); };

  function renderStage() {
    if (!code) return null;
    switch (active) {
      case 'PERSONAL': return <PersonalForm code={code} initial={steps.PERSONAL} onSaved={refresh} />;
      case 'FAMILY': return <FamilyForm code={code} initial={steps.FAMILY} onSaved={refresh} />;
      case 'ADDRESS': return <AddressForm code={code} initial={steps.ADDRESS} onSaved={refresh} />;
      case 'EDUCATION': return <EducationForm code={code} initial={steps.EDUCATION} onSaved={refresh} />;
      case 'LANGUAGES': return <LanguagesForm code={code} initial={steps.LANGUAGES} onSaved={refresh} />;
      case 'BANK': return <BankForm code={code} initial={steps.BANK} onSaved={refresh} />;
      case 'DOCS': return <DocsForm code={code} hasPhoto={docs.includes('PHOTO')} hasSignature={docs.includes('SIGNATURE')} onSaved={refresh} />;
    }
  }

  const activeLabel = STAGES.find((s) => s.key === active)?.label || '';

  return (
    <Page>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-navy">Complete your e-joining</h1>
        <p className="mt-1 text-sm text-slate-600">Welcome{data.name ? `, ${data.name}` : ''}. Fill in each section and save it, then submit.</p>
      </div>

      {status === 'SENT_BACK' && data.sentBackNotes && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="text-sm font-bold text-amber-800">HR asked for corrections</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-amber-800">{data.sentBackNotes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
        {/* Progress list */}
        <nav className="space-y-1">
          {STAGES.map((s, i) => {
            const isActive = s.key === active;
            const complete = done[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  isActive ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  complete ? 'bg-herb text-white' : isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {complete ? '✓' : i + 1}
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Active stage panel */}
        <div>
          <Card title={activeLabel}>
            {renderStage()}
          </Card>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {allDone ? 'All sections complete — you can submit your e-joining.' : 'Save every section (green ✓) to enable submission.'}
              </p>
              <Button disabled={!allDone} onClick={submitJoining}>Submit e-joining</Button>
            </div>
            <ErrorText error={submitError} />
          </div>
        </div>
      </div>
    </Page>
  );
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-navy">{value ?? '—'}</div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<Page><Loading /></Page>}>
      <JoinInner />
    </Suspense>
  );
}
