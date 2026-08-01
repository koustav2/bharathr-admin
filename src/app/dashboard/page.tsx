'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { api, fmt, session } from '@/lib/api';
import { Card, Chip, Empty, Loading, StatTile } from '@/components/ui';

// Overview dashboard. Each stat endpoint may 403 for non-staff users — those
// tiles are simply hidden.

type TileData = { label: string; href: string; count: number | null };

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [onboarding, setOnboarding] = useState<any[] | null>(null);
  const [tickets, setTickets] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const results = await Promise.allSettled([
        api<any[]>('/employees?status=ACTIVE'),
        api<any[]>('/onboarding/pending'),
        api<any[]>('/approvals/pending'),
        api<any[]>('/admin/resignations?status=PENDING'),
        api<any[]>('/admin/support?status=PENDING'),
      ]);
      const rows = (r: PromiseSettledResult<any[]>): any[] | null =>
        r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value : []) : null;

      const [emp, onb, appr, resig, supp] = results.map(rows);
      setTiles([
        { label: 'Active employees', href: '/employees', count: emp ? emp.length : null },
        { label: 'Pending onboarding', href: '/onboarding', count: onb ? onb.length : null },
        { label: 'My pending approvals', href: '/approvals', count: appr ? appr.length : null },
        { label: 'Pending resignations', href: '/resignations', count: resig ? resig.length : null },
        { label: 'Open support tickets', href: '/support', count: supp ? supp.length : null },
      ]);
      setOnboarding(onb);
      setTickets(supp);
      setLoading(false);
    })();
  }, []);

  const user = session.user;
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-navy">
          Hello{user?.name ? `, ${user.name}` : ''} 👋
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">{today}</p>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {tiles
              .filter((t) => t.count !== null)
              .map((t) => (
                <Link key={t.href} href={t.href} className="block transition-transform hover:-translate-y-0.5">
                  <StatTile label={t.label} value={t.count as number} accent={(t.count as number) > 0} />
                </Link>
              ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {onboarding !== null && (
              <Card
                title="Pending onboarding"
                actions={
                  <Link href="/onboarding" className="text-xs font-semibold text-herb hover:underline">
                    View all
                  </Link>
                }
              >
                {onboarding.length === 0 ? (
                  <Empty message="Nothing waiting for review." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {onboarding.slice(0, 5).map((r: any) => (
                      <div key={r.id || r.employeeId} className="flex items-center justify-between py-2.5">
                        <div>
                          <div className="text-sm font-semibold text-navy">
                            {r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() || '—'}
                          </div>
                          <div className="text-xs text-slate-500">{r.designation || '—'}</div>
                        </div>
                        <div className="text-xs text-slate-500">{fmt.dateTime(r.submittedAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {tickets !== null && (
              <Card
                title="Open support tickets"
                actions={
                  <Link href="/support" className="text-xs font-semibold text-herb hover:underline">
                    View all
                  </Link>
                }
              >
                {tickets.length === 0 ? (
                  <Empty message="No open tickets." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {tickets.slice(0, 5).map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Chip label={t.category} />
                            <span className="truncate text-sm font-semibold text-navy">{t.issueType || '—'}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">{t.name || t.employeeName || '—'}</div>
                        </div>
                        <div className="shrink-0 text-xs text-slate-500">{fmt.dateTime(t.appliedAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
