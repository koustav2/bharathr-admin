'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { api, apiUpload } from '@/lib/api';
import { Button, Card, ErrorText, Field, Select, TextInput } from '@/components/ui';

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];

type ManagerHit = { id: string; empCode?: string; name: string; designation?: string };

/** Pick a manager from a dropdown list of employees (loaded once).
 *  A filter box narrows the list when there are many employees. */
function ManagerPicker({ label, value, onChange, employees }: {
  label: string;
  value: { id: string; label: string } | null;
  onChange: (v: { id: string; label: string } | null) => void;
  employees: ManagerHit[];
}) {
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();
  const shown = q
    ? employees.filter((e) => e.name.toLowerCase().includes(q) || (e.empCode || '').toLowerCase().includes(q))
    : employees;

  return (
    <Field label={label}>
      {employees.length > 8 && (
        <TextInput
          className="mb-2"
          placeholder="Filter by name or emp code…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      <Select
        value={value?.id || ''}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) { onChange(null); return; }
          const emp = employees.find((x) => x.id === id);
          if (emp) onChange({ id: emp.id, label: `${emp.name}${emp.empCode ? ` (${emp.empCode})` : ''}` });
        }}
      >
        <option value="">— None —</option>
        {shown.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}{e.empCode ? ` (${e.empCode})` : ''}{e.designation ? ` · ${e.designation}` : ''}
          </option>
        ))}
      </Select>
      {employees.length === 0 && (
        <p className="mt-1 text-xs text-slate-400">No employees yet — add the first hire without a manager.</p>
      )}
    </Field>
  );
}

/** Free-text input with a dropdown of master values (falls back to free text). */
function MasterField({ label, options, value, onChange, required }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  if (options.length > 0) {
    return (
      <Field label={label}>
        <Select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </Field>
    );
  }
  return (
    <Field label={label}>
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </Field>
  );
}

export default function RegisterEmployeePage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [reportingManager, setReportingManager] = useState<{ id: string; label: string } | null>(null);
  const [functionalManager, setFunctionalManager] = useState<{ id: string; label: string } | null>(null);
  const [ctc, setCtc] = useState('');
  const [autoOffer, setAutoOffer] = useState(false);
  const [offerFile, setOfferFile] = useState<File | null>(null);
  const [incLogo, setIncLogo] = useState(true);
  const [incSig, setIncSig] = useState(true);

  const [masters, setMasters] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [employees, setEmployees] = useState<ManagerHit[]>([]);

  useEffect(() => {
    api<any>('/meta/masters').then(setMasters).catch(() => setMasters({}));
    // Managers are picked from the existing employee list.
    api<any[]>('/employees')
      .then((rows) =>
        setEmployees(
          (rows || []).map((r) => ({
            id: r.id,
            name: r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim(),
            empCode: r.empCode,
            designation: r.designation,
          })),
        ),
      )
      .catch(() => setEmployees([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await apiUpload<any>(
        '/employees',
        {
          firstName,
          lastName,
          personalEmail,
          phone,
          designation,
          department,
          location,
          dateOfJoining,
          employmentType,
          reportingManagerId: reportingManager?.id,
          functionalManagerId: functionalManager?.id,
          ctc: ctc || undefined,
          autoOfferLetter: autoOffer ? 'true' : undefined,
          includeLogo: autoOffer ? String(incLogo) : undefined,
          includeSignature: autoOffer ? String(incSig) : undefined,
        },
        offerFile ? { part: 'offerLetter', blob: offerFile, filename: offerFile.name } : undefined,
      );
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl">
          <Card title="Employee registered">
            <p className="text-sm text-slate-600">
              Appointment sent to <span className="font-semibold text-navy">{personalEmail}</span>. Share this joining
              code with the candidate if needed:
            </p>
            <div className="my-5 rounded-xl border-2 border-dashed border-herb bg-herb-soft px-6 py-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Joining code</div>
              <div className="mt-1 font-mono text-3xl font-bold tracking-widest text-herb-dark">
                {result.joiningCode || '—'}
              </div>
            </div>
            <Link href="/employees" className="text-sm font-semibold text-herb hover:underline">
              ← Back to employees
            </Link>
          </Card>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Register employee</h1>
        <Link href="/employees" className="text-sm font-semibold text-slate-500 hover:text-navy">← Back to employees</Link>
      </div>

      <form onSubmit={submit} className="max-w-3xl space-y-5">
        <Card title="Candidate details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name">
              <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </Field>
            <Field label="Last name">
              <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </Field>
            <Field label="Personal email">
              <TextInput type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} required />
            </Field>
            <Field label="Phone">
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
          </div>
        </Card>

        <Card title="Role & placement">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MasterField label="Designation" options={masters?.designations || []} value={designation} onChange={setDesignation} required />
            <MasterField label="Department" options={masters?.departments || []} value={department} onChange={setDepartment} required />
            <MasterField label="Location" options={masters?.locations || []} value={location} onChange={setLocation} required />
            <Field label="Date of joining">
              <TextInput type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} required />
            </Field>
            <Field label="Employment type">
              <Select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ManagerPicker label="Reporting manager" value={reportingManager} onChange={setReportingManager} employees={employees} />
            <ManagerPicker label="Functional manager" value={functionalManager} onChange={setFunctionalManager} employees={employees} />
          </div>
        </Card>

        <Card title="Appointment letter">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Annual CTC (INR, optional)">
              <TextInput type="number" min={0} step="0.01" value={ctc} onChange={(e) => setCtc(e.target.value)} />
            </Field>
            <Field label="Upload appointment letter (PDF, optional)">
              <input
                type="file"
                accept="application/pdf"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-navy-light"
                onChange={(e) => setOfferFile(e.target.files?.[0] || null)}
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={autoOffer}
              onChange={(e) => setAutoOffer(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#3f7d4e]"
            />
            Auto-generate appointment letter + Annexure A from CTC
          </label>
          {autoOffer && (
            <div className="mt-3 flex flex-wrap gap-4 pl-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={incLogo} onChange={(e) => setIncLogo(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#3f7d4e]" />
                Include company logo
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={incSig} onChange={(e) => setIncSig(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#3f7d4e]" />
                Include authorised signature
              </label>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Provide either an uploaded PDF or tick auto-generate (requires CTC). The candidate receives the
            appointment email with an accept link and joining code. Set the signatory in Settings.
          </p>
        </Card>

        <ErrorText error={error} />
        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>{busy ? 'Registering…' : 'Register & send offer'}</Button>
        </div>
      </form>
    </Shell>
  );
}
