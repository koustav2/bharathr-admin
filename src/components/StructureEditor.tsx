'use client';

import { useEffect, useState } from 'react';
import { api, fmt } from '@/lib/api';
import { Button, ErrorText, Field, Loading, Modal, TextInput } from '@/components/ui';

// Shared salary-structure editing pieces, used by:
//  - /payroll (per-employee structure editor modal)
//  - /payroll/template (company default template form)
//
// Template-shaped fields (per API contract §6):
//   { basicPctOfCtc, hraPctOfBasic, pfPctOfBasic, professionalTax, welfare,
//     allowances: { lta, personal, city, performance, misc } }
// Per-employee structure adds: monthlyCtc (required) + grade (optional).

export type StructureForm = Record<string, string>;

const PCT_FIELDS = [
  { key: 'basicPctOfCtc', label: 'Basic (% of CTC)' },
  { key: 'hraPctOfBasic', label: 'HRA (% of basic)' },
  { key: 'pfPctOfBasic', label: 'PF (% of basic)' },
];

const FIXED_FIELDS = [
  { key: 'professionalTax', label: 'Professional tax (₹ / month)' },
  { key: 'welfare', label: 'Welfare (₹ / month)' },
];

const ALLOWANCE_FIELDS = [
  { key: 'lta', label: 'LTA' },
  { key: 'personal', label: 'Personal' },
  { key: 'city', label: 'City' },
  { key: 'performance', label: 'Performance' },
  { key: 'misc', label: 'Misc' },
];

function toStr(v: any): string {
  return v === null || v === undefined ? '' : String(v);
}

function toNum(v: string): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Flatten an API template/structure object into string form state. */
export function structureToForm(src: any): StructureForm {
  const s = src || {};
  const a = s.allowances || {};
  const form: StructureForm = {};
  for (const f of [...PCT_FIELDS, ...FIXED_FIELDS]) form[f.key] = toStr(s[f.key]);
  for (const f of ALLOWANCE_FIELDS) form[`allow_${f.key}`] = toStr(a[f.key]);
  return form;
}

/** Parse form state back into the template-shaped payload. */
export function formToPayload(form: StructureForm): any {
  const payload: any = { allowances: {} };
  for (const f of [...PCT_FIELDS, ...FIXED_FIELDS]) {
    const n = toNum(form[f.key]);
    if (n !== undefined) payload[f.key] = n;
  }
  for (const f of ALLOWANCE_FIELDS) {
    const n = toNum(form[`allow_${f.key}`]);
    if (n !== undefined) payload.allowances[f.key] = n;
  }
  return payload;
}

/** The shared template-shaped field grid (no CTC / grade). */
export function StructureFields({ form, onChange, disabled }: {
  form: StructureForm;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}) {
  const num = (key: string, label: string) => (
    <Field key={key} label={label}>
      <TextInput
        type="number"
        step="any"
        min={0}
        value={form[key] ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(key, e.target.value)}
      />
    </Field>
  );
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Percentages</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PCT_FIELDS.map((f) => num(f.key, f.label))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Fixed deductions</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FIXED_FIELDS.map((f) => num(f.key, f.label))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Monthly allowances (₹)</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ALLOWANCE_FIELDS.map((f) => num(`allow_${f.key}`, f.label))}
        </div>
      </div>
    </div>
  );
}

