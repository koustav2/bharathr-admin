'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { api, apiUpload, fmt, openFile } from '@/lib/api';
import {
  Button, Card, Chip, Empty, ErrorText, Field, Loading, Modal, Select, StatTile, Table, Td, TextInput,
} from '@/components/ui';
import { StructureEditorModal } from '@/components/StructureEditor';

const DOC_TYPES = ['OFFER_LETTER', 'AADHAAR', 'PAN', 'BANK_PROOF', 'EDUCATION', 'EXPERIENCE', 'PHOTO', 'SIGNATURE', 'OTHER'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm text-navy">{value ?? '—'}</div>
    </div>
  );
}

/** Lightweight search-as-you-type manager picker for the edit modal. */
function ManagerSearch({ label, value, onChange }: {
  label: string;
  value: { id: string; label: string } | null;
  onChange: (v: { id: string; label: string } | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(q: string) {
    setQuery(q);
    if (value) onChange(null);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setHits([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        setHits((await api<any[]>(`/employees/search?q=${encodeURIComponent(q.trim())}`)) || []);
        setOpen(true);
      } catch { setHits([]); }
    }, 300);
  }

  return (
    <Field label={label}>
      <div className="relative">
        <TextInput
          placeholder="Type a name or emp code…"
          value={value ? value.label : query}
          onChange={(e) => search(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && hits.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {hits.map((h: any) => (
              <button key={h.id} type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ id: h.id, label: `${h.name}${h.empCode ? ` (${h.empCode})` : ''}` });
                  setQuery('');
                  setOpen(false);
                }}>
                <span className="font-semibold text-navy">{h.name}</span>
                {h.empCode && <span className="ml-2 font-mono text-xs text-slate-500">{h.empCode}</span>}
              </button>
            ))}
          </div>
        )}
        {value && (
          <button type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-red-500"
            onClick={() => { onChange(null); setQuery(''); }}>✕</button>
        )}
      </div>
    </Field>
  );
}

// ---------------------------------------------------------------- Attendance

const DAY_STYLES: Record<string, string> = {
  P: 'bg-herb-soft text-herb-dark',
  A: 'bg-red-100 text-red-700',
  H: 'bg-purple-100 text-purple-700',
  WO: 'bg-slate-100 text-slate-500',
  L: 'bg-sky-100 text-sky-700',
};

