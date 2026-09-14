'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, fmt } from '@/lib/api';
import { Button, Card, Empty, ErrorText, Field, Loading, Modal, Table, Td, TextArea } from '@/components/ui';

// Company-wide pending attendance regularisation (miss-punch) requests for
// HR/Super admin. Approve/reject via the staff override on /misspunch/:id/review.
export default function AttendanceApprovalsPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<any | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [note, setNote] = useState('');
  const [decError, setDecError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await api<any[]>('/admin/misspunch?status=PENDING'));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function open(item: any, d: 'APPROVED' | 'REJECTED') {
    setTarget(item);
    setDecision(d);
    setNote('');
    setDecError(null);
  }

  async function decide() {
    if (!target) return;
    setBusy(true);
    setDecError(null);
    try {
      await api(`/misspunch/${target.id}/review`, { method: 'POST', body: { decision, note: note || undefined } });
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
        <h1 className="text-xl font-bold text-navy">Attendance approvals</h1>
        <p className="mt-1 text-sm text-slate-500">Pending miss-punch regularisation requests across all employees.</p>
      </div>

      <ErrorText error={error} />
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card><Empty message="No pending attendance requests." /></Card>
      ) : (
        <Card>
          <Table headers={['Employee', 'Day(s)', 'Month', 'Year', 'Remarks', 'Applied', '']}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <div className="font-semibold text-navy">{r.name || '—'}</div>
                  <div className="font-mono text-xs text-slate-500">{r.employeeCode || ''}</div>
                </Td>
                <Td>{r.days}</Td>
                <Td>{r.month}</Td>
                <Td>{r.year}</Td>
                <Td className="max-w-[16rem] whitespace-pre-wrap break-words">{r.remarks || '—'}</Td>
                <Td>{fmt.date(r.appliedAt)}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button className="px-3 py-1" onClick={() => open(r, 'APPROVED')}>Approve</Button>
                    <Button variant="danger" className="px-3 py-1" onClick={() => open(r, 'REJECTED')}>Reject</Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {target && (
        <Modal title={`${decision === 'APPROVED' ? 'Approve' : 'Reject'} miss-punch — ${target.name || ''}`} onClose={() => setTarget(null)}>
          <div className="space-y-4">
            <div className="text-sm text-slate-600">Day(s) {target.days} · {target.month} {target.year}</div>
            <Field label="Note (optional)">
              <TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <ErrorText error={decError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
              <Button variant={decision === 'APPROVED' ? 'primary' : 'danger'} onClick={decide} disabled={busy}>
                {busy ? 'Submitting…' : decision === 'APPROVED' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
