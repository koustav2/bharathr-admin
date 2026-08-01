'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { api, downloadFile, fmt } from '@/lib/api';
import { Button, Card, Chip, Empty, ErrorText, Loading, Select, Table, Td, TextInput } from '@/components/ui';

const STATUSES = ['', 'ACTIVE', 'INACTIVE', 'ONBOARDING', 'PENDING_REVIEW', 'OFFER_SENT', 'SENT_BACK', 'EXITED'];

export default function EmployeesPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (s: string, st: string) => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (st) params.set('status', st);
      if (s) params.set('search', s);
      const qs = params.toString();
      setRows(await api<any[]>(`/employees${qs ? `?${qs}` : ''}`));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, []);

  // Debounced search / immediate status change.
  useEffect(() => {
    const t = setTimeout(() => load(search, status), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [search, status, load]);

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      await downloadFile('/reports/employees.csv', 'employees.csv');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Employees</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Link href="/employees/register">
            <Button>Register employee</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="w-72">
            <TextInput
              placeholder="Search name, emp code, email, designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-52">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All statuses'}</option>
              ))}
            </Select>
          </div>
        </div>
        <ErrorText error={error} />
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message="No employees found." />
        ) : (
          <Table headers={['Emp code', 'Name', 'Designation', 'Department', 'Status', 'Joined', '']}>
            {rows.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <Td className="font-mono text-xs">{r.empCode || '—'}</Td>
                <Td className="font-semibold text-navy">
                  {r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() || '—'}
                </Td>
                <Td>{r.designation || '—'}</Td>
                <Td>{r.department || '—'}</Td>
                <Td><Chip label={r.status} /></Td>
                <Td>{fmt.date(r.dateOfJoining)}</Td>
                <Td>
                  <Link href={`/employees/detail?id=${r.id}`} className="text-sm font-semibold text-herb hover:underline">
                    View
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </Shell>
  );
}
