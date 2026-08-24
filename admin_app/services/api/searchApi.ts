/** §57 — global entity search (hazard/report/repair/vehicle/operator/
 * municipality/city/user IDs), always server-side — "Do not load the
 * entire database into mobile." */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_CITIES, DEMO_CITIZEN_REPORTS, DEMO_HAZARDS, DEMO_MANAGED_USERS, DEMO_MUNICIPALITIES, DEMO_OPERATORS, DEMO_VEHICLES } from '@/services/demo/mockData';
import type { GlobalSearchResult } from '@/types/admin';

export const searchApi = {
  async search(query: string): Promise<GlobalSearchResult[]> {
    return withFallback(
      async () => (await apiClient.get<GlobalSearchResult[]>('/admin/search', { params: { q: query } })).data,
      () => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const results: GlobalSearchResult[] = [];
        for (const h of DEMO_HAZARDS) {
          if (h.code.toLowerCase().includes(q) || h.title.toLowerCase().includes(q)) results.push({ id: h.id, kind: 'HAZARD', title: h.code, subtitle: `${h.title} · ${h.cityName}` });
        }
        for (const r of DEMO_CITIZEN_REPORTS) {
          if (r.reportCode.toLowerCase().includes(q)) results.push({ id: r.id, kind: 'REPORT', title: r.reportCode, subtitle: `${r.locationText} · ${r.cityName}` });
        }
        for (const v of DEMO_VEHICLES) {
          if (v.plateNumber.toLowerCase().includes(q)) results.push({ id: v.id, kind: 'VEHICLE', title: v.plateNumber, subtitle: `${v.operatorName} · ${v.cityName}` });
        }
        for (const o of DEMO_OPERATORS) {
          if (o.operatorCode.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)) results.push({ id: o.id, kind: 'OPERATOR', title: o.operatorCode, subtitle: `${o.name} · ${o.cityName}` });
        }
        for (const m of DEMO_MUNICIPALITIES) {
          if (m.name.toLowerCase().includes(q)) results.push({ id: m.id, kind: 'MUNICIPALITY', title: m.name, subtitle: m.cityName });
        }
        for (const c of DEMO_CITIES) {
          if (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) results.push({ id: c.id, kind: 'CITY', title: c.name, subtitle: c.state });
        }
        for (const u of DEMO_MANAGED_USERS) {
          if (u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) results.push({ id: u.id, kind: 'USER', title: u.displayName, subtitle: `${u.role} · ${u.email}` });
        }
        return results.slice(0, 40);
      }
    );
  },
};
