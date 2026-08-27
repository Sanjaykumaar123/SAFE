import { Redirect, useLocalSearchParams } from 'expo-router';

/** Alias of `reports/[id]` — kept as its own route because section 4's file
 * tree lists `report/[id].tsx` alongside the capture flow, but the actual
 * detail screen (with the full evidence/timeline/status view) lives once,
 * under `reports/[id].tsx` (section 26), to avoid maintaining two copies. */
export default function ReportDetailAlias() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/reports/${id}`} />;
}
