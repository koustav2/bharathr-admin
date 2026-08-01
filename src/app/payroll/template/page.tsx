'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { Button, Card, ErrorText, Loading } from '@/components/ui';
import { StructureFields, StructureForm, formToPayload, structureToForm } from '@/components/StructureEditor';

// Company default salary template — pre-fills every new salary structure.
// GET /payroll/template → same template-shaped fields (no CTC) → PUT /payroll/template.

export default function SalaryTemplatePage() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<StructureForm>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<any>('/payroll/template');
        if (!cancelled) setForm(structureToForm(data));
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await api<any>('/payroll/template', { method: 'PUT', body: formToPayload(form) });
      if (data) setForm(structureToForm(data));
      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">Salary template</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          These company defaults pre-fill every new salary structure. Special Allowance auto-balances so that
          gross always equals the employee&apos;s monthly CTC.
        </p>
      </div>

      <Card title="Company default template">
        {loading ? (
          <Loading />
        ) : (
          <div className="space-y-5">
            <StructureFields form={form} onChange={(k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); }} />
            <ErrorText error={error} />
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-sm font-medium text-herb-dark">Saved.</span>}
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save template'}</Button>
            </div>
          </div>
        )}
      </Card>
    </Shell>
  );
}