function AttendanceSection({ employeeId }: { employeeId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthly, setMonthly] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const q = `year=${year}&month=${month}&employeeId=${employeeId}`;
    Promise.all([
      api<any>(`/attendance/monthly?${q}`),
      api<any>(`/attendance/${employeeId}/summary?month=${month}&year=${year}`),
      api<any[]>(`/attendance/daily?${q}`).catch(() => []),
    ])
      .then(([m, s, d]) => { if (alive) { setMonthly(m); setSummary(s); setDaily(d || []); } })
      .catch((err: any) => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [employeeId, year, month]);

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  const firstDow = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const days: any[] = monthly?.days || [];
  const photos = daily.filter((p: any) => p.hasPhoto);

  return (
    <Card
      title="Attendance"
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">‹</button>
          <span className="min-w-[130px] text-center text-sm font-semibold text-navy">{fmt.monthName(month)} {year}</span>
          <button onClick={() => shift(1)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">›</button>
        </div>
      }
    >
      <ErrorText error={error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Present" value={summary.present ?? 0} accent />
              <StatTile label="Absent" value={summary.absent ?? 0} />
              <StatTile label="Working days" value={summary.workingDays ?? 0} />
            </div>
          )}

          <div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
              {days.map((d: any) => (
                <div key={d.day} className="flex min-h-[52px] flex-col items-center rounded-lg border border-slate-100 p-1">
                  <div className="text-xs text-slate-500">{d.day}</div>
                  {d.status && (
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${DAY_STYLES[d.status] || 'bg-slate-100 text-slate-500'}`}>
                      {d.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-herb" /> P — Present</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-400" /> A — Absent</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-purple-400" /> H — Holiday</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-300" /> WO — Week off</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-sky-400" /> L — Leave</span>
            </div>
          </div>

          {summary?.records?.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Daily records</h3>
              <Table headers={['Date', 'In', 'Out', 'Hours']}>
                {summary.records.map((r: any, i: number) => (
                  <tr key={i}>
                    <Td>{fmt.date(r.date)}</Td>
                    <Td>{r.loginTime ? fmt.time(r.loginTime) : '—'}</Td>
                    <Td>{r.logoutTime ? fmt.time(r.logoutTime) : '—'}</Td>
                    <Td>{r.hours ?? '—'}</Td>
                  </tr>
                ))}
              </Table>
            </div>
          )}

          {photos.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Punch photos</h3>
              <Table headers={['When', 'Type', 'Address', '']}>
                {photos.map((p: any) => (
                  <tr key={p.id}>
                    <Td>{fmt.dateTime(p.capturedAt)}</Td>
                    <Td><Chip label={p.type} /></Td>
                    <Td className="max-w-xs truncate text-slate-500">{p.address || '—'}</Td>
                    <Td>
                      <button className="text-sm font-semibold text-herb hover:underline"
                        onClick={() => openFile(`/attendance/photo/${p.id}`)}>
                        Selfie
                      </button>
                    </Td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------- Detail

function EmployeeDetailInner() {
  const params = useSearchParams();
  const id = params.get('id') || '';

  const [emp, setEmp] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modals
  const [confirmActive, setConfirmActive] = useState<boolean | null>(null); // desired active state
  const [editOpen, setEditOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [structOpen, setStructOpen] = useState(false);

  // Edit form state
  const [edit, setEdit] = useState<any>({});
  const [editRM, setEditRM] = useState<{ id: string; label: string } | null>(null);
  const [editFM, setEditFM] = useState<{ id: string; label: string } | null>(null);

  // Bank & statutory
  const [bank, setBank] = useState<any | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState<any>({});

  // Documents
  const [docs, setDocs] = useState<any[]>([]);
  const [docType, setDocType] = useState('OTHER');
  const [docFile, setDocFile] = useState<File | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api<any>(`/employees/${id}`);
      setEmp(data);
      if (Array.isArray(data?.documents)) {
        setDocs(data.documents);
      } else {
        api<any[]>(`/employees/${id}/documents`).then((d) => setDocs(d || [])).catch(() => setDocs([]));
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [id]);

  const loadBank = useCallback(async () => {
    if (!id) return;
    try {
      setBank(await api<any>(`/employees/${id}/bank-statutory`));
      setBankError(null);
    } catch (err: any) {
      setBankError(err.message);
    }
  }, [id]);

  useEffect(() => { load(); loadBank(); }, [load, loadBank]);

  if (!id) {
    return <Card><Empty message="No employee selected. Open from the employees list." /></Card>;
  }
  if (error) return <Card><ErrorText error={error} /></Card>;
  if (!emp) return <Loading />;

  const name = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
  const canToggle = emp.status === 'ACTIVE' || emp.status === 'INACTIVE';
  const isActive = emp.status === 'ACTIVE';

  function openEdit() {
    setEdit({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      phone: emp.phone || '',
      personalEmail: emp.personalEmail || '',
      officialEmail: emp.officialEmail || '',
      designation: emp.designation || '',
      department: emp.department || '',
      location: emp.location || '',
      employmentType: emp.employmentType || 'FULL_TIME',
      ctc: emp.ctc ?? '',
      noticePeriodDays: emp.noticePeriodDays ?? '',
    });
    setEditRM(null);
    setEditFM(null);
    setActionError(null);
    setEditOpen(true);
  }

  async function saveEdit() {
    setBusy(true);
    setActionError(null);
    try {
      const body: any = {};
      for (const [k, v] of Object.entries(edit)) {
        if (v !== '' && v !== undefined && v !== null) body[k] = k === 'ctc' || k === 'noticePeriodDays' ? Number(v) : v;
      }
      if (editRM) body.reportingManagerId = editRM.id;
      if (editFM) body.functionalManagerId = editFM.id;
      await api(`/employees/${id}`, { method: 'PATCH', body });
      setEditOpen(false);
      await load();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (confirmActive === null) return;
    setBusy(true);
    setActionError(null);
    try {
      await api(`/employees/${id}/active`, { method: 'POST', body: { active: confirmActive } });
      setConfirmActive(null);
      await load();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openBankEdit() {
    setBankForm({
      pan: '', aadhaar: '', bankName: '', accountNumber: '', ifsc: '', uan: '', esic: '',
    });
    setActionError(null);
    setBankOpen(true);
  }

  async function saveBank() {
    setBusy(true);
    setActionError(null);
    try {
      const body: any = {};
      for (const [k, v] of Object.entries(bankForm)) if (v !== '' && v !== undefined) body[k] = v;
      await api(`/employees/${id}/bank-statutory`, { method: 'POST', body });
      setBankOpen(false);
      await loadBank();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc() {
    if (!docFile) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiUpload(`/employees/${id}/documents`, { docType }, { part: 'file', blob: docFile, filename: docFile.name });
      setDocFile(null);
      if (docInputRef.current) docInputRef.current.value = '';
      const d = await api<any[]>(`/employees/${id}/documents`).catch(() => null);
      if (d) setDocs(d);
      else await load();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function generateOffer() {
    const raw = window.prompt('Annual CTC (INR) for the offer letter:', emp.ctc ? String(emp.ctc) : '');
    if (raw === null) return;
    const ctcNum = Number(raw);
    if (!raw.trim() || Number.isNaN(ctcNum) || ctcNum <= 0) {
      setActionError('Enter a valid CTC amount.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await api(`/employees/${id}/offer-letter`, { method: 'POST', body: { ctc: ctcNum } });
      await load();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setBusy(true);
    setActionError(null);
    try {
      const data = await api<any>(`/employees/${id}/reset-password`, { method: 'POST' });
      setResetOpen(false);
      setTempPassword(data?.tempPassword || '(sent by email)');
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/employees" className="text-xs font-semibold text-slate-400 hover:text-navy">← Employees</Link>
          <h1 className="mt-1 flex items-center gap-3 text-xl font-bold text-navy">
            {name}
            {emp.empCode && <span className="font-mono text-sm font-normal text-slate-400">{emp.empCode}</span>}
            <Chip label={emp.status} />
          </h1>
        </div>
        <div className="flex gap-2">
          {canToggle && (
            <Button variant={isActive ? 'danger' : 'primary'} onClick={() => { setActionError(null); setConfirmActive(!isActive); }}>
              {isActive ? 'Deactivate' : 'Activate'}
            </Button>
          )}
          <Button variant="ghost" onClick={openEdit}>Edit</Button>
        </div>
      </div>

      <ErrorText error={actionError} />

      <Card title="Profile">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoRow label="Designation" value={emp.designation} />
          <InfoRow label="Department" value={emp.department} />
          <InfoRow label="Location" value={emp.location} />
          <InfoRow label="Employment type" value={emp.employmentType?.replace('_', ' ')} />
          <InfoRow label="Phone" value={emp.phone} />
          <InfoRow label="Personal email" value={emp.personalEmail} />
          <InfoRow label="Official email" value={emp.officialEmail} />
          <InfoRow label="Date of joining" value={fmt.date(emp.dateOfJoining)} />
          <InfoRow label="Reporting manager" value={emp.reportingManager?.name || emp.reportingManagerName} />
          <InfoRow label="Functional manager" value={emp.functionalManager?.name || emp.functionalManagerName} />
          <InfoRow label="CTC" value={fmt.money(emp.ctc)} />
          <InfoRow label="Notice period" value={emp.noticePeriodDays != null ? `${emp.noticePeriodDays} days` : '—'} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Bank & statutory" actions={<Button variant="ghost" onClick={openBankEdit}>Edit</Button>}>
          <ErrorText error={bankError} />
          {!bank && !bankError ? (
            <Loading />
          ) : bank ? (
            <Table headers={['Field', 'Value']}>
              {[
                ['PAN', bank.pan], ['Aadhaar', bank.aadhaar], ['Bank name', bank.bankName],
                ['Account number', bank.accountNumber], ['IFSC', bank.ifsc], ['UAN', bank.uan], ['ESIC', bank.esic],
              ].map(([label, val]) => (
                <tr key={label as string}>
                  <Td className="font-semibold text-slate-500">{label}</Td>
                  <Td className="font-mono">{val || '—'}</Td>
                </tr>
              ))}
            </Table>
          ) : null}
        </Card>

        <Card title="Documents">
          {docs.length === 0 ? (
            <Empty message="No documents uploaded." />
          ) : (
            <Table headers={['Type', 'Filename', 'Uploaded', '']}>
              {docs.map((d: any) => (
                <tr key={d.id}>
                  <Td><Chip label={d.docType} /></Td>
                  <Td className="max-w-[180px] truncate">{d.filename || '—'}</Td>
                  <Td>{fmt.date(d.uploadedAt)}</Td>
                  <Td>
                    <button className="text-sm font-semibold text-herb hover:underline"
                      onClick={() => openFile(`/employees/${id}/documents/${d.id}`)}>
                      View
                    </button>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <div className="w-44">
              <Field label="Doc type">
                <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </Select>
              </Field>
            </div>
            <div className="min-w-[200px] flex-1">
              <Field label="File">
                <input ref={docInputRef} type="file"
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-navy-light"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
              </Field>
            </div>
            <Button onClick={uploadDoc} disabled={!docFile || busy}>{busy ? 'Uploading…' : 'Upload'}</Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Offer letter">
          <p className="text-sm text-slate-500">
            Generate (or regenerate) the Offer Letter + Annexure A from a CTC amount, or view the current PDF.
          </p>
          <div className="mt-4 flex gap-3">
            <Button onClick={generateOffer} disabled={busy}>Generate (CTC)</Button>
            <Button variant="ghost" onClick={() => openFile(`/employees/${id}/offer-letter.pdf`)}>View PDF</Button>
          </div>
        </Card>

        <Card title="Password">
          <p className="text-sm text-slate-500">
            Issues a temporary password (shown once, also emailed) and forces a change on next login.
          </p>
          <div className="mt-4">
            <Button variant="danger" onClick={() => { setActionError(null); setResetOpen(true); }}>Reset password</Button>
          </div>
        </Card>

        <Card title="Salary structure">
          <p className="text-sm text-slate-500">
            Set this employee&apos;s pay: the company template pre-fills every percentage and allowance, so usually
            you just enter their monthly CTC. Special Allowance auto-balances so gross always equals the CTC.
            A structure is required before payroll can generate their payslip.
          </p>
          <div className="mt-4">
            <Button onClick={() => setStructOpen(true)}>Edit salary structure</Button>
          </div>
        </Card>
      </div>

      <AttendanceSection employeeId={id} />

      {/* ------------------------------------------------------- Modals */}
      {structOpen && (
        <StructureEditorModal
          employeeId={id}
          employeeName={name}
          onClose={() => setStructOpen(false)}
          onSaved={() => setStructOpen(false)}
        />
      )}

      {confirmActive !== null && (
        <Modal title={confirmActive ? 'Activate employee' : 'Deactivate employee'} onClose={() => setConfirmActive(null)}>
          <p className="text-sm text-slate-600">
            {confirmActive
              ? `Re-activate ${name}? Login is unblocked and they reappear in directories and payroll.`
              : `Deactivate ${name}? Login is blocked instantly and they are hidden from directories and payroll.`}
          </p>
          <ErrorText error={actionError} />
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmActive(null)}>Cancel</Button>
            <Button variant={confirmActive ? 'primary' : 'danger'} onClick={toggleActive} disabled={busy}>
              {busy ? 'Working…' : confirmActive ? 'Activate' : 'Deactivate'}
            </Button>
          </div>
        </Modal>
      )}

      {editOpen && (
        <Modal title="Edit profile" onClose={() => setEditOpen(false)} wide>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name"><TextInput value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} /></Field>
            <Field label="Last name"><TextInput value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} /></Field>
            <Field label="Phone"><TextInput value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Personal email"><TextInput type="email" value={edit.personalEmail} onChange={(e) => setEdit({ ...edit, personalEmail: e.target.value })} /></Field>
            <Field label="Official email"><TextInput type="email" value={edit.officialEmail} onChange={(e) => setEdit({ ...edit, officialEmail: e.target.value })} /></Field>
            <Field label="Designation"><TextInput value={edit.designation} onChange={(e) => setEdit({ ...edit, designation: e.target.value })} /></Field>
            <Field label="Department"><TextInput value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })} /></Field>
            <Field label="Location"><TextInput value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></Field>
            <Field label="Employment type">
              <Select value={edit.employmentType} onChange={(e) => setEdit({ ...edit, employmentType: e.target.value })}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Annual CTC (INR)"><TextInput type="number" min={0} value={edit.ctc} onChange={(e) => setEdit({ ...edit, ctc: e.target.value })} /></Field>
            <Field label="Notice period (days)"><TextInput type="number" min={0} value={edit.noticePeriodDays} onChange={(e) => setEdit({ ...edit, noticePeriodDays: e.target.value })} /></Field>
            <ManagerSearch label="Reporting manager (leave blank to keep)" value={editRM} onChange={setEditRM} />
            <ManagerSearch label="Functional manager (leave blank to keep)" value={editFM} onChange={setEditFM} />
          </div>
          <ErrorText error={actionError} />
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </Modal>
      )}

      {bankOpen && (
        <Modal title="Edit bank & statutory" onClose={() => setBankOpen(false)}>
          <p className="mb-4 text-xs text-slate-500">Leave a field blank to keep its current value.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              ['pan', 'PAN'], ['aadhaar', 'Aadhaar'], ['bankName', 'Bank name'],
              ['accountNumber', 'Account number'], ['ifsc', 'IFSC'], ['uan', 'UAN'], ['esic', 'ESIC'],
            ] as [string, string][]).map(([key, label]) => (
              <Field key={key} label={label}>
                <TextInput value={bankForm[key] || ''} onChange={(e) => setBankForm({ ...bankForm, [key]: e.target.value })} />
              </Field>
            ))}
          </div>
          <ErrorText error={actionError} />
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setBankOpen(false)}>Cancel</Button>
            <Button onClick={saveBank} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </div>
        </Modal>
      )}

      {resetOpen && (
        <Modal title="Reset password" onClose={() => setResetOpen(false)}>
          <p className="text-sm text-slate-600">
            Reset {name}&apos;s password? A temporary password is generated (shown once and emailed) and a change
            is forced on next login.
          </p>
          <ErrorText error={actionError} />
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={resetPassword} disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</Button>
          </div>
        </Modal>
      )}

      {tempPassword && (
        <Modal title="Temporary password" onClose={() => setTempPassword(null)}>
          <p className="text-sm text-slate-600">Shown once — copy it now. It was also emailed to the employee.</p>
          <div className="my-4 rounded-xl border-2 border-dashed border-herb bg-herb-soft px-6 py-4 text-center font-mono text-2xl font-bold tracking-wider text-herb-dark">
            {tempPassword}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setTempPassword(null)}>Done</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function EmployeeDetailPage() {
  return (
    <Shell>
      <Suspense fallback={<Loading />}>
        <EmployeeDetailInner />
      </Suspense>
    </Shell>
  );
}
