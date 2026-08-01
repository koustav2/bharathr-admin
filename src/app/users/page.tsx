'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { Button, Card, Chip, Empty, ErrorText, Field, Loading, Modal, Select, Table, Td, TextInput } from '@/components/ui';

const ROLES = ['EMPLOYEE', 'HR_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'];

export default function UsersPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // "Change role" modal state
  const [roleTarget, setRoleTarget] = useState<any | null>(null);
  const [newRole, setNewRole] = useState('EMPLOYEE');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);

  // Enable/disable confirm modal state
  const [statusTarget, setStatusTarget] = useState<any | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  // Create staff user modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cRole, setCRole] = useState('HR_ADMIN');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await api<any[]>('/admin/users'));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openRoleModal(u: any) {
    setRoleTarget(u);
    setNewRole(u.role || 'EMPLOYEE');
    setRoleError(null);
  }

  async function saveRole() {
    if (!roleTarget) return;
    setRoleBusy(true);
    setRoleError(null);
    try {
      await api(`/admin/users/${roleTarget.id}/role`, { method: 'POST', body: { role: newRole } });
      setRoleTarget(null);
      await load();
    } catch (err: any) {
      setRoleError(err.message);
    } finally {
      setRoleBusy(false);
    }
  }

  async function saveStatus() {
    if (!statusTarget) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      await api(`/admin/users/${statusTarget.id}/status`, {
        method: 'POST',
        body: { active: !statusTarget.active },
      });
      setStatusTarget(null);
      await load();
    } catch (err: any) {
      setStatusError(err.message);
    } finally {
      setStatusBusy(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateBusy(true);
    setCreateError(null);
    try {
      await api('/admin/users', {
        method: 'POST',
        body: { name: cName, email: cEmail, password: cPassword, role: cRole },
      });
      setCreateOpen(false);
      setCName('');
      setCEmail('');
      setCPassword('');
      setCRole('HR_ADMIN');
      await load();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Users &amp; roles</h1>
        <Button onClick={() => { setCreateError(null); setCreateOpen(true); }}>Create staff user</Button>
      </div>

      <Card>
        <ErrorText error={error} />
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message="No users found." />
        ) : (
          <Table headers={['Name', 'Email', 'Role', 'Emp code', 'Active', '']}>
            {rows.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <Td className="font-semibold text-navy">{u.name || '—'}</Td>
                <Td>{u.email || '—'}</Td>
                <Td><Chip label={u.role} /></Td>
                <Td className="font-mono text-xs">{u.empCode || '—'}</Td>
                <Td><Chip label={u.active ? 'ACTIVE' : 'INACTIVE'} /></Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="!px-3 !py-1 text-xs" onClick={() => openRoleModal(u)}>
                      Change role
                    </Button>
                    <Button
                      variant={u.active ? 'danger' : 'primary'}
                      className="!px-3 !py-1 text-xs"
                      onClick={() => { setStatusError(null); setStatusTarget(u); }}
                    >
                      {u.active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {roleTarget && (
        <Modal title={`Change role — ${roleTarget.name || roleTarget.email}`} onClose={() => setRoleTarget(null)}>
          <div className="space-y-4">
            <Field label="Role">
              <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </Select>
            </Field>
            <ErrorText error={roleError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRoleTarget(null)}>Cancel</Button>
              <Button onClick={saveRole} disabled={roleBusy}>{roleBusy ? 'Saving…' : 'Save role'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {statusTarget && (
        <Modal
          title={statusTarget.active ? 'Disable account' : 'Enable account'}
          onClose={() => setStatusTarget(null)}
        >
          <p className="text-sm text-slate-600">
            {statusTarget.active
              ? `Disable ${statusTarget.name || statusTarget.email}? They will lose access immediately.`
              : `Enable ${statusTarget.name || statusTarget.email}? They will regain access immediately.`}
          </p>
          <ErrorText error={statusError} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button
              variant={statusTarget.active ? 'danger' : 'primary'}
              onClick={saveStatus}
              disabled={statusBusy}
            >
              {statusBusy ? 'Working…' : statusTarget.active ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </Modal>
      )}

      {createOpen && (
        <Modal title="Create staff user" onClose={() => setCreateOpen(false)}>
          <form onSubmit={createUser} className="space-y-4">
            <Field label="Name">
              <TextInput value={cName} onChange={(e) => setCName(e.target.value)} required autoFocus />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                value={cPassword}
                onChange={(e) => setCPassword(e.target.value)}
                required
                placeholder="Min 8 chars, upper, lower, digit, special"
              />
            </Field>
            <Field label="Role">
              <Select value={cRole} onChange={(e) => setCRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </Select>
            </Field>
            <ErrorText error={createError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createBusy}>{createBusy ? 'Creating…' : 'Create user'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
