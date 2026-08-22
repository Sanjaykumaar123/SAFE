import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fleetApi } from '@/services/api/fleetApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useLocationStore } from '@/store/locationStore';

export function useFleetSummary() {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.fleetSummary(place?.id ?? null, place?.radiusKm ?? 0),
    queryFn: () => fleetApi.summary({ place, radiusKm: place?.radiusKm ?? 0 }),
  });
}

export function useVehicles(status?: string) {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.vehicles(place?.id ?? null, place?.radiusKm ?? 0, status),
    queryFn: () => fleetApi.vehicles({ place, radiusKm: place?.radiusKm ?? 0, status }),
  });
}

export function useVehicleDetail(id: string) {
  return useQuery({ queryKey: queryKeys.vehicleDetail(id), queryFn: () => fleetApi.vehicleDetail(id), enabled: !!id });
}

export function useDisableVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => fleetApi.disableVehicle(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'fleet'] }),
  });
}

export function useOperators() {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.operators(place?.id ?? null, place?.radiusKm ?? 0),
    queryFn: () => fleetApi.operators({ place, radiusKm: place?.radiusKm ?? 0 }),
  });
}

export function useOperatorDetail(id: string) {
  return useQuery({ queryKey: queryKeys.operatorDetail(id), queryFn: () => fleetApi.operatorDetail(id), enabled: !!id });
}

export function useSuspendOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => fleetApi.suspendOperator(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'fleet', 'operators'] }),
  });
}

export function useReactivateOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fleetApi.reactivateOperator(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'fleet', 'operators'] }),
  });
}

export function useFleetQuality() {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.fleetQuality(place?.id ?? null, place?.radiusKm ?? 0),
    queryFn: () => fleetApi.quality({ place, radiusKm: place?.radiusKm ?? 0 }),
  });
}

export function usePayments(status?: string) {
  return useQuery({ queryKey: queryKeys.payments(status), queryFn: () => fleetApi.payments(status) });
}

export function usePaymentActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'fleet', 'payments'] });
  const approve = useMutation({ mutationFn: (id: string) => fleetApi.approvePayment(id), onSuccess: invalidate });
  const hold = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => fleetApi.holdPayment(id, reason), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => fleetApi.rejectPayment(id, reason), onSuccess: invalidate });
  return { approve, hold, reject };
}
