import { useState } from 'react';
import type { SubmitEvent } from 'react';

import type { TPlanValues } from '@/api/plan/type';
import type { TRoutine } from '@/api/routine/type';
import { useTodayDate } from '@/hooks/useTodayDate';
import { getPlanSchedule } from './utils/planSchedule';

import Radio from '@/components/common/form/Radio';
import Button from '@/components/common/button/Button';
import PlanRoutinePicker from './PlanRoutinePicker';
import BottomSheet from '@/components/common/modal/BottomSheet';
import FieldError from '@/components/common/form/FieldError';

import styles from './PlanForm.module.scss';

import { MdChevronRight } from 'react-icons/md';

type TPlanFormProps = {
  routines: TRoutine[];
  onSave: (values: TPlanValues) => Promise<void>;
};

const DURATIONS = [
  {
    days: 14,
    title: '조금씩 시작해요',
    label: '작은 시작',
    description: '아직 운동이 낯설다면, 작은 실천부터 습관을 만들어봐요.',
  },
  {
    days: 30,
    title: '익숙해진 만큼 이어가요',
    label: '습관 이어가기',
    description: '운동이 조금 익숙해졌다면, 한 달 동안 이어가 볼까요?',
  },
  {
    days: 100,
    title: '꾸준한 일상에 도전해요',
    label: '꾸준한 일상',
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

export default function PlanForm({ routines, onSave }: TPlanFormProps) {
  const today = useTodayDate();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingDay, setEditingDay] = useState<(typeof WEEKDAYS)[number] | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const selectedDuration = DURATIONS.find((item) => item.days === duration);
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

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setFormError('');
    if (duration === null || selectedDays.length === 0) {
      setFormError('기간을 선택하고 최소 하루에 루틴을 배정해 주세요.');
      return;
    }
    if (
      Object.values(assignments).some((id) => id && !routines.some((routine) => routine.id === id))
    ) {
      setFormError('선택한 루틴이 삭제되었어요. 주간 운동표에서 다시 선택해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        startDate: today,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        duration,
        assignments: selectedDays.map(({ day }) => ({ weekday: day, routineId: assignments[day] })),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles['plan-form']} onSubmit={handleSubmit}>
      <fieldset disabled={isSaving}>
        <legend>플랜 기간</legend>
        <p className={styles['hint']}>오늘 시작해요. 나에게 맞는 기간을 선택해 주세요.</p>
        <div className={styles['period-options']}>
          {DURATIONS.map(({ days, title, label }) => (
            <Radio
              key={days}
              className={styles['period-option']}
              name="duration"
              aria-label={`${days}일`}
              aria-description={title}
              value={days}
              checked={duration === days}
              onChange={() => setDuration(days)}
            >
              <span className={styles['period-number']}>
                {days}
                <span className={styles['period-unit']}>일</span>
              </span>
              <span className={styles['period-label']}>{label}</span>
            </Radio>
          ))}
        </div>
        <div className={styles['period-detail']} aria-live="polite">
          {selectedDuration && (
            <>
              <p className={styles['period-title']}>{selectedDuration.title}</p>
              <p className={styles['period-description']}>{selectedDuration.description}</p>
            </>
          )}
          {!selectedDuration && (
            <p className={styles['period-description']}>함께할 기간을 선택해 주세요.</p>
          )}
        </div>
      </fieldset>

      <fieldset disabled={isSaving}>
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
              aria-label={`${label} ${routine?.name ?? '휴식'}`}
              aria-haspopup="dialog"
              onClick={() => setEditingDay({ day, label })}
            >
              <span className={styles['weekday-label']} aria-hidden="true">
                {label.slice(0, 1)}
              </span>
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
        <p className={styles['summary-duration']}>
          {duration === null ? '함께할 기간을 선택해 주세요' : `${duration}일 동안 함께해요`}
        </p>
        <div className={styles['summary-dates']}>
          <div>
            <time dateTime={today}>{today}</time>
            <span>오늘 시작</span>
          </div>
          <span className={styles['date-arrow']} aria-hidden="true">
            →
          </span>
          <div>
            {summary && <time dateTime={summary.endDate}>{summary.endDate}</time>}
            {!summary && <span>기간 선택 후 표시</span>}
            <span>기간 기준 종료일</span>
          </div>
        </div>
        <p className={styles['schedule-count']}>
          주 {selectedDays.length}일 운동
          {summary && ` · 기간 내 총 ${summary.exerciseDays}일`}
        </p>
        {summary && (
          <div className={styles['growth-summary']}>
            <h3>운동이 성장</h3>
            <dl>
              <div>
                <dt>성장 목표</dt>
                <dd>{summary.targetXp.toLocaleString('ko-KR')} XP</dd>
              </div>
              <div>
                <dt>운동일마다</dt>
                <dd>
                  {summary.dailyXp === null
                    ? '—'
                    : `${Number.isInteger(summary.dailyXp) ? '' : '약 '}${summary.dailyXp.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} XP`}
                </dd>
              </div>
            </dl>
            <p className={styles['summary-note']}>
              {summary.dailyXp === null
                ? '운동할 요일을 선택해 주세요.'
                : '예정된 운동을 모두 완료했을 때의 경험치예요.'}
            </p>
          </div>
        )}
        <p className={styles['summary-note']}>기간이 지나도 계속 이어갈 수 있어요.</p>
      </section>
      {selectedDays.length === 0 && (
        <p className={styles['hint']}>최소 하루에 루틴을 배정해 주세요.</p>
      )}
      <FieldError id="plan-form-error" message={formError} />
      <div className={styles['actions']}>
        <Button type="submit" disabled={isSaving || duration === null || selectedDays.length === 0}>
          {isSaving ? '시작 중…' : '플랜 시작'}
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
