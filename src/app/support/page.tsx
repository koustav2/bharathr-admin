'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, fmt, openFile } from '@/lib/api';
import {
  Button, Card, Chip, Empty, ErrorText, Field, Loading, Modal, Tabs, TextArea, TextInput,
} from '@/components/ui';

const CATEGORIES = ['ALL', 'HR', 'IT', 'ADMIN'];
const STATUSES = ['ALL', 'PENDING', 'RESOLVED'];

export default function SupportPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [resolving, setResolving] = useState<any | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (cat: string, st: string, query: string) => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cat !== 'ALL') params.set('category', cat);
      if (st !== 'ALL') params.set('status', st);
      if (query) params.set('q', query);
      const qs = params.toString();
      setRows(await api<any[]>(`/admin/support${qs ? `?${qs}` : ''}`));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(category, status, q), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [category, status, q, load]);

  function openResolve(ticket: any) {
    setResolving(ticket);
    setNote(ticket.resolutionNote || '');
  }

  async function submitResolve(newStatus: 'RESOLVED' | 'PENDING') {
    if (!resolving) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/support/${resolving.id}/resolve`, {
        method: 'POST',
        body: newStatus === 'RESOLVED' ? { status: 'RESOLVED', note } : { status: 'PENDING' },
      });
      setResolving(null);
      setNote('');
      await load(category, status, q);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reopen(ticket: any) {
    setError(null);
    try {
      await api(`/admin/support/${ticket.id}/resolve`, { method: 'POST', body: { status: 'PENDING' } });
      await load(category, status, q);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">Support desk</h1>
        <p className="mt-0.5 text-sm text-slate-500">Employee tickets across HR, IT and Admin.</p>
      </div>

      <Card>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</div>
        <Tabs tabs={CATEGORIES} active={category} onChange={setCategory} />
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</div>
        <Tabs tabs={STATUSES} active={status} onChange={setStatus} />
        <div className="w-80">
          <TextInput
            placeholder="Search tickets…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </Card>

      <div className="mt-4">
        <ErrorText error={error} />
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message="No tickets found." />
        ) : (
          <div className="space-y-4">
            {rows.map((t: any) => (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Chip label={t.category} />
                    <span className="text-sm font-semibold text-navy">{t.issueType || '—'}</span>
                    {t.issueDetail && <span className="text-sm text-slate-500">· {t.issueDetail}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{fmt.dateTime(t.appliedAt)}</span>
                    <Chip label={t.status} />
                  </div>
                </div>

                {t.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{t.description}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                  <span><span className="font-semibold text-navy">{t.name || t.employeeName || '—'}</span></span>
                  {t.empCode && <span>Emp code: <span className="font-mono">{t.empCode}</span></span>}
                  {t.email && <span>{t.email}</span>}
                  {t.phone && <span>{t.phone}</span>}
                </div>

                {t.resolutionNote && (
                  <div className="mt-3 rounded-lg bg-herb-soft px-3 py-2 text-sm text-herb-dark">
                    <span className="font-semibold">Resolution: </span>{t.resolutionNote}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {t.hasAttachment && (
                    <Button variant="ghost" onClick={() => openFile(`/admin/support/${t.id}/attachment`)}>
                      Attachment
                    </Button>
                  )}
                  {t.status === 'PENDING' ? (
                    <Button onClick={() => openResolve(t)}>Resolve</Button>
                  ) : (
                    <Button variant="secondary" onClick={() => reopen(t)}>Reopen</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {resolving && (
        <Modal title="Resolve ticket" onClose={() => setResolving(null)}>
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-navy">{resolving.issueType || '—'}</span>
              {' · '}
              {resolving.name || resolving.employeeName || '—'}
            </div>
            <Field label="Resolution note">
              <TextArea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe how this was resolved…" />
            </Field>
            <ErrorText error={error} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setResolving(null)}>Cancel</Button>
              <Button onClick={() => submitResolve('RESOLVED')} disabled={busy}>
                {busy ? 'Saving…' : 'Mark resolved'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
