'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, apiBlob, apiUpload } from '@/lib/api';
import {
  Button, Card, Empty, ErrorText, Field, Loading, Modal, Table, Td, TextInput,
} from '@/components/ui';

// Loads a banner image via authenticated blob fetch into an object URL,
// revoking it on unmount.
function BannerImage({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    apiBlob(`/banners/${id}/image`)
      .then(({ url: u }) => {
        objectUrl = u;
        if (active) setUrl(u);
        else URL.revokeObjectURL(u);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  if (failed) return <div className="flex h-14 w-24 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">n/a</div>;
  if (!url) return <div className="h-14 w-24 animate-pulse rounded bg-slate-100" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="banner" className="h-14 w-24 rounded object-cover" />;
}

export default function BannersPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await api<any[]>('/banners'));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openUpload() {
    setTitle('');
    setImage(null);
    setUploadOpen(true);
  }

  async function submitUpload() {
    if (!image) {
      setError('An image file is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiUpload(
        '/admin/banners',
        { title: title.trim() || undefined },
        { part: 'image', blob: image, filename: image.name },
      );
      setUploadOpen(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(banner: any) {
    if (!confirm(`Delete this banner${banner.title ? ` "${banner.title}"` : ''}?`)) return;
    setError(null);
    try {
      await api(`/admin/banners/${banner.id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <Shell>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Banners</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Banners appear as a carousel on every employee&apos;s app home screen.
          </p>
        </div>
        <Button onClick={openUpload}>Upload banner</Button>
      </div>

      <Card>
        <ErrorText error={error} />
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message="No banners uploaded." />
        ) : (
          <Table headers={['Preview', 'Title', 'Order', '']}>
            {rows.map((b: any) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <Td><BannerImage id={b.id} /></Td>
                <Td className="font-semibold text-navy">{b.title || '—'}</Td>
                <Td>{b.sortOrder ?? '—'}</Td>
                <Td>
                  <button onClick={() => remove(b)} className="text-sm font-semibold text-red-600 hover:underline">
                    Delete
                  </button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {uploadOpen && (
        <Modal title="Upload banner" onClose={() => setUploadOpen(false)}>
          <div className="space-y-4">
            <Field label="Title (optional)">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Banner title" />
            </Field>
            <Field label="Image">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-light"
              />
            </Field>
            <ErrorText error={error} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={submitUpload} disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
