import { useState } from 'react';
import { Link } from 'react-router-dom';

import { distance, duration } from './activity';
import { useActivitySnapshot } from './useActivitySnapshot';

import Confirm from '@/components/common/modal/Confirm';
import ActivityStatus from './ActivityStatus';

import styles from './StepCard.module.scss';

export default function StepCard({ today }: { today: string }) {
  const { snapshot, isPreview, reset } = useActivitySnapshot(today);
  const [isResetOpen, setIsResetOpen] = useState(false);
  if (!snapshot) return null;
  const isSupported = snapshot.status !== 'unsupported';
  return (
    <section className={styles['step-card']} aria-labelledby="step-card-title">
      <div className={styles['heading']}>
        <h2 id="step-card-title">오늘 활동</h2>
        {isSupported && <Link to="/activity">자세히 보기 ›</Link>}
      </div>
      {isSupported && (
        <>
          <p className={styles['count']}>
            <strong>{snapshot.steps.toLocaleString('ko-KR')}</strong>
            <span>걸음</span>
          </p>
          <dl className={styles['metrics']}>
            <div>
              <dt>활동 시간</dt>
              <dd>{snapshot.activity ? duration(snapshot.activity.activeMs) : '업데이트 필요'}</dd>
            </div>
            <div>
              <dt>이동 거리</dt>
              <dd>{distance(snapshot.activity)}</dd>
            </div>
          </dl>
        </>
      )}
      <ActivityStatus snapshot={snapshot} isPreview={isPreview} />
      {isSupported && (
        <button
          className={styles['action-button']}
          type="button"
          onClick={() => setIsResetOpen(true)}
        >
          오늘 기록 초기화
        </button>
      )}
      <Confirm
        isOpen={isResetOpen}
        title="오늘 기록 초기화"
        message="오늘 걸음수·시간별 집계·활동 목록을 모두 지울까요? 자동 기록은 계속되고 이전 날짜 기록은 유지돼요."
        confirmLabel="초기화"
        onClose={() => setIsResetOpen(false)}
        onConfirm={() => {
          setIsResetOpen(false);
          reset();
        }}
      />
    </section>
  );
}
