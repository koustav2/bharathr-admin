'use client';

import { useState } from 'react';
import Shell from '@/components/Shell';
import { downloadFile, fmt } from '@/lib/api';
import { Button, Card, ErrorText, Field, Select, TextInput } from '@/components/ui';

const now = new Date();

const EMPLOYEE_STATUSES = ['', 'ACTIVE', 'INACTIVE', 'ONBOARDING', 'PENDING_REVIEW', 'OFFER_SENT', 'SENT_BACK', 'EXITED'];
const RESIGNATION_STATUSES = ['', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];

export default function ReportsPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [empStatus, setEmpStatus] = useState('');
  const [resStatus, setResStatus] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  async function download(key: string, path: string, filename: string) {
    setBusy(key);
    setError(null);
    try {
      await downloadFile(path, filename);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">Reports &amp; exports</h1>
        <p className="mt-1 text-sm text-slate-500">Download CSV extracts for people, payroll and compliance records.</p>
      </div>

      <ErrorText error={error} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Employees">
          <p className="mb-4 text-sm text-slate-500">Full employee master. Optionally filter by status.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-52">
              <Field label="Status">
                <Select value={empStatus} onChange={(e) => setEmpStatus(e.target.value)}>
                  {EMPLOYEE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All statuses'}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              disabled={busy === 'employees'}
              onClick={() => download('employees', `/reports/employees.csv${empStatus ? `?status=${empStatus}` : ''}`, 'employees.csv')}
            >
              {busy === 'employees' ? 'Preparing…' : 'Download CSV'}
            </Button>
          </div>
        </Card>

        <Card title="Payroll — month">
          <p className="mb-4 text-sm text-slate-500">Payroll register and bank sheet for a chosen month.</p>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Field label="Month">
                <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{fmt.monthName(m)}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="w-28">
              <Field label="Year">
                <TextInput type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
              </Field>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy === 'register'}
              onClick={() => download('register', `/payroll/register.csv?month=${month}&year=${year}`, `payroll-register-${year}-${month}.csv`)}
            >
              {busy === 'register' ? 'Preparing…' : 'Register CSV'}
            </Button>
            <Button
              variant="secondary"
              disabled={busy === 'bank'}
              onClick={() => download('bank', `/payroll/bank-sheet.csv?month=${month}&year=${year}`, `bank-sheet-${year}-${month}.csv`)}
            >
              {busy === 'bank' ? 'Preparing…' : 'Bank sheet CSV'}
            </Button>
          </div>
        </Card>

        <Card title="Resignations">
          <p className="mb-4 text-sm text-slate-500">Resignation requests. Optionally filter by status.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-52">
              <Field label="Status">
                <Select value={resStatus} onChange={(e) => setResStatus(e.target.value)}>
                  {RESIGNATION_STATUSES.map((s) => (
                    <option key={s} value={s}>{s || 'All statuses'}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              disabled={busy === 'resignations'}
              onClick={() => download('resignations', `/admin/resignations.csv${resStatus ? `?status=${resStatus}` : ''}`, 'resignations.csv')}
            >
              {busy === 'resignations' ? 'Preparing…' : 'Download CSV'}
            </Button>
          </div>
        </Card>

        <Card title="Audit log">
          <p className="mb-4 text-sm text-slate-500">Full system audit trail of every mutating action.</p>
          <Button
            disabled={busy === 'audit'}
            onClick={() => download('audit', '/admin/audit-log.csv', 'audit-log.csv')}
          >
            {busy === 'audit' ? 'Preparing…' : 'Download CSV'}
          </Button>
        </Card>
      </div>
    </Shell>
  );
}
