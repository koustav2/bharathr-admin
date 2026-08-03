'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { api, downloadFile, fmt, openFile } from '@/lib/api';
import { Button, Card, Chip, Empty, ErrorText, Field, Loading, Modal, StatTile, Table, Td, TextInput } from '@/components/ui';
import { StructureEditorModal } from '@/components/StructureEditor';

const now = new Date();

function toStr(v: any): string {
  return v === null || v === undefined ? '' : String(v);
}
function toNum(v: string): number | undefined {
  if (v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

type Regen = { id: string; employeeId: string; name?: string };

function PayrollInner() {
  const params = useSearchParams();
  const [month, setMonth] = useState<number>(() => {
    const m = Number(params.get('month'));
    return m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  });
  const [year, setYear] = useState<number>(() => {
    const y = Number(params.get('year'));
    return y >= 2000 && y <= 2100 ? y : now.getFullYear();
  });

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<any[] | null>(null);

  // Modals
  const [confirmPublishAll, setConfirmPublishAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState<any | null>(null);
  const [regen, setRegen] = useState<Regen | null>(null);
  const [structFor, setStructFor] = useState<{ id: string; name?: string } | null>(null);

  const load = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await api<any>(`/payroll?month=${m}&year=${y}`));
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month, year); }, [month, year, load]);

  const summary = data?.summary || {};
  const slips: any[] = Array.isArray(data?.slips) ? data.slips : [];

  async function generateAll() {
    setBusy('generate-all');
    setError(null);
    setSkipped(null);
    try {
      const res = await api<any>('/payroll/generate-all', { method: 'POST', body: { month, year } });
      const sk = Array.isArray(res?.skipped) ? res.skipped : [];
      setSkipped(sk);
      await load(month, year);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function publishAll() {
    setBusy('publish-all');
    setError(null);
    try {
      await api('/payroll/publish-all', { method: 'POST', body: { month, year } });
      setConfirmPublishAll(false);
      await load(month, year);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function download(kind: 'bank' | 'register') {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'bank') {
        await downloadFile(`/payroll/bank-sheet.csv?month=${month}&year=${year}`, `bank-sheet-${year}-${month}.csv`);
      } else {
        await downloadFile(`/payroll/register.csv?month=${month}&year=${year}`, `payroll-register-${year}-${month}.csv`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function slipAction(id: string, action: 'publish' | 'unpublish') {
    setBusy(`slip-${id}`);
    setError(null);
    try {
      await api(`/payroll/slips/${id}/${action}`, { method: 'POST', body: {} });
      setConfirmUnpublish(null);
      await load(month, year);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteSlip(id: string) {
    setBusy(`slip-${id}`);
    setError(null);
    try {
      await api(`/payroll/slips/${id}`, { method: 'DELETE' });
      setConfirmDelete(null);
      await load(month, year);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Shell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy">Payroll run</h1>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <Field label="Month">
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-herb focus:outline-none focus:ring-1 focus:ring-herb"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{fmt.monthName(m)}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="w-28">
            <Field label="Year">
              <TextInput type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
            </Field>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Button onClick={generateAll} disabled={busy === 'generate-all'}>
          {busy === 'generate-all' ? 'Generating…' : 'Generate all'}
        </Button>
        <Button variant="secondary" onClick={() => setConfirmPublishAll(true)} disabled={!!busy}>Publish all</Button>
        <Button variant="ghost" onClick={() => download('bank')} disabled={busy === 'bank'}>
          {busy === 'bank' ? 'Preparing…' : 'Bank sheet CSV'}
        </Button>
        <Button variant="ghost" onClick={() => download('register')} disabled={busy === 'register'}>
          {busy === 'register' ? 'Preparing…' : 'Register CSV'}
        </Button>
      </div>

      <ErrorText error={error} />

      {skipped && (
        <Card title="Skipped in last generation" className="mb-5">
          {skipped.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing skipped — a draft was created for every eligible employee.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-600">
              {skipped.map((s: any, i: number) => {
                const noStructure = /structure/i.test(s.reason || '');
                return (
                  <li key={s.employeeId || i} className="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5">
                    <span className="font-medium text-navy">{s.name || s.employeeId}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{s.reason}</span>
                      {noStructure && s.employeeId && (
                        <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setStructFor({ id: s.employeeId, name: s.name })}>
                          Set structure
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Employees" value={toStr(summary.employees) || '—'} />
        <StatTile label="Structures set" value={toStr(summary.structuresSet) || '—'} />
        <StatTile label="Generated" value={toStr(summary.generated) || '—'} />
        <StatTile label="Published" value={toStr(summary.published) || '—'} />
        <StatTile label="Total net" value={summary.totalNet !== undefined ? fmt.money(summary.totalNet) : '—'} accent />
      </div>

      <Card title={`Payslips — ${fmt.monthName(month)} ${year}`}>
        {loading ? (
          <Loading />
        ) : slips.length === 0 ? (
          <Empty message="No payslips yet. Use “Generate all” to create drafts." />
        ) : (
          <Table headers={['Employee', 'Days paid', 'Gross', 'Net', 'Status', 'Actions']}>
            {slips.map((s: any) => {
              const isDraft = (s.status || '').toUpperCase() === 'DRAFT';
              const isPublished = (s.status || '').toUpperCase() === 'PUBLISHED';
              const sBusy = busy === `slip-${s.id}`;
              return (
                <tr key={s.id}>
                  <Td>
                    <div className="font-medium text-navy">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.empCode}</div>
                  </Td>
                  <Td>{s.daysPaid ?? '—'}{s.daysInMonth ? ` / ${s.daysInMonth}` : ''}</Td>
                  <Td>{fmt.money(s.gross)}</Td>
                  <Td className="font-semibold">{fmt.money(s.net)}</Td>
                  <Td><Chip label={s.status} /></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => openFile(`/payroll/slips/${s.id}/pdf`)}>PDF</Button>
                      <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setStructFor({ id: s.employeeId, name: s.name })}>Structure</Button>
                      {isDraft && (
                        <>
                          <Button className="px-2.5 py-1 text-xs" disabled={sBusy} onClick={() => slipAction(s.id, 'publish')}>Publish</Button>
                          <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setRegen({ id: s.id, employeeId: s.employeeId, name: s.name })}>Regenerate</Button>
                          <Button variant="danger" className="px-2.5 py-1 text-xs" onClick={() => setConfirmDelete(s)}>Delete</Button>
                        </>
                      )}
                      {isPublished && (
                        <Button variant="danger" className="px-2.5 py-1 text-xs" onClick={() => setConfirmUnpublish(s)}>Unpublish</Button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {confirmPublishAll && (
        <Modal title="Publish all payslips" onClose={() => setConfirmPublishAll(false)}>
          <p className="mb-4 text-sm text-slate-600">
            This locks every draft payslip for {fmt.monthName(month)} {year} and emails each employee their net amount. Continue?
          </p>
          <ErrorText error={error} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmPublishAll(false)}>Cancel</Button>
            <Button variant="secondary" onClick={publishAll} disabled={busy === 'publish-all'}>
              {busy === 'publish-all' ? 'Publishing…' : 'Publish all'}
            </Button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete draft payslip" onClose={() => setConfirmDelete(null)}>
          <p className="mb-4 text-sm text-slate-600">
            Delete the draft payslip for <span className="font-semibold text-navy">{confirmDelete.name}</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteSlip(confirmDelete.id)} disabled={busy === `slip-${confirmDelete.id}`}>Delete</Button>
          </div>
        </Modal>
      )}

      {confirmUnpublish && (
        <Modal title="Unpublish payslip" onClose={() => setConfirmUnpublish(null)}>
          <p className="mb-4 text-sm text-slate-600">
            Unpublish the payslip for <span className="font-semibold text-navy">{confirmUnpublish.name}</span>? It returns to draft so it can be regenerated.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmUnpublish(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => slipAction(confirmUnpublish.id, 'unpublish')} disabled={busy === `slip-${confirmUnpublish.id}`}>Unpublish</Button>
          </div>
        </Modal>
      )}

      {regen && (
        <RegenerateModal
          regen={regen}
          month={month}
          year={year}
          onClose={() => setRegen(null)}
          onDone={() => { setRegen(null); load(month, year); }}
        />
      )}

      {structFor && (
        <StructureEditorModal
          employeeId={structFor.id}
          employeeName={structFor.name}
          onClose={() => setStructFor(null)}
          onSaved={() => load(month, year)}
        />
      )}
    </Shell>
  );
}

function RegenerateModal({ regen, month, year, onClose, onDone }: {
  regen: Regen; month: number; year: number; onClose: () => void; onDone: () => void;
}) {
  const [daysPaid, setDaysPaid] = useState('');
  const [arrears, setArrears] = useState('');
  const [bonus, setBonus] = useState('');
  const [tds, setTds] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const overrides: any = {};
      const d = toNum(daysPaid); if (d !== undefined) overrides.daysPaid = d;
      const a = toNum(arrears); if (a !== undefined) overrides.arrears = a;
      const b = toNum(bonus); if (b !== undefined) overrides.bonus = b;
      const t = toNum(tds); if (t !== undefined) overrides.tds = t;
      const body: any = { employeeId: regen.employeeId, month, year };
      if (Object.keys(overrides).length > 0) body.overrides = overrides;
      await api('/payroll/generate', { method: 'POST', body });
      onDone();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={`Regenerate — ${regen.name || ''}`} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">
        Recomputes this draft for {fmt.monthName(month)} {year}. Leave a field blank to keep the computed value.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Days paid"><TextInput type="number" step="any" min={0} value={daysPaid} onChange={(e) => setDaysPaid(e.target.value)} /></Field>
        <Field label="Arrears (₹)"><TextInput type="number" step="any" value={arrears} onChange={(e) => setArrears(e.target.value)} /></Field>
        <Field label="Bonus (₹)"><TextInput type="number" step="any" value={bonus} onChange={(e) => setBonus(e.target.value)} /></Field>
        <Field label="TDS (₹)"><TextInput type="number" step="any" value={tds} onChange={(e) => setTds(e.target.value)} /></Field>
      </div>
      <ErrorText error={error} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Regenerating…' : 'Regenerate'}</Button>
      </div>
    </Modal>
  );
}

export default function PayrollPage() {
  return (
    <Suspense fallback={<Shell><Loading /></Shell>}>
      <PayrollInner />
    </Suspense>
  );
}
