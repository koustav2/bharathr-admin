'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { Button, Card, Empty, ErrorText, Field, Loading, Modal, Select, Table, Td } from '@/components/ui';

// matrixRole enum from the contract (section 5 / Enums).
const MATRIX_ROLES: { key: string; label: string }[] = [
  { key: 'BUSINESS_HEAD', label: 'Business Head' },
  { key: 'OFFICE_ADMIN', label: 'Office Admin' },
  { key: 'FINANCE', label: 'Finance' },
];

export default function MatrixPage() {
  const [matrix, setMatrix] = useState<Record<string, any> | null>(null);
  const [users, setUsers] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editKey, setEditKey] = useState<string | null>(null);
  const [pickUserId, setPickUserId] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [m, u] = await Promise.all([
        api<Record<string, any>>('/admin/approver-matrix'),
        api<any[]>('/admin/users'),
      ]);
      setMatrix(m || {});
      setUsers(Array.isArray(u) ? u : []);
    } catch (err: any) {
      setError(err.message);
      setMatrix({});
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(key: string) {
    const current = matrix?.[key];
    setEditKey(key);
    setPickUserId(current?.userId || '');
    setSaveError(null);
  }

  // Build the full mapping {ROLE: userId|null} defensively from current state,
  // overriding the role being edited.
  function buildBody(overrideKey: string, overrideUserId: string | null): Record<string, string | null> {
    const body: Record<string, string | null> = {};
    for (const { key } of MATRIX_ROLES) {
      body[key] = matrix?.[key]?.userId ?? null;
    }
    body[overrideKey] = overrideUserId;
    return body;
  }

  async function save() {
    if (!editKey) return;
    setBusy(true);
    setSaveError(null);
    try {
      await api('/admin/approver-matrix', {
        method: 'PUT',
        body: buildBody(editKey, pickUserId || null),
      });
      setEditKey(null);
      await load();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const editingRole = MATRIX_ROLES.find((r) => r.key === editKey);

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">Approver matrix</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resignation approval stages 3–5 resolve from this matrix. An unfilled optional stage is auto-bypassed.
        </p>
      </div>

      <Card>
        <ErrorText error={error} />
        {matrix === null ? (
          <Loading />
        ) : (
          <Table headers={['Stage', 'Current assignee', '']}>
            {MATRIX_ROLES.map(({ key, label }) => {
              const cur = matrix[key];
              return (
                <tr key={key} className="hover:bg-slate-50">
                  <Td className="font-semibold text-navy">{label}</Td>
                  <Td>{cur?.name || <span className="text-slate-400">Not assigned</span>}</Td>
                  <Td>
                    <Button variant="ghost" className="!px-3 !py-1 text-xs" onClick={() => openEdit(key)}>
                      Change
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {editKey && (
        <Modal title={`Assign — ${editingRole?.label || editKey}`} onClose={() => setEditKey(null)}>
          <div className="space-y-4">
            <Field label="Approver">
              {users === null ? (
                <Loading />
              ) : users.length === 0 ? (
                <Empty message="No users available." />
              ) : (
                <Select value={pickUserId} onChange={(e) => setPickUserId(e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}{u.empCode ? ` (${u.empCode})` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <ErrorText error={saveError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditKey(null)}>Cancel</Button>
              <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
