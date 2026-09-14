'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, downloadFile, fmt } from '@/lib/api';
import { Button, Card, Empty, ErrorText, Field, Loading, Select, Table, Td, TextInput } from '@/components/ui';

// Field-force travel report: per employee per day, check-in/out location, KM
// travelled (from GPS tours) and areas visited. Defaults to the Marketing
// department; any department (or all) can be selected.
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TravelPage() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [department, setDepartment] = useState('Marketing');
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<any>('/meta/masters')
      .then((m) => setDepartments(m?.departments || []))
      .catch(() => setDepartments([]));
  }, []);

  const qs = useCallback(() => {
    const p = new URLSearchParams();
    if (department) p.set('department', department);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p.toString();
  }, [department, from, to]);

  const load = useCallback(async () => {
    setError(null);
    setRows(null);
    try {
      setRows(await api<any[]>(`/admin/travel-summary?${qs()}`));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, [qs]);

  useEffect(() => { load(); }, [load]);

  return (
    <Shell>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy">Travel report</h1>
          <p className="mt-1 text-sm text-slate-500">Check-in / check-out, KM travelled and areas visited by field staff.</p>
        </div>
        <Button variant="secondary" onClick={() => downloadFile(`/admin/travel-summary?${qs()}&export=csv`, 'travel-summary.csv')}>
          Export CSV
        </Button>
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Department">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All departments</option>
              {!departments.includes('Marketing') && <option value="Marketing">Marketing</option>}
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="From">
            <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </Card>

      <ErrorText error={error} />
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card><Empty message="No travel activity for the selected filters." /></Card>
      ) : (
        <Card>
          <Table headers={['Date', 'Employee', 'Check-in', 'Check-out', 'KM', 'Areas visited']}>
            {rows.map((r, i) => (
              <tr key={`${r.employeeId}-${r.date}-${i}`}>
                <Td>{fmt.date(r.date)}</Td>
                <Td>
                  <div className="font-semibold text-navy">{r.name || '—'}</div>
                  <div className="font-mono text-xs text-slate-500">{r.employeeCode || ''}</div>
                </Td>
                <Td>
                  <div>{r.checkInAt || '—'}</div>
                  <div className="max-w-[14rem] text-xs text-slate-500 break-words">{r.checkInAddress || ''}</div>
                </Td>
                <Td>
                  <div>{r.checkOutAt || '—'}</div>
                  <div className="max-w-[14rem] text-xs text-slate-500 break-words">{r.checkOutAddress || ''}</div>
                </Td>
                <Td className="font-semibold text-navy">{r.km}</Td>
                <Td className="max-w-[20rem] text-xs text-slate-600 break-words">
                  {(r.areas || []).join(' · ') || '—'}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </Shell>
  );
}
