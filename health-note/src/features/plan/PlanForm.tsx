import { useState } from 'react';

import type { TRoutine } from '@/api/routine/type';
import { useTodayDate } from '@/hooks/useTodayDate';
import { getPlanSchedule } from './utils/planSchedule';

import styles from './PlanForm.module.scss';

type TPlanFormProps = { routines: TRoutine[] };
const DURATIONS = [14, 30, 100];
const WEEKDAYS = [
  { day: 1, label: '월요일' },
  { day: 2, label: '화요일' },
  { day: 3, label: '수요일' },
  { day: 4, label: '목요일' },
  { day: 5, label: '금요일' },
  { day: 6, label: '토요일' },
  { day: 0, label: '일요일' },
];

export default function PlanForm({ routines }: TPlanFormProps) {
  const today = useTodayDate();
  const [duration, setDuration] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const selectedDays = WEEKDAYS.filter(({ day }) =>
    routines.some((routine) => routine.id === assignments[day]),
  );
  const summary =
    duration === null
      ? null
      : getPlanSchedule(
          today,
          duration,
          selectedDays.map(({ day }) => day),
        );

  return (
    <form className={styles['plan-form']} onSubmit={(event) => event.preventDefault()}>
      <fieldset>
        <legend>플랜 기간</legend>
        <p className={styles['hint']}>오늘 시작해요. 나에게 맞는 기간을 선택해 주세요.</p>
        <div className={styles['period-options']}>
          {DURATIONS.map((days) => (
            <label key={days}>
              <input
                type="radio"
                name="duration"
                value={days}
                checked={duration === days}
                onChange={() => setDuration(days)}
              />
              <span>{days}일</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>주간 운동표</legend>
        <p className={styles['hint']}>
          운동할 요일에 루틴을 배정해 주세요. 같은 루틴을 여러 날 선택할 수 있어요.
        </p>
        {WEEKDAYS.map(({ day, label }) => (
          <div className={styles['weekday']} key={day}>
            <label htmlFor={`plan-day-${day}`}>{label}</label>
            <select
              id={`plan-day-${day}`}
              value={selectedDays.some((item) => item.day === day) ? assignments[day] : ''}
              onChange={(event) => setAssignments({ ...assignments, [day]: event.target.value })}
            >
              <option value="">휴식</option>
              {routines.map((routine) => (
                <option key={routine.id} value={routine.id}>
                  {routine.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>

      <section className={styles['summary']} aria-labelledby="plan-summary-title">
        <h2 id="plan-summary-title">시작 전 확인</h2>
        <dl>
          <div>
            <dt>시작일</dt>
            <dd>
              <time dateTime={today}>{today}</time> (오늘)
            </dd>
          </div>
          <div>
            <dt>기간</dt>
            <dd>{duration === null ? '선택해 주세요' : `${duration}일`}</dd>
          </div>
          {summary && (
            <div>
              <dt>기간 기준 종료일</dt>
              <dd>
                <time dateTime={summary.endDate}>{summary.endDate}</time>
              </dd>
            </div>
          )}
          <div>
            <dt>주간 운동</dt>
            <dd>주 {selectedDays.length}일</dd>
          </div>
          {summary && (
            <>
              <div>
                <dt>총 운동일</dt>
                <dd>{summary.exerciseDays}일</dd>
              </div>
              <div>
                <dt>최종 성장 목표</dt>
                <dd>{summary.targetXp.toLocaleString('ko-KR')} XP</dd>
              </div>
            </>
          )}
        </dl>
        <p>기간은 성장과 보상의 기준이에요. 기간이 지나도 계속 이어갈 수 있어요.</p>
      </section>
      {selectedDays.length === 0 && (
        <p className={styles['hint']}>최소 하루에 루틴을 배정해 주세요.</p>
      )}
      <button type="submit" disabled aria-describedby="plan-start-notice">
        플랜 시작
      </button>
      <p id="plan-start-notice" className={styles['hint']}>
        지금은 설정 내용을 확인할 수 있어요. 플랜 시작은 아직 준비 중이에요.
      </p>
    </form>
  );
}
