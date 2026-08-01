'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, fmt, openFile } from '@/lib/api';
import { Button, Card, Chip, Empty, ErrorText, Field, Loading, Modal, Table, Td, TextArea, TextInput } from '@/components/ui';

const STEP_ORDER = ['PERSONAL', 'FAMILY', 'ADDRESS', 'EDUCATION', 'LANGUAGES', 'BANK', 'PHOTO', 'SIGNATURE'];

function humanKey(k: string) {
  return k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

/** Recursively render a value from a step's data blob as readable rows. */
function renderValue(value: any): React.ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400">—</span>;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">—</span>;
    return (
      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
            {typeof row === 'object' && row !== null ? <KeyVals obj={row} /> : String(row)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') return <KeyVals obj={value} />;
  return String(value);
}

function KeyVals({ obj }: { obj: Record<string, any> }) {
  const entries = Object.entries(obj);
  if (entries.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{humanKey(k)}</dt>
          <dd className="text-sm text-navy">{renderValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReviewModal({ employeeId, onClose, onDone }: {
  employeeId: string; onClose: () => void; onDone: () => void;
}) {
  const [sub, setSub] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'view' | 'approve' | 'sendback'>('view');
  const [officialEmail, setOfficialEmail] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approved, setApproved] = useState<any | null>(null);

  useEffect(() => {
    api<any>(`/onboarding/${employeeId}`).then(setSub).catch((e: any) => setError(e.message));
  }, [employeeId]);

  async function approve() {
    setBusy(true);
    setActionError(null);
    try {
      const data = await api<any>(`/onboarding/${employeeId}/approve`, {
        method: 'POST',
        body: { officialEmail, empCode: empCode || undefined },
      });
      setApproved(data || {});
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendBack() {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/onboarding/${employeeId}/send-back`, { method: 'POST', body: { notes } });
      onDone();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const steps: Record<string, any> = sub?.steps || {};
  const documents: any[] = sub?.documents || [];

  if (approved) {
    return (
      <Modal title="Onboarding approved" onClose={onDone}>
        <p className="text-sm text-slate-600">Login account created and credentials emailed. Status is now ACTIVE.</p>
        <div className="my-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-herb bg-herb-soft p-4 text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Emp code</div>
            <div className="mt-1 font-mono text-xl font-bold text-herb-dark">{approved.empCode || empCode || '—'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Official email</div>
            <div className="mt-1 text-sm font-semibold text-navy">{approved.officialEmail || officialEmail}</div>
          </div>
        </div>
        <div className="flex justify-end"><Button onClick={onDone}>Done</Button></div>
      </Modal>
    );
  }

  return (
    <Modal title={sub ? `Review — ${sub.name || sub.designation || 'submission'}` : 'Review submission'} onClose={onClose} wide>
      {error && <ErrorText error={error} />}
      {!sub && !error && <Loading />}
      {sub && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><span className="text-slate-400">Designation:</span> <span className="font-semibold text-navy">{sub.designation || '—'}</span></span>
            <span><span className="text-slate-400">Department:</span> <span className="font-semibold text-navy">{sub.department || '—'}</span></span>
            <span><span className="text-slate-400">Status:</span> <Chip label={sub.status} /></span>
          </div>

          {STEP_ORDER.filter((s) => steps[s]).map((s) => (
            <div key={s} className="rounded-xl border border-slate-200 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy">{s}</h4>
              {renderValue(steps[s])}
            </div>
          ))}
          {/* Any steps not in the canonical order */}
          {Object.keys(steps).filter((s) => !STEP_ORDER.includes(s)).map((s) => (
            <div key={s} className="rounded-xl border border-slate-200 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy">{humanKey(s)}</h4>
              {renderValue(steps[s])}
            </div>
          ))}

          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy">Documents</h4>
            {documents.length === 0 ? (
              <Empty message="No documents." />
            ) : (
              <Table headers={['Type', 'Filename', '']}>
                {documents.map((d: any) => (
                  <tr key={d.id}>
                    <Td><Chip label={d.docType} /></Td>
                    <Td className="max-w-[220px] truncate">{d.filename || '—'}</Td>
                    <Td>
                      <button className="text-sm font-semibold text-herb hover:underline"
                        onClick={() => openFile(`/employees/${employeeId}/documents/${d.id}`)}>
                        View
                      </button>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </div>

          {/* Action area */}
          <div className="border-t border-slate-100 pt-4">
            {mode === 'view' && (
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setMode('sendback'); setActionError(null); }}>Send back</Button>
                <Button onClick={() => { setMode('approve'); setActionError(null); }}>Approve</Button>
              </div>
            )}

            {mode === 'approve' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Official email">
                    <TextInput type="email" value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} placeholder="name@bharatherbs.in" />
                  </Field>
                  <Field label="Emp code (optional — auto-assigned)">
                    <TextInput value={empCode} onChange={(e) => setEmpCode(e.target.value)} placeholder="BH0001" />
                  </Field>
                </div>
                <ErrorText error={actionError} />
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
                  <Button onClick={approve} disabled={busy || !officialEmail}>{busy ? 'Approving…' : 'Confirm approval'}</Button>
                </div>
              </div>
            )}

            {mode === 'sendback' && (
              <div className="space-y-4">
                <Field label="Notes for the candidate">
                  <TextArea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What needs to be corrected…" />
                </Field>
                <ErrorText error={actionError} />
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
                  <Button variant="danger" onClick={sendBack} disabled={busy || !notes.trim()}>{busy ? 'Sending…' : 'Send back'}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function OnboardingPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setRows(await api<any[]>('/onboarding/pending'));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Onboarding review</h1>
      </div>

      <Card>
        <ErrorText error={error} />
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message="No submissions awaiting review." />
        ) : (
          <Table headers={['Name', 'Designation', 'Department', 'Status', 'Submitted', '']}>
            {rows.map((r: any) => (
              <tr key={r.employeeId || r.id} className="hover:bg-slate-50">
                <Td className="font-semibold text-navy">{r.name || '—'}</Td>
                <Td>{r.designation || '—'}</Td>
                <Td>{r.department || '—'}</Td>
                <Td><Chip label={r.status} /></Td>
                <Td>{fmt.dateTime(r.submittedAt)}</Td>
                <Td>
                  <Button variant="ghost" onClick={() => setReviewing(r.employeeId || r.id)}>Review</Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {reviewing && (
        <ReviewModal
          employeeId={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load(); }}
        />
      )}
    </Shell>
  );
}
