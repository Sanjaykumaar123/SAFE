/** §21–24/§64 — city + municipality directory and configuration. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_CITIES, DEMO_CITY_CONFIGS, DEMO_MUNICIPALITIES, DEMO_MANAGED_USERS } from '@/services/demo/mockData';
import type { City, CityConfig, Municipality, MunicipalityOfficerSummary } from '@/types/admin';
import type { Paginated } from '@/types/api';

export const cityApi = {
  async list(query = ''): Promise<Paginated<City>> {
    return withFallback(
      async () => (await apiClient.get<Paginated<City>>('/admin/cities', { params: { q: query } })).data,
      () => {
        const q = query.trim().toLowerCase();
        const items = q ? DEMO_CITIES.filter((c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)) : DEMO_CITIES;
        return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
      }
    );
  },

  async detail(id: string): Promise<City> {
    return withFallback(
      async () => (await apiClient.get<City>(`/admin/cities/${id}`)).data,
      () => {
        const city = DEMO_CITIES.find((c) => c.id === id);
        if (!city) throw new Error('City not found');
        return city;
      }
    );
  },

  async config(id: string): Promise<CityConfig> {
    return withFallback(
      async () => (await apiClient.get<CityConfig>(`/admin/cities/${id}/config`)).data,
      () => DEMO_CITY_CONFIGS[id]
    );
  },

  async updateConfig(id: string, patch: Partial<CityConfig>): Promise<CityConfig> {
    return withFallback(
      async () => (await apiClient.patch<CityConfig>(`/admin/cities/${id}/config`, patch)).data,
      () => {
        DEMO_CITY_CONFIGS[id] = { ...DEMO_CITY_CONFIGS[id], ...patch };
        return DEMO_CITY_CONFIGS[id];
      }
    );
  },

  async setStatus(id: string, status: City['status']): Promise<City> {
    return withFallback(
      async () => (await apiClient.post<City>(`/admin/cities/${id}/status`, { status })).data,
      () => {
        const city = DEMO_CITIES.find((c) => c.id === id);
        if (!city) throw new Error('City not found');
        city.status = status;
        city.version += 1;
        return city;
      }
    );
  },
};

export const municipalityApi = {
  async list(placeCityId?: string): Promise<Paginated<Municipality>> {
    return withFallback(
      async () => (await apiClient.get<Paginated<Municipality>>('/admin/municipalities', { params: { cityId: placeCityId } })).data,
      () => {
        const items = placeCityId ? DEMO_MUNICIPALITIES.filter((m) => m.cityId === placeCityId) : DEMO_MUNICIPALITIES;
        return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
      }
    );
  },

  async detail(id: string): Promise<Municipality & { officers: MunicipalityOfficerSummary[] }> {
    return withFallback(
      async () => (await apiClient.get(`/admin/municipalities/${id}`)).data,
      () => {
        const muni = DEMO_MUNICIPALITIES.find((m) => m.id === id);
        if (!muni) throw new Error('Municipality not found');
        const officers = DEMO_MANAGED_USERS.filter((u) => u.role === 'MUNICIPALITY_OFFICER' && u.cityName === muni.cityName).map((u) => ({ id: u.id, name: u.displayName, email: u.email, role: 'Officer', status: u.status }));
        return { ...muni, officers };
      }
    );
  },

  async disableAccess(id: string, reason: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/municipalities/${id}/disable`, { reason });
      },
      () => {
        const muni = DEMO_MUNICIPALITIES.find((m) => m.id === id);
        if (muni) muni.status = 'INACTIVE';
      }
    );
  },
};
