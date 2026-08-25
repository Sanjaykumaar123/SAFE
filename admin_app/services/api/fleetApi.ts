/** §25–29 — fleet vehicles, operators, quality, payments. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_FLEET_QUALITY, DEMO_OPERATORS, DEMO_PAYMENTS, DEMO_VEHICLES, buildVehicleDetail } from '@/services/demo/mockData';
import type { FleetOperator, FleetPayment, FleetQualitySummary, FleetVehicle, FleetVehicleDetail } from '@/types/admin';
import type { Paginated } from '@/types/api';
import type { GeoPoint } from '@/types/geo';
import { distanceKm } from '@/utils/geo';

export interface FleetScopeParams {
  place: GeoPoint | null;
  radiusKm: number;
}

function scopeVehicles(params: FleetScopeParams): FleetVehicle[] {
  if (!params.place) return DEMO_VEHICLES.filter((v) => v.status === 'LIVE').slice(0, 40);
  return DEMO_VEHICLES.map((v) => ({ ...v, distanceKm: distanceKm(params.place!, v) }))
    .filter((v) => v.distanceKm! <= params.radiusKm)
    .sort((a, b) => a.distanceKm! - b.distanceKm!);
}

export const fleetApi = {
  async summary(params: FleetScopeParams) {
    const vehicles = scopeVehicles(params);
    const fallbackSummary = {
      activeVehicles: vehicles.filter((v) => v.status === 'LIVE').length || 36,
      offlineVehicles: vehicles.filter((v) => v.status === 'OFFLINE').length || 4,
      operators: DEMO_OPERATORS.length,
      coveragePct: DEMO_FLEET_QUALITY.coveragePct,
      observationsToday: 240,
      dataQualityPct: DEMO_FLEET_QUALITY.gpsAccuracyPct,
    };

    return withFallback(
      async () => {
        const response = await apiClient.get('/admin/fleet', { params: { lat: params.place?.latitude, lon: params.place?.longitude, radiusKm: params.radiusKm } });
        if (response.data && typeof response.data === 'object' && response.data.activeVehicles) {
          return { ...fallbackSummary, ...response.data };
        }
        return fallbackSummary;
      },
      () => fallbackSummary
    );
  },

  async vehicles(params: FleetScopeParams & { status?: string }): Promise<Paginated<FleetVehicle>> {
    let items = scopeVehicles(params);
    if (params.status && params.status !== 'ALL') items = items.filter((v) => v.status === params.status);
    const fallbackList = { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };

    return withFallback(
      async () => {
        const response = await apiClient.get<Paginated<FleetVehicle>>('/admin/vehicles', { params: { lat: params.place?.latitude, lon: params.place?.longitude, radiusKm: params.radiusKm, status: params.status } });
        if (response.data && Array.isArray(response.data.items) && response.data.items.length > 0) {
          return response.data;
        }
        return fallbackList;
      },
      () => fallbackList
    );
  },

  async vehicleDetail(id: string): Promise<FleetVehicleDetail> {
    return withFallback(
      async () => (await apiClient.get<FleetVehicleDetail>(`/admin/vehicles/${id}`)).data,
      () => {
        const vehicle = DEMO_VEHICLES.find((v) => v.id === id);
        if (!vehicle) throw new Error('Vehicle not found');
        return buildVehicleDetail(vehicle);
      }
    );
  },

  async disableVehicle(id: string, reason: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/vehicles/${id}/disable`, { reason });
      },
      () => {
        const vehicle = DEMO_VEHICLES.find((v) => v.id === id);
        if (vehicle) vehicle.status = 'DISABLED';
      }
    );
  },

  async operators(params: FleetScopeParams): Promise<Paginated<FleetOperator>> {
    return withFallback(
      async () => (await apiClient.get<Paginated<FleetOperator>>('/admin/operators', { params: { lat: params.place?.latitude, lon: params.place?.longitude, radiusKm: params.radiusKm } })).data,
      () => {
        const cityNames = params.place ? new Set(scopeVehicles(params).map((v) => v.cityName)) : null;
        const items = cityNames ? DEMO_OPERATORS.filter((o) => cityNames.has(o.cityName)) : DEMO_OPERATORS;
        return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
      }
    );
  },

  async operatorDetail(id: string): Promise<FleetOperator> {
    return withFallback(
      async () => (await apiClient.get<FleetOperator>(`/admin/operators/${id}`)).data,
      () => {
        const op = DEMO_OPERATORS.find((o) => o.id === id);
        if (!op) throw new Error('Operator not found');
        return op;
      }
    );
  },

  async suspendOperator(id: string, reason: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/operators/${id}/suspend`, { reason });
      },
      () => {
        const op = DEMO_OPERATORS.find((o) => o.id === id);
        if (op) op.status = 'SUSPENDED';
      }
    );
  },

  async reactivateOperator(id: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/operators/${id}/reactivate`);
      },
      () => {
        const op = DEMO_OPERATORS.find((o) => o.id === id);
        if (op) op.status = 'ACTIVE';
      }
    );
  },

  async quality(params: FleetScopeParams): Promise<FleetQualitySummary> {
    return withFallback(
      async () => (await apiClient.get<FleetQualitySummary>('/admin/fleet/quality', { params: { lat: params.place?.latitude, lon: params.place?.longitude, radiusKm: params.radiusKm } })).data,
      () => DEMO_FLEET_QUALITY
    );
  },

  async payments(status?: string): Promise<Paginated<FleetPayment>> {
    return withFallback(
      async () => (await apiClient.get<Paginated<FleetPayment>>('/admin/payments', { params: { status } })).data,
      () => {
        const items = status && status !== 'ALL' ? DEMO_PAYMENTS.filter((p) => p.status === status) : DEMO_PAYMENTS;
        return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
      }
    );
  },

  async approvePayment(id: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/payments/${id}/approve`);
      },
      () => {
        const p = DEMO_PAYMENTS.find((x) => x.id === id);
        if (p) p.status = 'APPROVED';
      }
    );
  },
  async holdPayment(id: string, reason: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/payments/${id}/hold`, { reason });
      },
      () => {
        const p = DEMO_PAYMENTS.find((x) => x.id === id);
        if (p) p.status = 'HELD';
      }
    );
  },
  async rejectPayment(id: string, reason: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/payments/${id}/reject`, { reason });
      },
      () => {
        const p = DEMO_PAYMENTS.find((x) => x.id === id);
        if (p) p.status = 'REJECTED';
      }
    );
  },
};
