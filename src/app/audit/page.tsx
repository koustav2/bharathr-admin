'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, downloadFile, fmt } from '@/lib/api';
import { Button, Card, Empty, ErrorText, Loading, Table, Td } from '@/components/ui';

const PAGE_SIZE = 100;

function detailsText(details: any): string {
  if (details === null || details === undefined || details === '') return '—';
  if (typeof details === 'string') return details;
  try {
    const s = JSON.stringify(details);
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  } catch {
    return String(details);
  }
}

export default function AuditPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadPage = useCallback(async (nextOffset: number) => {
    setError(null);
    try {
      const page = await api<any[]>(`/admin/audit-log?limit=${PAGE_SIZE}&offset=${nextOffset}`);
      const list = Array.isArray(page) ? page : [];
      setRows((prev) => (nextOffset === 0 ? list : [...(prev || []), ...list]));
      setOffset(nextOffset + list.length);
      setHasMore(list.length === PAGE_SIZE);
    } catch (err: any) {
      setError(err.message);
      setRows((prev) => prev || []);
    }
  }, []);

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      await loadPage(offset);
    } finally {
      setLoadingMore(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      await downloadFile('/admin/audit-log.csv', 'audit-log.csv');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Audit log</h1>
        <Button variant="ghost" onClick={exportCsv} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      <Card>
        <ErrorText error={error} />
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message="No audit entries yet." />
        ) : (
          <>
            <Table headers={['When', 'Actor', 'Action', 'Subject', 'Details']}>
              {rows.map((r: any, i: number) => (
                <tr key={r.id ?? i} className="hover:bg-slate-50">
                  <Td className="whitespace-nowrap text-slate-500">{fmt.dateTime(r.createdAt)}</Td>
                  <Td className="font-semibold text-navy">{r.actorName || '—'}</Td>
                  <Td className="font-mono text-xs">{r.action || '—'}</Td>
                  <Td>{r.subject || '—'}</Td>
                  <Td className="max-w-md break-all text-xs text-slate-500">{detailsText(r.details)}</Td>
                </tr>
              ))}
            </Table>
            {hasMore && (
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </Shell>
  );
}
