'use client';

// Sub-forms for the PUBLIC candidate e-joining wizard (/join).
// These are code-gated public calls — every api() uses { auth: false } and
// uploads go through apiUpload (which sends no auth header when no token exists).

import { useState } from 'react';
import { api, apiUpload } from '@/lib/api';
import { Button, ErrorText, Field, Select, TextInput } from '@/components/ui';
import { LogoMark } from '@/components/Logo';

/** Public header — LogoMark + wordmark, no admin sidebar. */
export function JoinHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
        <LogoMark size={40} />
        <div className="text-lg font-bold text-navy">
          Bharat Herbs <span className="text-herb">— e-Joining</span>
        </div>
      </div>
    </header>
  );
}

/** POST /onboarding/step (public, code-gated). */
async function saveStep(code: string, step: string, data: any) {
  return api('/onboarding/step', { method: 'POST', body: { code, step, data }, auth: false });
}

const NAME_RE = /^[A-Za-z][A-Za-z .]*$/;

type StageProps = { code: string; initial: any; onSaved: () => void };

function SaveBar({ busy, error }: { busy: boolean; error: string | null }) {
  return (
    <>
      <ErrorText error={error} />
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save & continue'}</Button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ PERSONAL */

export function PersonalForm({ code, initial, onSaved }: StageProps) {
  const p = initial || {};
  const [dob, setDob] = useState<string>(p.dob || '');
  const [gender, setGender] = useState<string>(p.gender || '');
  const [maritalStatus, setMaritalStatus] = useState<string>(p.maritalStatus || '');
  const [bloodGroup, setBloodGroup] = useState<string>(p.bloodGroup || '');
  const [ecName, setEcName] = useState<string>(p.emergencyContactName || '');
  const [ecPhone, setEcPhone] = useState<string>(p.emergencyContactPhone || '');
  const [spouseName, setSpouseName] = useState<string>(p.spouseName || '');
  const [weddingDate, setWeddingDate] = useState<string>(p.weddingDate || '');
  const [children, setChildren] = useState<any[]>(Array.isArray(p.children) ? p.children : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setChild(i: number, key: string, v: string) {
    setChildren((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Client-side mirror of the server checks (server re-validates).
    if (!dob || !gender || !maritalStatus || !ecName || !ecPhone) return setError('Please fill all required fields.');
    if (!NAME_RE.test(ecName.trim())) return setError('Emergency contact name must contain letters only.');
    if (!/^\d{10}$/.test(ecPhone)) return setError('Emergency contact mobile must be exactly 10 digits.');
    const data: any = {
      dob,
      gender,
      maritalStatus,
      bloodGroup: bloodGroup || undefined,
      emergencyContactName: ecName.trim(),
      emergencyContactPhone: ecPhone.trim(),
    };
    if (maritalStatus === 'Married') {
      if (!spouseName || !NAME_RE.test(spouseName.trim())) return setError('Spouse name must contain letters only.');
      data.spouseName = spouseName.trim();
      if (weddingDate) data.weddingDate = weddingDate;
      const kids = children
        .filter((c) => c && String(c.name || '').trim() !== '')
        .map((c) => {
          const kid: any = { name: String(c.name).trim(), gender: c.gender || '' };
          if (c.dob) kid.dob = c.dob;
          return kid;
        });
      if (kids.some((k: any) => !NAME_RE.test(k.name))) return setError('Each child name must contain letters only.');
      if (kids.length) data.children = kids;
    }
    setBusy(true);
    try {
      await saveStep(code, 'PERSONAL', data);
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date of birth *">
          <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <Field label="Gender *">
          <Select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Select…</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </Select>
        </Field>
        <Field label="Marital status *">
          <Select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
            <option value="">Select…</option>
            <option>Single</option>
            <option>Married</option>
          </Select>
        </Field>
        <Field label="Blood group">
          <Select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
            <option value="">Select…</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label="Emergency contact name *">
          <TextInput value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Emergency contact mobile *">
          <TextInput value={ecPhone} inputMode="numeric" maxLength={10} onChange={(e) => setEcPhone(e.target.value.replace(/\D/g, ''))} placeholder="10 digits" />
        </Field>
      </div>

      {maritalStatus === 'Married' && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Spouse name *">
              <TextInput value={spouseName} onChange={(e) => setSpouseName(e.target.value)} />
            </Field>
            <Field label="Wedding date">
              <TextInput type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
            </Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Children</span>
              <Button variant="ghost" onClick={() => setChildren((r) => [...r, { name: '', gender: '', dob: '' }])}>+ Add child</Button>
            </div>
            <div className="space-y-2">
              {children.map((c, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <TextInput placeholder="Name" value={c.name || ''} onChange={(e) => setChild(i, 'name', e.target.value)} />
                  <Select value={c.gender || ''} onChange={(e) => setChild(i, 'gender', e.target.value)}>
                    <option value="">Gender…</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </Select>
                  <TextInput type="date" value={c.dob || ''} onChange={(e) => setChild(i, 'dob', e.target.value)} />
                  <Button variant="ghost" onClick={() => setChildren((r) => r.filter((_, idx) => idx !== i))}>Remove</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SaveBar busy={busy} error={error} />
    </form>
  );
}

/* -------------------------------------------------------------------- FAMILY */

export function FamilyForm({ code, initial, onSaved }: StageProps) {
  const f = initial || {};
  const [father, setFather] = useState<string>(f.father?.name || '');
  const [mother, setMother] = useState<string>(f.mother?.name || '');
  const [siblings, setSiblings] = useState<any[]>(Array.isArray(f.siblings) ? f.siblings : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSib(i: number, key: string, v: string) {
    setSiblings((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!father.trim() || !mother.trim()) return setError('Father and mother names are required.');
    if (!NAME_RE.test(father.trim()) || !NAME_RE.test(mother.trim())) return setError('Names must contain letters only.');
    const data: any = { father: { name: father.trim() }, mother: { name: mother.trim() } };
    const sibs = siblings
      .filter((s) => s && String(s.name || '').trim() !== '')
      .map((s) => ({ name: String(s.name).trim(), relation: s.relation || '' }));
    if (sibs.some((s) => !NAME_RE.test(s.name))) return setError('Each sibling name must contain letters only.');
    if (sibs.length) data.siblings = sibs;
    setBusy(true);
    try {
      await saveStep(code, 'FAMILY', data);
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Father's name *">
          <TextInput value={father} onChange={(e) => setFather(e.target.value)} />
        </Field>
        <Field label="Mother's name *">
          <TextInput value={mother} onChange={(e) => setMother(e.target.value)} />
        </Field>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Siblings</span>
          <Button variant="ghost" onClick={() => setSiblings((r) => [...r, { name: '', relation: '' }])}>+ Add sibling</Button>
        </div>
        <div className="space-y-2">
          {siblings.map((s, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <TextInput placeholder="Name" value={s.name || ''} onChange={(e) => setSib(i, 'name', e.target.value)} />
              <Select value={s.relation || ''} onChange={(e) => setSib(i, 'relation', e.target.value)}>
                <option value="">Relation…</option>
                <option>Brother</option>
                <option>Sister</option>
              </Select>
              <Button variant="ghost" onClick={() => setSiblings((r) => r.filter((_, idx) => idx !== i))}>Remove</Button>
            </div>
          ))}
        </div>
      </div>
      <SaveBar busy={busy} error={error} />
    </form>
  );
}

/* ------------------------------------------------------------------- ADDRESS */

const EMPTY_ADDR = { line1: '', state: '', district: '', city: '', pin: '' };

export function AddressForm({ code, initial, onSaved }: StageProps) {
  const a = initial || {};
  const [present, setPresent] = useState<any>({ ...EMPTY_ADDR, ...(a.present || {}) });
  const [permanent, setPermanent] = useState<any>({ ...EMPTY_ADDR, ...(a.permanent || {}) });
  const [sameAsPresent, setSame] = useState<boolean>(Boolean(a.sameAsPresent));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validBlock(b: any) {
    return b.line1 && b.state && b.district && b.city && /^\d{4,10}$/.test(String(b.pin));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validBlock(present)) return setError('Please complete the present address (PIN must be 4–10 digits).');
    const perm = sameAsPresent ? present : permanent;
    if (!sameAsPresent && !validBlock(perm)) return setError('Please complete the permanent address (PIN must be 4–10 digits).');
    setBusy(true);
    try {
      await saveStep(code, 'ADDRESS', { present, sameAsPresent, permanent: perm });
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  const block = (label: string, val: any, set: (v: any) => void, disabled = false) => (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-navy">{label}</div>
      <Field label="Address line *">
        <TextInput value={val.line1} disabled={disabled} onChange={(e) => set({ ...val, line1: e.target.value })} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="State *"><TextInput value={val.state} disabled={disabled} onChange={(e) => set({ ...val, state: e.target.value })} /></Field>
        <Field label="District *"><TextInput value={val.district} disabled={disabled} onChange={(e) => set({ ...val, district: e.target.value })} /></Field>
        <Field label="City *"><TextInput value={val.city} disabled={disabled} onChange={(e) => set({ ...val, city: e.target.value })} /></Field>
        <Field label="PIN *"><TextInput value={val.pin} inputMode="numeric" disabled={disabled} onChange={(e) => set({ ...val, pin: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {block('Present address', present, setPresent)}
      <label className="flex items-center gap-2 text-sm text-navy">
        <input type="checkbox" checked={sameAsPresent} onChange={(e) => setSame(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Permanent address is the same as present
      </label>
      {!sameAsPresent && block('Permanent address', permanent, setPermanent)}
      <SaveBar busy={busy} error={error} />
    </form>
  );
}

/* ----------------------------------------------------------------- EDUCATION */

export function EducationForm({ code, initial, onSaved }: StageProps) {
  const seed = Array.isArray(initial) && initial.length ? initial : [{ level: '', institution: '', board: '', year: '', percentage: '' }];
  const [rows, setRows] = useState<any[]>(seed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setRow(i: number, key: string, v: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: v } : row)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = rows
      .filter((r) => r.level || r.institution || r.year)
      .map((r) => ({
        level: r.level,
        institution: r.institution,
        board: r.board || undefined,
        year: r.year,
        percentage: r.percentage,
      }));
    if (!clean.length) return setError('Add at least one education row.');
    if (clean.some((r) => !r.level || !r.institution || !r.year)) return setError('Level, institution and year are required on each row.');
    setBusy(true);
    try {
      await saveStep(code, 'EDUCATION', clean);
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Level *"><TextInput placeholder="e.g. 10th, Graduation" value={r.level || ''} onChange={(e) => setRow(i, 'level', e.target.value)} /></Field>
            <Field label="Institution *"><TextInput value={r.institution || ''} onChange={(e) => setRow(i, 'institution', e.target.value)} /></Field>
            <Field label="Board / University"><TextInput value={r.board || ''} onChange={(e) => setRow(i, 'board', e.target.value)} /></Field>
            <Field label="Year *"><TextInput value={r.year || ''} inputMode="numeric" onChange={(e) => setRow(i, 'year', e.target.value)} /></Field>
            <Field label="Percentage / CGPA"><TextInput value={r.percentage ?? ''} onChange={(e) => setRow(i, 'percentage', e.target.value)} /></Field>
          </div>
          {rows.length > 1 && (
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>Remove</Button>
            </div>
          )}
        </div>
      ))}
      <Button variant="ghost" onClick={() => setRows((r) => [...r, { level: '', institution: '', board: '', year: '', percentage: '' }])}>+ Add qualification</Button>
      <SaveBar busy={busy} error={error} />
    </form>
  );
}

/* ----------------------------------------------------------------- LANGUAGES */

export function LanguagesForm({ code, initial, onSaved }: StageProps) {
  const [rows, setRows] = useState<any[]>(Array.isArray(initial) ? initial : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLang(language: string) {
    setRows((r) => [...r, { language, speak: true, read: false, write: false, other: '' }]);
  }
  function setRow(i: number, key: string, v: any) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: v } : row)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rows.length) return setError('Add at least one language.');
    for (const r of rows) {
      if (r.language === 'Others' && !String(r.other || '').trim()) return setError('Please specify the language for "Others".');
    }
    const clean = rows.map((r) => {
      const out: any = { language: r.language, speak: !!r.speak, read: !!r.read, write: !!r.write };
      if (r.language === 'Others') out.other = String(r.other).trim();
      return out;
    });
    setBusy(true);
    try {
      await saveStep(code, 'LANGUAGES', clean);
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {['Hindi', 'English', 'Others'].map((l) => (
          <button key={l} type="button" onClick={() => addLang(l)}
            className="rounded-full border border-herb bg-herb-soft px-3 py-1 text-sm font-semibold text-herb-dark hover:bg-herb hover:text-white">
            + {l}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="min-w-[80px] text-sm font-semibold text-navy">{r.language}</span>
              {(['speak', 'read', 'write'] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-sm text-slate-600">
                  <input type="checkbox" checked={!!r[k]} onChange={(e) => setRow(i, k, e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  {k[0].toUpperCase() + k.slice(1)}
                </label>
              ))}
              <button type="button" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="ml-auto text-sm font-semibold text-red-600 hover:underline">Remove</button>
            </div>
            {r.language === 'Others' && (
              <div className="mt-2">
                <TextInput placeholder="Specify language" value={r.other || ''} onChange={(e) => setRow(i, 'other', e.target.value)} />
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-500">Tap a chip above to add a language.</p>}
      </div>
      <SaveBar busy={busy} error={error} />
    </form>
  );
}

/* ---------------------------------------------------------------------- BANK */

export function BankForm({ code, initial, onSaved }: StageProps) {
  const b = initial || {};
  // Saved values return masked (e.g. XXXX1234) — shown as placeholders; re-enter to change.
  const masked = {
    pan: b.pan || '',
    aadhaar: b.aadhaar || '',
    accountNumber: b.accountNumber || '',
  };
  const [pan, setPan] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [bankName, setBankName] = useState<string>(b.bankName || '');
  const [accountNumber, setAccount] = useState('');
  const [ifsc, setIfsc] = useState<string>('');
  const [uan, setUan] = useState<string>(b.uan || '');
  const [esic, setEsic] = useState<string>(b.esic || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const P = pan.toUpperCase().trim();
    const IF = ifsc.toUpperCase().trim();
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(P)) return setError('Invalid PAN (format AAAAA9999A).');
    if (!/^\d{12}$/.test(aadhaar.trim())) return setError('Aadhaar must be 12 digits.');
    if (!bankName.trim()) return setError('Bank name is required.');
    if (!/^\d{9,18}$/.test(accountNumber.trim())) return setError('Account number must be 9–18 digits.');
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(IF)) return setError('Invalid IFSC (format AAAA0XXXXXX).');
    setBusy(true);
    try {
      await saveStep(code, 'BANK', {
        pan: P,
        aadhaar: aadhaar.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: IF,
        uan: uan.trim() || undefined,
        esic: esic.trim() || undefined,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  const savedNote = masked.pan ? (
    <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
      On file — PAN {masked.pan || '—'}, Aadhaar {masked.aadhaar || '—'}, A/C {masked.accountNumber || '—'}. Re-enter below to change.
    </p>
  ) : null;

  return (
    <form onSubmit={submit} className="space-y-4">
      {savedNote}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="PAN *"><TextInput value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder={masked.pan || 'AAAAA9999A'} maxLength={10} /></Field>
        <Field label="Aadhaar *"><TextInput value={aadhaar} inputMode="numeric" maxLength={12} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))} placeholder={masked.aadhaar || '12 digits'} /></Field>
        <Field label="Bank name *"><TextInput value={bankName} onChange={(e) => setBankName(e.target.value)} /></Field>
        <Field label="Account number *"><TextInput value={accountNumber} inputMode="numeric" onChange={(e) => setAccount(e.target.value.replace(/\D/g, ''))} placeholder={masked.accountNumber || '9–18 digits'} /></Field>
        <Field label="IFSC *"><TextInput value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="AAAA0XXXXXX" maxLength={11} /></Field>
        <Field label="UAN"><TextInput value={uan} onChange={(e) => setUan(e.target.value)} /></Field>
        <Field label="ESIC"><TextInput value={esic} onChange={(e) => setEsic(e.target.value)} /></Field>
      </div>
      <SaveBar busy={busy} error={error} />
    </form>
  );
}

/* ------------------------------------------------------ PHOTO & SIGNATURE docs */

export function DocsForm({ code, hasPhoto, hasSignature, onSaved }: {
  code: string; hasPhoto: boolean; hasSignature: boolean; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(docType: 'PHOTO' | 'SIGNATURE', file: File) {
    setError(null);
    setBusy(docType);
    try {
      await apiUpload('/onboarding/document', { code, docType }, { part: 'file', blob: file, filename: file.name });
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setBusy(null);
    }
  }

  const tile = (docType: 'PHOTO' | 'SIGNATURE', label: string, done: boolean) => (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-navy">{label}</span>
        {done && <span className="text-sm font-bold text-herb-dark">✓ Uploaded</span>}
      </div>
      <input
        type="file"
        accept="image/*"
        disabled={busy === docType}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(docType, f); }}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-herb file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-herb-dark"
      />
      {busy === docType && <p className="mt-2 text-xs text-slate-500">Uploading…</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Upload a recent passport photo and a scan/photo of your signature (image files).</p>
      <ErrorText error={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tile('PHOTO', 'Passport photo', hasPhoto)}
        {tile('SIGNATURE', 'Signature', hasSignature)}
      </div>
    </div>
  );
}
