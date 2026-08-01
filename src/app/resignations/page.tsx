'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { api, downloadFile, fmt } from '@/lib/api';
import { Button, Card, Chip, Empty, ErrorText, Loading, Modal, Table, Tabs, Td } from '@/components/ui';

const TABS = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];

export default function ResignationsPage() {
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async (st: string) => {
    setRows(null);
    setError(null);
    try {
      setRows(await api<any[]>(`/admin/resignations?status=${encodeURIComponent(st)}`));
    } catch (err: any) {
      setError(err.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetail(null);
    setDetailError(null);
    try {
      setDetail(await api<any>(`/resignations/${id}`));
    } catch (err: any) {
      setDetailError(err.message);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      await downloadFile(`/admin/resignations.csv?status=${encodeURIComponent(status)}`, 'resignations.csv');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const stages: any[] = detail?.stages || [];

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Resignations</h1>
        <Button variant="ghost" onClick={exportCsv} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      <Tabs tabs={TABS} active={status} onChange={setStatus} />

      <Card>
        <ErrorText error={error} />
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message={`No ${status.toLowerCase()} resignations.`} />
        ) : (
          <Table headers={['Employee', 'Resignation date', 'Last working date', 'Reason', 'Status', 'Current stage', '']}>
            {rows.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <Td>
                  <div className="font-semibold text-navy">{r.name || r.employeeName || '—'}</div>
                  <div className="font-mono text-xs text-slate-500">{r.empCode || ''}</div>
                </Td>
                <Td className="whitespace-nowrap">{fmt.date(r.resignationDate)}</Td>
                <Td className="whitespace-nowrap">{fmt.date(r.lastWorkingDate)}</Td>
                <Td className="max-w-xs break-words">{r.reason || '—'}</Td>
                <Td><Chip label={r.status} /></Td>
                <Td>{r.currentStage || r.currentStageLabel || '—'}</Td>
                <Td>
                  <Button variant="ghost" className="!px-3 !py-1 text-xs" onClick={() => openDetail(r.id)}>
                    View
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {detailOpen && (
        <Modal title="Resignation detail" onClose={() => setDetailOpen(false)} wide>
          {detailError ? (
            <ErrorText error={detailError} />
          ) : detail === null ? (
            <Loading />
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</div>
                  <div className="font-semibold text-navy">
                    {detail.resignation?.name || detail.resignation?.employeeName || '—'}
                    {detail.resignation?.empCode ? ` (${detail.resignation.empCode})` : ''}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</div>
                  <Chip label={detail.resignation?.status} />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resignation date</div>
                  <div>{fmt.date(detail.resignation?.resignationDate)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last working date</div>
                  <div>{fmt.date(detail.resignation?.lastWorkingDate)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</div>
                  <div>{detail.resignation?.reason || '—'}</div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-navy">Approval stages</div>
                {stages.length === 0 ? (
                  <Empty message="No stages." />
                ) : (
                  <Table headers={['Seq', 'Role', 'Approver', 'Status', 'Note', 'Acted at']}>
                    {stages.map((s: any, i: number) => (
                      <tr key={s.seq ?? i}>
                        <Td>{s.seq ?? i + 1}</Td>
                        <Td className="font-semibold text-navy">{s.roleLabel || '—'}</Td>
                        <Td>
                          {s.approverName || '—'}
                          {s.approverEmpCode ? (
                            <span className="ml-1 font-mono text-xs text-slate-500">({s.approverEmpCode})</span>
                          ) : null}
                        </Td>
                        <Td><Chip label={s.status} /></Td>
                        <Td className="max-w-xs break-words">{s.note || '—'}</Td>
                        <Td className="whitespace-nowrap">{s.actedAt ? fmt.dateTime(s.actedAt) : '—'}</Td>
                      </tr>
                    ))}
                  </Table>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </Shell>
  );
}
