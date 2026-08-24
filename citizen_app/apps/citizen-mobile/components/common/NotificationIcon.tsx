import { AlertTriangle, Bell, CheckCircle2, MapPin, Megaphone } from 'lucide-react-native';

import { AlertType, type AlertTypeType } from '@/constants/alertType';
import { colors } from '@/constants/theme';

const ICONS: Record<AlertTypeType, typeof Bell> = {
  NEARBY_HAZARD: MapPin,
  REPORT_UPDATE: CheckCircle2,
  ROAD_RESOLVED: CheckCircle2,
  CRITICAL_HAZARD: AlertTriangle,
  SYSTEM: Megaphone,
};

const COLORS: Record<AlertTypeType, string> = {
  NEARBY_HAZARD: colors.warning,
  REPORT_UPDATE: colors.secondaryBlue,
  ROAD_RESOLVED: colors.green,
  CRITICAL_HAZARD: colors.critical,
  SYSTEM: colors.purple,
};

export function NotificationIcon({ type, size = 20 }: { type: AlertTypeType; size?: number }) {
  const Icon = ICONS[type] ?? Bell;
  const color = COLORS[type] ?? colors.textSecondary;
  return <Icon size={size} color={color} />;
}

export { AlertType };
