import { requireOptionalNativeModule } from 'expo';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

type TStepSnapshot = {
  date: string;
  steps: number;
  status: 'unsupported' | 'permission' | 'disabled' | 'tracking' | 'stopped' | 'error';
  enabled: boolean;
};
type TStepModule = {
  snapshot(): Promise<TStepSnapshot>;
  start(): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
};

const steps = Platform.OS === 'android'
  ? requireOptionalNativeModule<TStepModule>('HealthNoteSteps') : null;
let commandPending = false;

export async function readSteps(resume = false) {
  if (!steps) return null;
  const snapshot = await steps.snapshot();
  if (resume && snapshot.enabled && snapshot.status === 'stopped') {
    try { await steps.start(); } catch { /* snapshot reports the service error. */ }
    return steps.snapshot();
  }
  return snapshot;
}

export async function changeStepTracking(action: 'start' | 'stop' | 'reset') {
  if (!steps || commandPending) return;
  commandPending = true;
  try {
    if (action === 'reset') { await steps.reset(); return; }
    if (action === 'stop') { await steps.stop(); return; }
    if (Number(Platform.Version) >= 29) {
      const permission = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
      const result = await PermissionsAndroid.request(permission);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert('신체 활동 권한이 필요해요', '앱 설정에서 신체 활동 권한을 허용해 주세요.', [
            { text: '취소', style: 'cancel' },
            { text: '설정 열기', onPress: () => { void Linking.openSettings(); } },
          ]);
        }
        return;
      }
    }
    if (Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    await steps.start();
  } finally {
    commandPending = false;
  }
}

export function createStepsScript(snapshot: TStepSnapshot, origin: string) {
  return `if (location.origin === ${JSON.stringify(origin)}) {
    window.dispatchEvent(new CustomEvent('health-note-steps', { detail: ${JSON.stringify(snapshot)} }));
  } true;`;
}
