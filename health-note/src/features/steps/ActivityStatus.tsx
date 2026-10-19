import { requestActivity, STATUS_TEXT } from './activity';
import type { TStepSnapshot } from './activity';

import styles from './StepCard.module.scss';

const LOCATION_TEXT: Record<string, string> = {
  permission: '거리와 속도를 측정하려면 정확한 위치 권한이 필요해요.',
  'background-permission':
    '화면을 꺼도 거리를 기록하려면 위치 권한을 ‘항상 허용’으로 설정해 주세요.',
  disabled: '휴대폰 위치 기능을 켜면 이동 거리를 측정할 수 있어요.',
  error: '위치 측정을 시작하지 못했어요. 앱을 다시 실행해 주세요.',
  tracking: '이동 거리를 측정 중이에요. 위치가 확보된 구간만 기록해요.',
  waiting: '움직임이 감지되면 이동 거리를 측정해요.',
};
export default function ActivityStatus({
  snapshot,
  isPreview,
}: {
  snapshot: TStepSnapshot;
  isPreview: boolean;
}) {
  return (
    <div className={styles['status']}>
      <p role="status">{STATUS_TEXT[snapshot.status]}</p>
      {snapshot.activity && snapshot.locationStatus && (
        <p>{LOCATION_TEXT[snapshot.locationStatus] ?? '위치 측정 상태를 확인할 수 없어요.'}</p>
      )}
      {snapshot.locationStatus?.includes('permission') && !isPreview && (
        <button
          type="button"
          className={styles['action-button']}
          onClick={() => requestActivity('location-permission')}
        >
          위치 측정 허용
        </button>
      )}
      {snapshot.activity && snapshot.recognitionReady === false && (
        <p>걷기·달리기 구분을 사용할 수 없어 걸음 센서로 활동을 기록하고 있어요.</p>
      )}
      {snapshot.activity && snapshot.hasStepDetector === false && (
        <p>활동 시간이 일부 누락될 수 있는 기기예요.</p>
      )}
      <p className={styles['note']}>
        {isPreview ? '개발용 미리보기 · 실제 활동 기록이 아니에요.' : '이 휴대폰에만 저장돼요.'}
      </p>
    </div>
  );
}
