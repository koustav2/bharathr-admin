'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, apiUpload, downloadFile, fmt, openFile } from '@/lib/api';
import {
  Button, Card, Chip, Empty, ErrorText, Field, Loading, Modal, Select, Table, Td, TextInput,
} from '@/components/ui';

// Product Catalogue & Price List — a shared library the marketing / field team
// browses and downloads. Staff upload & delete; everyone can view & download.
const KIND_LABEL: Record<string, string> = { CATALOGUE: 'Catalogue', PRICE_LIST: 'Price List' };
const KIND_FILTERS = [
  { value: '', label: 'All' },
  { value: 'CATALOGUE', label: 'Catalogues' },
  { value: 'PRICE_LIST', label: 'Price lists' },
];

export default function CataloguePage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [kindFilter, setKindFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [kind, setKind] = useState('CATALOGUE');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (k: string) => {
    setError(null);
    try {
      const qs = k ? `?kind=${k}` : '';
      setRows(await api<any[]>(`/catalogue${qs}`));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load(kindFilter);
  }, [kindFilter, load]);

  function openUpload() {
    setKind('CATALOGUE');
    setTitle('');
    setCategory('');
    setFile(null);
    setUploadOpen(true);
  }

  async function submitUpload() {
    if (!title.trim() || !file) {
      setError('Title and file are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiUpload(
        '/admin/catalogue',
        { kind, title: title.trim(), category: category.trim() || undefined },
        { part: 'file', blob: file, filename: file.name },
      );
      setUploadOpen(false);
      await load(kindFilter);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: any) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    setError(null);
    try {
      await api(`/admin/catalogue/${item.id}`, { method: 'DELETE' });
      await load(kindFilter);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <Shell>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Catalogue &amp; Price List</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Product catalogues and updated price lists for the field team.
          </p>
        </div>
        <Button onClick={openUpload}>Upload</Button>
      </div>

      <Card>
        <div className="mb-4 w-52">
          <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
            {KIND_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </Select>
        </div>
        <ErrorText error={error} />
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message="No files uploaded yet." />
        ) : (
          <Table headers={['Type', 'Title', 'Category', 'Filename', 'Uploaded', '']}>
            {rows.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <Td><Chip label={KIND_LABEL[p.kind] || p.kind} /></Td>
                <Td className="font-semibold text-navy">{p.title || '—'}</Td>
                <Td>{p.category || '—'}</Td>
                <Td className="text-xs text-slate-500">{p.filename || '—'}</Td>
                <Td>{fmt.dateTime(p.uploadedAt)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openFile(`/catalogue/${p.id}/file`)}
                      className="text-sm font-semibold text-herb hover:underline"
                    >
                      View
                    </button>
                    <button
                      onClick={() => downloadFile(`/catalogue/${p.id}/file`, p.filename || `${p.title}.pdf`)}
                      className="text-sm font-semibold text-navy hover:underline"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => remove(p)}
                      className="text-sm font-semibold text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {uploadOpen && (
        <Modal title="Upload catalogue / price list" onClose={() => setUploadOpen(false)}>
          <div className="space-y-4">
            <Field label="Type">
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="CATALOGUE">Product Catalogue</option>
                <option value="PRICE_LIST">Price List</option>
              </Select>
            </Field>
            <Field label="Title">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Herbal Range 2026" />
            </Field>
            <Field label="Category (optional)">
              <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. North Zone, Ayurveda" />
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
