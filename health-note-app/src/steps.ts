import { requireOptionalNativeModule } from 'expo';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

type TStepSnapshot = {
  date: string;
  steps: number;
  status: 'unsupported' | 'permission' | 'tracking' | 'stopped' | 'error';
  activity?: unknown;
  locationStatus?: string;
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


export async function requestActivityLocation() {
  if (!steps) return;
  const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  if (!await PermissionsAndroid.check(fine)) {
    const result = await PermissionsAndroid.requestMultiple([coarse, fine]);
    if (result[fine] !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('정확한 위치 권한이 필요해요', '허용하지 않아도 걸음 기록은 계속돼요. 거리와 속도는 정확한 위치 권한이 있어야 측정할 수 있어요.', [
        { text: '나중에', style: 'cancel' },
        { text: '설정 열기', onPress: () => { void Linking.openSettings(); } },
      ]);
      return;
    }
  }
  if (Number(Platform.Version) >= 29 && !await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION)) {
    if (Number(Platform.Version) === 29) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
    } else {
      Alert.alert('자동 거리 측정 허용', '화면이 꺼져 있어도 걷기·달리기를 감지해 위치를 수집합니다. 앱 설정의 위치 권한에서 ‘항상 허용’을 선택해 주세요. 위치 좌표는 서버에 보내지 않으며 휴대폰에는 시간별 거리와 활동 기록만 저장해요.', [
        { text: '나중에', style: 'cancel' },
        { text: '설정 열기', onPress: () => { void Linking.openSettings(); } },
      ]);
    }
  }
}
