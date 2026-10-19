import { requireOptionalNativeModule } from 'expo';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

type TStepSnapshot = {
  date: string;
  steps: number;
  status: 'unsupported' | 'permission' | 'tracking' | 'stopped' | 'error';
};
type TStepModule = {
  snapshot(): Promise<TStepSnapshot>;
  start(): Promise<void>;
  reset(): Promise<void>;
};

const steps = Platform.OS === 'android'
  ? requireOptionalNativeModule<TStepModule>('HealthNoteSteps') : null;
let startup: Promise<void> | null = null;

// One initialization per JS app launch, including concurrent foreground/load events.
export function initializeSteps() {
  startup ??= requestStepPermissionAndStart().catch(() => {
    Alert.alert('걸음 자동 기록을 시작하지 못했어요', '앱을 다시 실행해 주세요.');
  });
  return startup;
}

async function requestStepPermissionAndStart() {
  if (!steps || (await steps.snapshot()).status === 'unsupported') return;
  if (Number(Platform.Version) >= 29) {
    const permission = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
    if (!await PermissionsAndroid.check(permission)) {
      const result = await PermissionsAndroid.request(permission);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert('신체 활동 권한이 필요해요', '앱 설정에서 신체 활동 권한을 허용하면 걸음을 자동으로 기록해요.', [
            { text: '나중에', style: 'cancel' },
            { text: '설정 열기', onPress: () => { void Linking.openSettings(); } },
          ]);
        }
        return;
      }
    }
  }
  if (Number(Platform.Version) >= 33) {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!await PermissionsAndroid.check(permission)) await PermissionsAndroid.request(permission);
  }
  await steps.start();
}

export async function readSteps(resume = false) {
  if (!steps) return null;
  const snapshot = await steps.snapshot();
  if (resume && snapshot.status === 'stopped') {
    try { await steps.start(); } catch { /* snapshot reports the service error. */ }
    return steps.snapshot();
  }
  return snapshot;
}

export async function resetSteps() {
  await steps?.reset();
}

export function createStepsScript(snapshot: TStepSnapshot, origin: string) {
  return `if (location.origin === ${JSON.stringify(origin)}) {
    window.dispatchEvent(new CustomEvent('health-note-steps', { detail: ${JSON.stringify(snapshot)} }));
  } true;`;
}
