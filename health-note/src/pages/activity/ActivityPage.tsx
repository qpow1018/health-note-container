import { useState } from 'react';

import { useTodayDate } from '@/hooks/useTodayDate';
import { useActivitySnapshot } from '@/features/steps/useActivitySnapshot';
import { distance, duration, speed } from '@/features/steps/activity';

import Header from '@/components/common/header/Header';
import ActivityStatus from '@/features/steps/ActivityStatus';

import styles from './ActivityPage.module.scss';

type TMetric = 'steps' | 'activeMs' | 'meters';
const METRICS: { key: TMetric; label: string }[] = [
  { key: 'steps', label: '걸음수' },
  { key: 'activeMs', label: '활동 시간' },
  { key: 'meters', label: '거리' },
];
const KINDS: Record<string, string> = {
  walking: '걷기',
  running: '달리기',
  mixed: '걷기·달리기',
  'on-foot': '걷기·달리기',
};

export default function ActivityPage() {
  const today = useTodayDate();
  const { snapshot, isPreview } = useActivitySnapshot(today);
  const [metric, setMetric] = useState<TMetric>('steps');
  const [hour, setHour] = useState(() => new Date().getHours());
  const activity = snapshot?.activity;
  const maximum = Math.max(1, ...(activity?.hours.map((h) => h[metric]) ?? []));
  const selected = activity?.hours[hour];
  return (
    <section className={styles['activity-page']}>
      <Header title="오늘 활동" fallbackTo="/" />
      <div className={styles['content']}>
        <time dateTime={today}>{today}</time>
        {!snapshot && (
          <p role="status">활동 기록을 불러오는 중이에요. Android 앱에서 확인할 수 있어요.</p>
        )}
        {snapshot && (
          <>
            <dl className={styles['summary']}>
              <div>
                <dt>걸음수</dt>
                <dd>{snapshot.steps.toLocaleString('ko-KR')} 걸음</dd>
              </div>
              <div>
                <dt>활동 시간</dt>
                <dd>{activity ? duration(activity.activeMs) : '업데이트 필요'}</dd>
              </div>
              <div>
                <dt>이동 거리</dt>
                <dd>{distance(activity)}</dd>
              </div>
              <div>
                <dt>이동 중 평균 속도</dt>
                <dd>{speed(activity)}</dd>
              </div>
            </dl>
            <ActivityStatus snapshot={snapshot} isPreview={isPreview} />
            {activity && (
              <>
                <section aria-labelledby="hourly-title" className={styles['hourly']}>
                  <h2 id="hourly-title">시간대별 활동</h2>
                  <div className={styles['metric-buttons']} aria-label="그래프 항목">
                    {METRICS.map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        aria-pressed={metric === item.key}
                        onClick={() => setMetric(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <p className={styles['hint']}>좌우로 밀어 시간을 선택하세요.</p>
                  <div className={styles['chart']} aria-label="시간별 활동 그래프">
                    {activity.hours.map((item) => (
                      <button
                        type="button"
                        key={item.hour}
                        aria-pressed={hour === item.hour}
                        aria-label={`${item.hour}시 ${metric === 'steps' ? `${item.steps}걸음` : metric === 'activeMs' ? duration(item.activeMs) : distance(item)}`}
                        onClick={() => setHour(item.hour)}
                      >
                        <span className={styles['bar-track']}>
                          <span style={{ height: `${(item[metric] / maximum) * 100}%` }} />
                        </span>
                        <span>{item.hour}</span>
                      </button>
                    ))}
                  </div>
                  {selected && (
                    <p className={styles['selection']} role="status">
                      {hour}시–{hour + 1}시 · {selected.steps.toLocaleString('ko-KR')}걸음 · 활동{' '}
                      {duration(selected.activeMs)} · {distance(selected)}
                    </p>
                  )}
                  <p className={styles['hint']}>
                    시간대 기록은 {new Date(activity.since).toLocaleString('ko-KR')}부터예요. 이전
                    총걸음수는 시간별로 나눌 수 없어요.
                  </p>
                </section>
                <section aria-labelledby="sessions-title" className={styles['sessions']}>
                  <h2 id="sessions-title">자동 감지된 활동</h2>
                  <p className={styles['hint']}>
                    활동 시간 3분 이상을 묶어요. 30초 미만의 멈춤은 활동 시간에 포함하고, 30초 이상
                    대기는 제외해요. 3분간 움직임이 없으면 활동을 종료해요.
                  </p>
                  {activity.sessions.length === 0 && (
                    <p>아직 3분 이상 이어진 활동이 없어요. 짧은 이동은 위 그래프에 남아요.</p>
                  )}
                  <ul>
                    {[...activity.sessions].reverse().map((session, i) => (
                      <li key={`${session.start}-${i}`}>
                        <div>
                          <strong>
                            {clock(session.start)}–{clock(session.end)}
                          </strong>
                          <span>
                            {KINDS[session.kind] ?? '활동'}
                            {session.isOngoing ? ' · 진행 중' : ''}
                          </span>
                        </div>
                        <p>
                          활동 {duration(session.activeMs)} · {distance(session)} · 평균{' '}
                          {speed(session)}
                        </p>
                        {session.measuredMs + 10000 < session.activeMs && (
                          <p className={styles['hint']}>일부 구간 거리 미측정</p>
                        )}
                        {session.interrupted && (
                          <p className={styles['hint']}>
                            측정이 중단되어 마지막 움직임까지 저장했어요.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
                <p className={styles['hint']}>
                  활동 시간은 센서 신호로 계산해 짧은 움직임이 일부 누락될 수 있어요. 거리와 평균
                  속도는 유효한 위치가 확보된 이동 구간만 계산해요.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
function clock(time: number) {
  return new Date(time).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
