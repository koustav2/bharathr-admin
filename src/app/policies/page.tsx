'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, apiUpload, fmt, openFile } from '@/lib/api';
import {
  Button, Card, Chip, Empty, ErrorText, Field, Loading, Modal, Select, Table, Td, TextInput,
} from '@/components/ui';

type PoliciesResp = { catalog: string[]; items: any[] };

const FREE_TEXT = '__free__';

export default function PoliciesPage() {
  const [data, setData] = useState<PoliciesResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [titleChoice, setTitleChoice] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<PoliciesResp>('/admin/policies'));
    } catch (err: any) {
      setError(err.message);
      setData({ catalog: [], items: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openUpload(prefillTitle?: string) {
    const catalog = data?.catalog || [];
    if (prefillTitle && catalog.includes(prefillTitle)) {
      setTitleChoice(prefillTitle);
    } else if (prefillTitle) {
      setTitleChoice(FREE_TEXT);
      setCustomTitle(prefillTitle);
    } else {
      setTitleChoice(catalog[0] || FREE_TEXT);
      setCustomTitle('');
    }
    setCategory('');
    setFile(null);
    setUploadOpen(true);
  }

  async function submitUpload() {
    const title = titleChoice === FREE_TEXT ? customTitle.trim() : titleChoice;
    if (!title || !file) {
      setError('Title and file are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiUpload(
        '/admin/policies',
        { title, category: category.trim() || undefined },
        { part: 'file', blob: file, filename: file.name },
      );
      setUploadOpen(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: any) {
    if (!confirm(`Delete policy "${item.title}"?`)) return;
    setError(null);
    try {
      await api(`/admin/policies/${item.id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <Shell>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Policies</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Uploading with an existing title replaces that policy.
          </p>
        </div>
        <Button onClick={() => openUpload()}>Upload / Replace</Button>
      </div>

      <Card>
        <ErrorText error={error} />
        {data === null ? (
          <Loading />
        ) : data.items.length === 0 ? (
          <Empty message="No policies yet." />
        ) : (
          <Table headers={['Title', 'Category', 'Filename', 'Uploaded', 'Available', '']}>
            {data.items.map((p: any) => (
              <tr key={p.id || p.title} className="hover:bg-slate-50">
                <Td className="font-semibold text-navy">{p.title || '—'}</Td>
                <Td>{p.category || '—'}</Td>
                <Td className="text-xs text-slate-500">{p.filename || '—'}</Td>
                <Td>{fmt.dateTime(p.uploadedAt)}</Td>
                <Td><Chip label={p.available ? 'AVAILABLE' : 'MISSING'} /></Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    {p.available && (
                      <>
                        <button
                          onClick={() => openFile(`/policies/${p.id}/file`)}
                          className="text-sm font-semibold text-herb hover:underline"
                        >
                          View
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="text-sm font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openUpload(p.title)}
                      className="text-sm font-semibold text-navy hover:underline"
                    >
                      Upload/Replace
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {uploadOpen && (
        <Modal title="Upload / Replace policy" onClose={() => setUploadOpen(false)}>
          <div className="space-y-4">
            <Field label="Title">
              <Select value={titleChoice} onChange={(e) => setTitleChoice(e.target.value)}>
                {(data?.catalog || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={FREE_TEXT}>Other (custom title)…</option>
              </Select>
            </Field>
            {titleChoice === FREE_TEXT && (
              <Field label="Custom title">
                <TextInput value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Policy title" />
              </Field>
            )}
            <Field label="Category (optional)">
              <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. HR, Compliance" />
            </Field>
            <Field label="File">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
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
