import { useState } from 'react';

import type { TRoutine } from '@/api/routine/type';
import { useTodayDate } from '@/hooks/useTodayDate';
import { getPlanSchedule } from './utils/planSchedule';

import Radio from '@/components/common/form/Radio';
import Button from '@/components/common/button/Button';
import PlanRoutinePicker from './PlanRoutinePicker';
import BottomSheet from '@/components/common/modal/BottomSheet';

import styles from './PlanForm.module.scss';

import { MdChevronRight } from 'react-icons/md';

type TPlanFormProps = { routines: TRoutine[] };

const DURATIONS = [
  {
    days: 14,
    title: '조금씩 시작해요',
    description: '아직 운동이 낯설다면, 작은 실천부터 습관을 만들어봐요.',
  },
  {
    days: 30,
    title: '익숙해진 만큼 이어가요',
    description: '운동이 조금 익숙해졌다면, 한 달 동안 이어가 볼까요?',
  },
  {
    days: 100,
    title: '꾸준한 일상에 도전해요',
    description: '운동이 이미 일상이라면, 100일 플랜은 어때요?',
  },
];
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
  const [editingDay, setEditingDay] = useState<(typeof WEEKDAYS)[number] | null>(null);
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
          {DURATIONS.map(({ days, title, description }) => (
            <Radio
              key={days}
              className={styles['period-option']}
              name="duration"
              aria-label={`${days}일`}
              aria-describedby={`plan-duration-${days}-description`}
              value={days}
              checked={duration === days}
              onChange={() => setDuration(days)}
            >
              <span className={styles['period-title']}>
                {days}일 · {title}
              </span>
              <span
                id={`plan-duration-${days}-description`}
                className={styles['period-description']}
              >
                {description}
              </span>
            </Radio>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>주간 운동표</legend>
        <p className={styles['hint']}>
          운동할 요일에 루틴을 배정해 주세요. 같은 루틴을 여러 날 선택할 수 있어요.
        </p>
        {WEEKDAYS.map(({ day, label }) => {
          const routine = routines.find((item) => item.id === assignments[day]);
          return (
            <button
              className={styles['weekday']}
              type="button"
              key={day}
              aria-haspopup="dialog"
              onClick={() => setEditingDay({ day, label })}
            >
              <span className={styles['weekday-label']}>{label}</span>
              <span className={`${styles['routine-name']} ${!routine ? styles['rest'] : ''}`}>
                {routine?.name ?? '휴식'}
              </span>
              <MdChevronRight size={22} aria-hidden="true" />
            </button>
          );
        })}
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
              <div>
                <dt>하루 전체 완료 몫</dt>
                <dd>
                  {summary.dailyXp === null
                    ? '운동할 요일을 선택해 주세요'
                    : `${Number.isInteger(summary.dailyXp) ? '' : '약 '}${summary.dailyXp.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} XP`}
                </dd>
              </div>
            </>
          )}
        </dl>
        <p>기간은 성장과 보상의 기준이에요. 기간이 지나도 계속 이어갈 수 있어요.</p>
      </section>
      {selectedDays.length === 0 && (
        <p className={styles['hint']}>최소 하루에 루틴을 배정해 주세요.</p>
      )}
      <p id="plan-start-notice" className={styles['hint']}>
        지금은 설정 내용을 확인할 수 있어요. 플랜 시작은 아직 준비 중이에요.
      </p>

      <div className={styles['actions']}>
        <Button type="submit" disabled aria-describedby="plan-start-notice">
          플랜 시작
        </Button>
      </div>

      <BottomSheet
        isOpen={editingDay !== null}
        title={editingDay ? `${editingDay.label} 루틴 선택` : '루틴 선택'}
        onClose={() => setEditingDay(null)}
      >
        {editingDay && (
          <PlanRoutinePicker
            routines={routines}
            selectedId={
              routines.some((routine) => routine.id === assignments[editingDay.day])
                ? assignments[editingDay.day]
                : ''
            }
            onSelect={(id) => {
              setAssignments({ ...assignments, [editingDay.day]: id });
              setEditingDay(null);
            }}
          />
        )}
      </BottomSheet>
    </form>
  );
}
