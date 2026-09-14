'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, apiBlob, apiUpload } from '@/lib/api';
import { Button, Card, ErrorText, Field, Loading, TextInput } from '@/components/ui';

// Company settings: the authorised signatory (name + signature image) printed on
// appointment letters when the "include signature" option is on.
export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [signatoryName, setSignatoryName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadPreview = useCallback(async () => {
    try {
      const { url } = await apiBlob('/admin/settings/signature');
      setPreview(url);
    } catch {
      setPreview(null);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await api<any>('/admin/settings');
      setSignatoryName(s?.signatoryName || '');
      setHasSignature(Boolean(s?.hasSignature));
      if (s?.hasSignature) await loadPreview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }, [loadPreview]);

  useEffect(() => { load(); }, [load]);

  async function saveName() {
    setBusy(true); setError(null); setMsg(null);
    try {
      await api('/admin/settings', { method: 'PUT', body: { signatoryName } });
      setMsg('Saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadSignature(file: File) {
    setBusy(true); setError(null); setMsg(null);
    try {
      await apiUpload('/admin/settings/signature', {}, { part: 'file', blob: file, filename: file.name });
      setHasSignature(true);
      setMsg('Signature uploaded.');
      await loadPreview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <Shell><Loading /></Shell>;

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Authorised signatory for appointment letters.</p>
      </div>

      <ErrorText error={error} />
      {msg && <p className="my-2 text-sm font-medium text-herb-dark">{msg}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Authorised signatory">
          <Field label="Signatory name">
            <TextInput value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} placeholder="e.g. Ramesh Kumar, Director" />
          </Field>
          <div className="mt-4">
            <Button onClick={saveName} disabled={busy}>{busy ? 'Saving…' : 'Save name'}</Button>
          </div>
        </Card>

        <Card title="Signature image">
          <p className="mb-3 text-sm text-slate-500">
            {hasSignature ? 'A signature is on file. Upload a new image to replace it.' : 'No signature uploaded yet.'}
          </p>
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="Signature" className="mb-3 max-h-24 rounded border border-slate-200 bg-white p-2" />
          )}
          <label className="inline-block cursor-pointer rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light">
            {busy ? 'Uploading…' : 'Upload signature'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSignature(f); e.currentTarget.value = ''; }}
            />
          </label>
        </Card>
      </div>
    </Shell>
  );
}
