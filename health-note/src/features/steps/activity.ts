export type TActivityMetrics = { activeMs: number; meters: number; measuredMs: number };
export type TActivityHour = TActivityMetrics & { hour: number; steps: number };
export type TActivitySession = TActivityMetrics & {
  start: number;
  end: number;
  kind: string;
  interrupted: boolean;
  isOngoing: boolean;
};
export type TActivity = TActivityMetrics & {
  since: number;
  hours: TActivityHour[];
  sessions: TActivitySession[];
};
export type TStepSnapshot = {
  date: string;
  steps: number;
  status: 'unsupported' | 'permission' | 'disabled' | 'tracking' | 'stopped' | 'error';
  activity?: TActivity;
  locationStatus?: string;
  recognitionReady?: boolean;
  hasStepDetector?: boolean;
};
type TNativeWindow = Window & { ReactNativeWebView?: { postMessage(message: string): void } };
export const STATUS_TEXT = {
  unsupported: '이 휴대폰은 걸음 센서를 지원하지 않아요.',
  permission: '신체 활동 권한을 허용하면 자동으로 기록해요.',
  disabled: '앱을 다시 실행하면 자동 기록을 시작해요.',
  tracking: '자동으로 기록 중이에요.',
  stopped: '기록이 중단됐어요. 앱을 다시 실행해 주세요.',
  error: '측정을 시작하지 못했어요. 앱을 다시 실행해 주세요.',
};
export function isDevelopmentPreview() {
  return import.meta.env.DEV && !(window as TNativeWindow).ReactNativeWebView;
}
export function requestActivity(action: 'snapshot' | 'reset' | 'location-permission') {
  (window as TNativeWindow).ReactNativeWebView?.postMessage(
    JSON.stringify({ type: 'health-note-steps', action }),
  );
}
export function previewActivity(today: string, empty = false): TStepSnapshot {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    steps: 0,
    activeMs: 0,
    meters: 0,
    measuredMs: 0,
  }));
  if (!empty) {
    hours[8] = { hour: 8, steps: 1800, activeMs: 18 * 60000, meters: 1100, measuredMs: 15 * 60000 };
    hours[12] = { hour: 12, steps: 267, activeMs: 3 * 60000, meters: 120, measuredMs: 2 * 60000 };
    hours[18] = {
      hour: 18,
      steps: 2500,
      activeMs: 27 * 60000,
      meters: 1880,
      measuredMs: 23 * 60000,
    };
  }
  const start = new Date(`${today}T08:10:00`).getTime();
  return {
    date: today,
    steps: empty ? 0 : 4567,
    status: 'tracking',
    locationStatus: 'waiting',
    recognitionReady: true,
    hasStepDetector: true,
    activity: {
      since: new Date(`${today}T00:00:00`).getTime(),
      hours,
      activeMs: hours.reduce((sum, h) => sum + h.activeMs, 0),
      meters: hours.reduce((sum, h) => sum + h.meters, 0),
      measuredMs: hours.reduce((sum, h) => sum + h.measuredMs, 0),
      sessions: empty
        ? []
        : [
            {
              start,
              end: start + 21 * 60000,
              activeMs: 18 * 60000,
              meters: 1100,
              measuredMs: 15 * 60000,
              kind: 'walking',
              interrupted: false,
              isOngoing: false,
            },
          ],
    },
  };
}
export function isSnapshot(value: unknown): value is TStepSnapshot {
  if (
    !isObject(value) ||
    typeof value.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
    !isNumber(value.steps) ||
    !Number.isSafeInteger(value.steps) ||
    typeof value.status !== 'string' ||
    !Object.hasOwn(STATUS_TEXT, value.status)
  )
    return false;
  if (value.locationStatus !== undefined && typeof value.locationStatus !== 'string') return false;
  if (value.recognitionReady !== undefined && typeof value.recognitionReady !== 'boolean')
    return false;
  if (value.hasStepDetector !== undefined && typeof value.hasStepDetector !== 'boolean')
    return false;
  if (value.activity === undefined) return true;
  const activity = value.activity;
  return (
    isObject(activity) &&
    isMetrics(activity) &&
    isNumber(activity.since) &&
    Array.isArray(activity.hours) &&
    activity.hours.length === 24 &&
    activity.hours.every(
      (h, i) => isObject(h) && h.hour === i && isNumber(h.steps) && isMetrics(h),
    ) &&
    Array.isArray(activity.sessions) &&
    activity.sessions.every(
      (s) =>
        isObject(s) &&
        isMetrics(s) &&
        isNumber(s.start) &&
        isNumber(s.end) &&
        s.end >= s.start &&
        typeof s.kind === 'string' &&
        typeof s.interrupted === 'boolean' &&
        typeof s.isOngoing === 'boolean',
    )
  );
}
export function duration(ms: number) {
  return ms < 60000 ? `${Math.floor(ms / 1000)}초` : `${Math.floor(ms / 60000)}분`;
}
export function distance(metrics?: TActivityMetrics) {
  return metrics && metrics.measuredMs > 0 ? `${(metrics.meters / 1000).toFixed(2)} km` : '미측정';
}
export function speed(metrics?: TActivityMetrics) {
  return metrics && metrics.measuredMs > 0
    ? `${((metrics.meters / metrics.measuredMs) * 3600).toFixed(1)} km/h`
    : '미측정';
}
function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function isMetrics(value: Record<string, unknown>) {
  return isNumber(value.activeMs) && isNumber(value.meters) && isNumber(value.measuredMs);
}
