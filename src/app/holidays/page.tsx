'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, fmt } from '@/lib/api';
import { Button, Card, Empty, ErrorText, Field, Loading, Modal, Table, Td, TextInput } from '@/components/ui';

export default function HolidaysPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  // Delete confirm
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const load = useCallback(async (y: number) => {
    setRows(null);
    setError(null);
    try {
      setRows(await api<any[]>(`/holidays?year=${y}`));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load(year);
  }, [year, load]);

  async function addHoliday(e: React.FormEvent) {
    e.preventDefault();
    setAddBusy(true);
    setAddError(null);
    try {
      await api('/admin/holidays', {
        method: 'POST',
        body: { date, name, location: location || undefined },
      });
      setAddOpen(false);
      setDate('');
      setName('');
      setLocation('');
      await load(year);
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddBusy(false);
    }
  }

  async function deleteHoliday() {
    if (!delTarget) return;
    setDelBusy(true);
    setDelError(null);
    try {
      await api(`/admin/holidays/${delTarget.id}`, { method: 'DELETE' });
      setDelTarget(null);
      await load(year);
    } catch (err: any) {
      setDelError(err.message);
    } finally {
      setDelBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Holidays</h1>
        <Button onClick={() => { setAddError(null); setAddOpen(true); }}>Add holiday</Button>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-slate-100"
          >
            ‹
          </button>
          <span className="min-w-[4rem] text-center text-lg font-bold text-navy">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-slate-100"
          >
            ›
          </button>
        </div>

        <ErrorText error={error} />
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message={`No holidays for ${year}.`} />
        ) : (
          <Table headers={['Date', 'Name', 'Location', '']}>
            {rows.map((h: any) => (
              <tr key={h.id} className="hover:bg-slate-50">
                <Td className="whitespace-nowrap">{fmt.date(h.date)}</Td>
                <Td className="font-semibold text-navy">{h.name || '—'}</Td>
                <Td>{h.location || <span className="text-slate-400">All locations</span>}</Td>
                <Td>
                  <Button
                    variant="danger"
                    className="!px-3 !py-1 text-xs"
                    onClick={() => { setDelError(null); setDelTarget(h); }}
                  >
                    Delete
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {addOpen && (
        <Modal title="Add holiday" onClose={() => setAddOpen(false)}>
          <form onSubmit={addHoliday} className="space-y-4">
            <Field label="Date">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required autoFocus />
            </Field>
            <Field label="Name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Location (optional)">
              <TextInput
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Leave blank to apply to everyone"
              />
            </Field>
            <ErrorText error={addError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addBusy}>{addBusy ? 'Adding…' : 'Add holiday'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {delTarget && (
        <Modal title="Delete holiday" onClose={() => setDelTarget(null)}>
          <p className="text-sm text-slate-600">
            Delete <span className="font-semibold text-navy">{delTarget.name}</span> ({fmt.date(delTarget.date)})?
          </p>
          <ErrorText error={delError} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDelTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={deleteHoliday} disabled={delBusy}>
              {delBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
