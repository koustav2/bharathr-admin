'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { Button, Card, Chip, Empty, ErrorText, Field, Loading, Modal, Table, Td, TextInput } from '@/components/ui';

export default function LeaveSettingsPage() {
  const [types, setTypes] = useState<any[] | null>(null);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [ents, setEnts] = useState<any[] | null>(null);
  const [entsError, setEntsError] = useState<string | null>(null);

  // Leave type edit modal
  const [editType, setEditType] = useState<any | null>(null);
  const [annualQuota, setAnnualQuota] = useState('');
  const [requiresBalance, setRequiresBalance] = useState(false);
  const [allowHalfDay, setAllowHalfDay] = useState(false);
  const [allowCertificate, setAllowCertificate] = useState(false);
  const [typeSaveError, setTypeSaveError] = useState<string | null>(null);
  const [typeBusy, setTypeBusy] = useState(false);

  // Entitlement edit modal
  const [entOpen, setEntOpen] = useState(false);
  const [entOriginal, setEntOriginal] = useState<any | null>(null);
  const [state, setState] = useState('');
  const [el, setEl] = useState('');
  const [cl, setCl] = useState('');
  const [sl, setSl] = useState('');
  const [entSaveError, setEntSaveError] = useState<string | null>(null);
  const [entBusy, setEntBusy] = useState(false);

  const loadTypes = useCallback(async () => {
    setTypesError(null);
    try {
      setTypes(await api<any[]>('/leave/types'));
    } catch (err: any) {
      setTypesError(err.message);
      setTypes([]);
    }
  }, []);

  const loadEnts = useCallback(async () => {
    setEntsError(null);
    try {
      setEnts(await api<any[]>('/admin/entitlements'));
    } catch (err: any) {
      setEntsError(err.message);
      setEnts([]);
    }
  }, []);

  useEffect(() => {
    loadTypes();
    loadEnts();
  }, [loadTypes, loadEnts]);

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

  function openEntAdd() {
    setEntOriginal(null);
    setState('');
    setEl('');
    setCl('');
    setSl('');
    setEntSaveError(null);
    setEntOpen(true);
  }

  function openEntEdit(row: any) {
    setEntOriginal(row);
    setState(row.state || '');
    setEl(row.el != null ? String(row.el) : '');
    setCl(row.cl != null ? String(row.cl) : '');
    setSl(row.sl != null ? String(row.sl) : '');
    setEntSaveError(null);
    setEntOpen(true);
  }

  async function saveEnt(e: React.FormEvent) {
    e.preventDefault();
    setEntBusy(true);
    setEntSaveError(null);
    try {
      await api('/admin/entitlements', {
        method: 'PUT',
        body: {
          state,
          el: el === '' ? 0 : Number(el),
          cl: cl === '' ? 0 : Number(cl),
          sl: sl === '' ? 0 : Number(sl),
        },
      });
      setEntOpen(false);
      await loadEnts();
    } catch (err: any) {
      setEntSaveError(err.message);
    } finally {
      setEntBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">Leave settings</h1>
      </div>

      <div className="space-y-6">
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

        <Card title="State entitlements" actions={<Button onClick={openEntAdd}>Add / Edit</Button>}>
          <ErrorText error={entsError} />
          {ents === null ? (
            <Loading />
          ) : ents.length === 0 ? (
            <Empty message="No state entitlements configured." />
          ) : (
            <Table headers={['State', 'EL', 'CL', 'SL', '']}>
              {ents.map((row: any, i: number) => (
                <tr key={row.state ?? i} className="hover:bg-slate-50">
                  <Td className="font-semibold text-navy">{row.state || '—'}</Td>
                  <Td>{row.el ?? '—'}</Td>
                  <Td>{row.cl ?? '—'}</Td>
                  <Td>{row.sl ?? '—'}</Td>
                  <Td>
                    <Button variant="ghost" className="!px-3 !py-1 text-xs" onClick={() => openEntEdit(row)}>
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
            <Field label="Annual quota">
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

      {entOpen && (
        <Modal
          title={entOriginal ? `Edit entitlement — ${entOriginal.state}` : 'Add entitlement'}
          onClose={() => setEntOpen(false)}
        >
          <form onSubmit={saveEnt} className="space-y-4">
            <Field label="State">
              <TextInput
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                disabled={!!entOriginal}
                autoFocus={!entOriginal}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="EL">
                <TextInput type="number" min={0} value={el} onChange={(e) => setEl(e.target.value)} />
              </Field>
              <Field label="CL">
                <TextInput type="number" min={0} value={cl} onChange={(e) => setCl(e.target.value)} />
              </Field>
              <Field label="SL">
                <TextInput type="number" min={0} value={sl} onChange={(e) => setSl(e.target.value)} />
              </Field>
            </div>
            <ErrorText error={entSaveError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEntOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={entBusy}>{entBusy ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
