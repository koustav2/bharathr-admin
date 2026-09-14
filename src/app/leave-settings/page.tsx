'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { Button, Card, Chip, Empty, ErrorText, Field, Loading, Modal, Table, Td, TextInput } from '@/components/ui';

export default function LeaveSettingsPage() {
  const [types, setTypes] = useState<any[] | null>(null);
  const [typesError, setTypesError] = useState<string | null>(null);

  // Leave type edit modal
  const [editType, setEditType] = useState<any | null>(null);
  const [annualQuota, setAnnualQuota] = useState('');
  const [requiresBalance, setRequiresBalance] = useState(false);
  const [allowHalfDay, setAllowHalfDay] = useState(false);
  const [allowCertificate, setAllowCertificate] = useState(false);
  const [typeSaveError, setTypeSaveError] = useState<string | null>(null);
  const [typeBusy, setTypeBusy] = useState(false);

  const loadTypes = useCallback(async () => {
    setTypesError(null);
    try {
      setTypes(await api<any[]>('/leave/types'));
    } catch (err: any) {
      setTypesError(err.message);
      setTypes([]);
    }
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  function openTypeEdit(t: any) {
    setEditType(t);
    setAnnualQuota(t.annualQuota != null ? String(t.annualQuota) : '');
    setRequiresBalance(!!t.requiresBalance);
    setAllowHalfDay(!!t.allowHalfDay);
    setAllowCertificate(!!t.allowCertificate);
    setTypeSaveError(null);
  }

  async function saveType(e: React.FormEvent) {
    e.preventDefault();
    if (!editType) return;
    setTypeBusy(true);
    setTypeSaveError(null);
    try {
      await api(`/admin/leave-types/${editType.code}`, {
        method: 'PUT',
        body: {
          annualQuota: annualQuota === '' ? 0 : Number(annualQuota),
          requiresBalance,
          allowHalfDay,
          allowCertificate,
        },
      });
      setEditType(null);
      await loadTypes();
    } catch (err: any) {
      setTypeSaveError(err.message);
    } finally {
      setTypeBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">Leave settings</h1>
      </div>

      <div className="space-y-6">
        <Card title="Leave policy">
          <p className="text-sm text-slate-600">
            Employees get a single <strong>Leave</strong> balance of the configured annual quota, granted in two
            equal half-year blocks — <strong>Jan–Jun</strong> and <strong>Jul–Dec</strong>. Each block&apos;s balance
            is available only within that half-year; <strong>unused leave lapses</strong> when the next block begins
            (no carry-over). The current quota of 12 days therefore grants 6 days per half-year.
          </p>
        </Card>

        <Card title="Leave types">
          <ErrorText error={typesError} />
          {types === null ? (
            <Loading />
          ) : types.length === 0 ? (
            <Empty message="No leave types configured." />
          ) : (
            <Table headers={['Code', 'Name', 'Annual quota', 'Flags', '']}>
              {types.map((t: any) => (
                <tr key={t.code} className="hover:bg-slate-50">
                  <Td className="font-mono text-xs font-semibold">{t.code}</Td>
                  <Td className="font-semibold text-navy">{t.name || '—'}</Td>
                  <Td>{t.annualQuota ?? '—'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {t.requiresBalance && <Chip label="Balance" />}
                      {t.allowHalfDay && <Chip label="Half-day" />}
                      {t.allowCertificate && <Chip label="Certificate" />}
                    </div>
                  </Td>
                  <Td>
                    <Button variant="ghost" className="!px-3 !py-1 text-xs" onClick={() => openTypeEdit(t)}>
                      Edit
                    </Button>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      {editType && (
        <Modal title={`Edit leave type — ${editType.code}`} onClose={() => setEditType(null)}>
          <form onSubmit={saveType} className="space-y-4">
            <Field label="Annual quota (split across two half-years)">
              <TextInput
                type="number"
                min={0}
                value={annualQuota}
                onChange={(e) => setAnnualQuota(e.target.value)}
              />
            </Field>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={requiresBalance} onChange={(e) => setRequiresBalance(e.target.checked)} />
                Requires balance
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={allowHalfDay} onChange={(e) => setAllowHalfDay(e.target.checked)} />
                Allow half-day
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={allowCertificate} onChange={(e) => setAllowCertificate(e.target.checked)} />
                Allow certificate
              </label>
            </div>
            <ErrorText error={typeSaveError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditType(null)}>Cancel</Button>
              <Button type="submit" disabled={typeBusy}>{typeBusy ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
