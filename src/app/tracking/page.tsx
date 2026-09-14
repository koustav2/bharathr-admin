'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import Shell from '@/components/Shell';
import { api, fmt } from '@/lib/api';
import { Card, Empty, ErrorText, Field, Loading, Select, TextInput } from '@/components/ui';

// Live field-force map. Uses the existing staff tracking endpoints:
//  - /tracking/online-summary        → online/offline employee lists
//  - /tracking/:id/latest            → current position (marker)
//  - /tracking/:id/history?date=      → day breadcrumb (route polyline)
// Leaflet is imported dynamically (client-only) to stay static-export safe.
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TrackingPage() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [department, setDepartment] = useState('');
  const [summary, setSummary] = useState<{ online: any[]; offline: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [date, setDate] = useState(today());

  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api<any>('/meta/masters').then((m) => setDepartments(m?.departments || [])).catch(() => {});
  }, []);

  // Init map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current).setView([20.5937, 78.9629], 5); // India
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
    })();
    return () => { cancelled = true; };
  }, []);

  const loadSummary = useCallback(async () => {
    setError(null);
    try {
      const q = department ? `?department=${encodeURIComponent(department)}` : '';
      setSummary(await api<any>(`/tracking/online-summary${q}`));
    } catch (err: any) {
      setError(err.message);
      setSummary({ online: [], offline: [] });
    }
  }, [department]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // Draw the selected employee's latest position + day route.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer || !selected) return;
    layer.clearLayers();
    (async () => {
      try {
        const [latest, history] = await Promise.all([
          api<any>(`/tracking/${selected.employeeId}/latest`).catch(() => null),
          api<any[]>(`/tracking/${selected.employeeId}/history?date=${date}`).catch(() => []),
        ]);
        const pts: [number, number][] = (history || []).map((h) => [h.lat, h.lon]);
        if (pts.length > 1) L.polyline(pts, { color: '#4CAF50', weight: 4 }).addTo(layer);
        pts.forEach((p) => L.circleMarker(p, { radius: 4, color: '#0B1C3B', fillOpacity: 0.6 }).addTo(layer));
        if (latest) {
          L.circleMarker([latest.lat, latest.lon], { radius: 9, color: '#0B1C3B', fillColor: '#4CAF50', fillOpacity: 1, weight: 2 })
            .addTo(layer)
            .bindPopup(`<b>${selected.name}</b><br/>${latest.locality || ''}<br/>${latest.online ? 'Online' : 'Offline'} · ${fmt.dateTime(latest.updatedAt)}`)
            .openPopup();
          map.setView([latest.lat, latest.lon], 14);
        } else if (pts.length) {
          map.fitBounds(pts as any, { padding: [40, 40] });
        }
      } catch {
        /* map draw is best-effort */
      }
    })();
  }, [selected, date]);

  const Item = ({ e, online }: { e: any; online: boolean }) => (
    <button
      onClick={() => setSelected(e)}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${
        selected?.employeeId === e.employeeId ? 'bg-slate-100' : ''
      }`}
    >
      <span>
        <span className="font-medium text-navy">{e.name}</span>
        <span className="ml-2 text-xs text-slate-500">{e.department || e.designation || ''}</span>
      </span>
      <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-herb' : 'bg-slate-300'}`} />
    </button>
  );

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">Live tracking</h1>
        <p className="mt-1 text-sm text-slate-500">Field-force positions and daily routes.</p>
      </div>

      <ErrorText error={error} />
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-3">
          <Card>
            <Field label="Department">
              <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">All departments</option>
                {!departments.includes('Marketing') && <option value="Marketing">Marketing</option>}
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <div className="mt-3">
              <Field label="Route date">
                <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
          </Card>
          <Card title="Employees">
            {summary === null ? (
              <Loading />
            ) : summary.online.length + summary.offline.length === 0 ? (
              <Empty message="No employees." />
            ) : (
              <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                {summary.online.length > 0 && (
                  <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-herb-dark">Online</div>
                )}
                {summary.online.map((e) => <Item key={e.employeeId} e={e} online />)}
                {summary.offline.length > 0 && (
                  <div className="px-1 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Offline</div>
                )}
                {summary.offline.map((e) => <Item key={e.employeeId} e={e} online={false} />)}
              </div>
            )}
          </Card>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div ref={containerRef} style={{ height: '70vh', width: '100%' }} />
        </div>
      </div>
    </Shell>
  );
}
