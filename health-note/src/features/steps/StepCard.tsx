import { useEffect, useState } from 'react';

import Confirm from '@/components/common/modal/Confirm';

import styles from './StepCard.module.scss';

type TStepSnapshot = {
  date: string;
  steps: number;
  status: 'unsupported' | 'permission' | 'disabled' | 'tracking' | 'stopped' | 'error';
  enabled: boolean;
};
type TNativeWindow = Window & {
  ReactNativeWebView?: { postMessage(message: string): void };
};
const STATUS_TEXT = {
  unsupported: '이 휴대폰은 걸음 센서를 지원하지 않아요.',
  permission: '신체 활동 권한을 허용하면 자동으로 기록해요.',
  disabled: '자동 기록을 켜면 화면을 꺼도 걸음을 기록해요.',
  tracking: '자동으로 기록 중이에요.',
  stopped: '기록이 중단됐어요. 다시 켜 주세요.',
  error: '측정을 시작하지 못했어요. 다시 시도해 주세요.',
};

export default function StepCard({ today }: { today: string }) {
  const [snapshot, setSnapshot] = useState<TStepSnapshot | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const receive = (event: Event) => {
      const data: unknown = (event as CustomEvent).detail;
      if (!isSnapshot(data)) return;
      setSnapshot(data);
      setIsPending(false);
    };
    const refresh = () => {
      if (document.visibilityState === 'visible') requestSteps('snapshot');
    };
    window.addEventListener('health-note-steps', receive);
    document.addEventListener('visibilitychange', refresh);
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('health-note-steps', receive);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, []);

  if (!snapshot) return null;
  const isTracking = snapshot.status === 'tracking';
  const isSupported = snapshot.status !== 'unsupported';
  const canStop = isTracking;

  function handleToggle() {
    setIsPending(true);
    requestSteps(canStop ? 'stop' : 'start');
  }

  return (
    <section className={styles['step-card']} aria-labelledby="step-card-title">
      <div className={styles['heading']}>
        <h2 id="step-card-title">오늘 걸음</h2>
        {isSupported && (
          <button
            className={styles['action-button']}
            type="button"
            disabled={isPending}
            onClick={handleToggle}
          >
            {canStop ? '자동 기록 끄기' : '자동 기록 켜기'}
          </button>
        )}
      </div>
      {isSupported && (
        <p className={styles['count']}>
          <strong>{(snapshot.date === today ? snapshot.steps : 0).toLocaleString('ko-KR')}</strong>
          <span>걸음</span>
        </p>
      )}
      {snapshot.enabled && !isTracking && isSupported && (
        <button
          className={styles['action-button']}
          type="button"
          disabled={isPending}
          onClick={() => {
            setIsPending(true);
            requestSteps('stop');
          }}
        >
          자동 기록 끄기
        </button>
      )}
      <p className={styles['description']} role="status">
        {STATUS_TEXT[snapshot.status]}
      </p>
      {isSupported && (
        <button
          className={styles['action-button']}
          type="button"
          disabled={isPending}
          onClick={() => setIsResetOpen(true)}
        >
          오늘 기록 초기화
        </button>
      )}
      <Confirm
        isOpen={isResetOpen}
        title="오늘 기록 초기화"
        message="오늘 걸음 기록을 지울까요? 자동 기록 설정과 이전 날짜 기록은 유지돼요."
        confirmLabel="초기화"
        onClose={() => setIsResetOpen(false)}
        onConfirm={() => {
          setIsResetOpen(false);
          setIsPending(true);
          requestSteps('reset');
        }}
      />
      {isSupported && (
        <p className={styles['note']}>
          {isTracking ? '휴대폰을 가지고 걸어 주세요. ' : ''}이 휴대폰에만 저장돼요.
        </p>
      )}
    </section>
  );
}

function requestSteps(action: 'snapshot' | 'start' | 'stop' | 'reset') {
  (window as TNativeWindow).ReactNativeWebView?.postMessage(
    JSON.stringify({ type: 'health-note-steps', action }),
  );
}

function isSnapshot(value: unknown): value is TStepSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.date) &&
    typeof data.steps === 'number' &&
    Number.isSafeInteger(data.steps) &&
    data.steps >= 0 &&
    typeof data.status === 'string' &&
    Object.hasOwn(STATUS_TEXT, data.status) &&
    typeof data.enabled === 'boolean'
  );
}
