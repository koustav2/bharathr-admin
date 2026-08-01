'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, fmt } from '@/lib/api';
import { Button, Card, Empty, ErrorText, Field, Loading, Modal, TextArea } from '@/components/ui';

export default function ApprovalsPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Decision modal
  const [target, setTarget] = useState<any | null>(null);
  // Per contract section 5: decision is "APPROVE" | "REJECT".
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [note, setNote] = useState('');
  const [decError, setDecError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await api<any[]>('/approvals/pending'));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function open(item: any, d: 'APPROVE' | 'REJECT') {
    setTarget(item);
    setDecision(d);
    setNote('');
    setDecError(null);
  }

  async function decide() {
    if (!target) return;
    const instanceId = target.instanceId || target.id;
    setBusy(true);
    setDecError(null);
    try {
      await api(`/approvals/${instanceId}/decide`, {
        method: 'POST',
        body: { decision, note: note || undefined },
      });
      setTarget(null);
      await load();
    } catch (err: any) {
      setDecError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">My approvals</h1>
        <p className="mt-1 text-sm text-slate-500">Resignation requests waiting on your decision.</p>
      </div>

      <ErrorText error={error} />
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card>
          <Empty message="Nothing waiting on you." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r: any, i: number) => (
            <Card key={r.instanceId || r.id || i}>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-navy">{r.employeeName || '—'}</div>
                  <div className="font-mono text-xs text-slate-500">{r.empCode || ''}</div>
                </div>
                {r.stageRoleLabel && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {r.stageRoleLabel}
                  </span>
                )}
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Resignation date</dt>
                  <dd className="font-medium text-navy">{fmt.date(r.resignationDate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Last working date</dt>
                  <dd className="font-medium text-navy">{fmt.date(r.lastWorkingDate)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Reason</dt>
                  <dd className="mt-0.5 break-words text-navy">{r.reason || '—'}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={() => open(r, 'APPROVE')}>Approve</Button>
                <Button variant="danger" className="flex-1" onClick={() => open(r, 'REJECT')}>Reject</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {target && (
        <Modal
          title={`${decision === 'APPROVE' ? 'Approve' : 'Reject'} — ${target.employeeName || ''}`}
          onClose={() => setTarget(null)}
        >
          <div className="space-y-4">
            <Field label="Note (optional)">
              <TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <ErrorText error={decError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
              <Button variant={decision === 'APPROVE' ? 'primary' : 'danger'} onClick={decide} disabled={busy}>
                {busy ? 'Submitting…' : decision === 'APPROVE' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