/** Render the salary breakup preview the API returns (defensive — shapes vary). */
export function BreakupPreview({ preview }: { preview: any }) {
  if (!preview) return null;
  const rows: { label: string; value: any; strong?: boolean }[] = [];
  const push = (label: string, value: any, strong = false) => {
    if (value !== null && value !== undefined) rows.push({ label, value, strong });
  };

  push('Basic', preview.basic);
  push('HRA', preview.hra);
  const allowances = preview.allowances;
  if (allowances && typeof allowances === 'object') {
    for (const [k, v] of Object.entries(allowances)) push(`Allowance — ${k}`, v);
  } else {
    push('Allowances', allowances);
  }
  push('Special allowance (auto-balance)', preview.specialAllowance);
  push('Gross', preview.gross, true);
  const deductions = preview.deductions;
  if (deductions && typeof deductions === 'object') {
    for (const [k, v] of Object.entries(deductions)) push(`Deduction — ${k}`, v);
  } else {
    push('Deductions', deductions);
  }
  push('Total deductions', preview.totalDeductions, true);
  push('Net', preview.net, true);

  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Monthly breakup preview</div>
      <dl className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className={`flex items-center justify-between text-sm ${r.strong ? 'border-t border-slate-200 pt-1 font-bold text-navy' : 'text-slate-600'}`}>
            <dt className="capitalize">{r.label}</dt>
            <dd className="tabular-nums">{typeof r.value === 'number' ? fmt.money(r.value) : String(r.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Per-employee structure editor, presented as a modal. */
export function StructureEditorModal({ employeeId, employeeName, onClose, onSaved }: {
  employeeId: string;
  employeeName?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<StructureForm>({});
  const [monthlyCtc, setMonthlyCtc] = useState('');
  const [grade, setGrade] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  async function prefillFromTemplate() {
    try {
      const tmpl = await api<any>('/payroll/template');
      setForm(structureToForm(tmpl?.template ?? tmpl));
      setPrefilled(true);
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<any>(`/employees/${employeeId}/salary-structure`);
        if (cancelled) return;
        const structure = data?.structure;
        if (structure) {
          // Existing structure — show its saved values.
          setForm(structureToForm(structure));
          setMonthlyCtc(toStr(structure.monthlyCtc));
          setGrade(toStr(structure.grade));
          setPreview(data?.preview ?? null);
        } else {
          // No structure yet — pre-fill the percentages/allowances from the
          // company template so HR only has to enter the CTC.
          const tmpl = await api<any>('/payroll/template');
          if (cancelled) return;
          setForm(structureToForm(tmpl?.template ?? tmpl));
          setPrefilled(true);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employeeId]);

  async function save() {
    setSaving(true);
    setError(null);
    setWarnings([]);
    try {
      const body: any = { ...formToPayload(form) };
      const ctc = toNum(monthlyCtc);
      if (ctc !== undefined) body.monthlyCtc = ctc;
      if (grade.trim()) body.grade = grade.trim();
      const data = await api<any>(`/employees/${employeeId}/salary-structure`, { method: 'PUT', body });
      setPreview(data?.preview ?? null);
      setWarnings(Array.isArray(data?.warnings) ? data.warnings : []);
      if (data?.structure) {
        setForm(structureToForm(data.structure));
        setMonthlyCtc(toStr(data.structure.monthlyCtc));
        setGrade(toStr(data.structure.grade));
      }
      onSaved?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Salary structure${employeeName ? ` — ${employeeName}` : ''}`} onClose={onClose} wide>
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Monthly CTC (₹)">
              <TextInput type="number" step="any" min={0} value={monthlyCtc} onChange={(e) => setMonthlyCtc(e.target.value)} />
            </Field>
            <Field label="Grade (optional)">
              <TextInput value={grade} onChange={(e) => setGrade(e.target.value)} />
            </Field>
          </div>
          {prefilled && (
            <div className="rounded-lg border border-herb bg-herb-soft p-3 text-sm text-herb-dark">
              Percentages and allowances below are pre-filled from the company salary template.
              Enter the Monthly CTC above — adjust any field if this person differs — then Save.
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Components</div>
            <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={prefillFromTemplate}>
              Prefill from template
            </Button>
          </div>
          <StructureFields form={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="mb-1 font-semibold">Warnings</div>
              <ul className="list-inside list-disc">
                {warnings.map((w, i) => <li key={i}>{String(w)}</li>)}
              </ul>
            </div>
          )}
          <BreakupPreview preview={preview} />
          <ErrorText error={error} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save structure'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
