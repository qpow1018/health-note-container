import { useState } from 'react';

import routineQuery from '@/queries/routineQuery';
import exerciseQuery from '@/queries/exerciseQuery';
import type { TPlan } from '@/api/plan/type';
import { getPlanSchedule } from '@/features/plan/utils/planSchedule';

import SproutCharacter from '@/features/character/SproutCharacter';
import Checkbox from '@/components/common/form/Checkbox';
import BoxLoading from '@/components/common/loading/BoxLoading';
import Button from '@/components/common/button/Button';

import styles from './HomePlanPreview.module.scss';

export default function HomePlanPreview({ plan, today }: { plan: TPlan; today: string }) {
  return (
    <div className={styles['home-preview']}>
      <p className={styles['preview-notice']}>미리보기 · 완료 체크와 성장은 저장되지 않아요.</p>
      <ActiveHomePlan key={plan.id + today} plan={plan} today={today} />
    </div>
  );
}

function ActiveHomePlan({ plan, today }: { plan: TPlan; today: string }) {
  const {
    data: routines,
    isPending: isRoutinesPending,
    isError: isRoutinesError,
    refetch: refetchRoutines,
  } = routineQuery.useGetRoutines();
  const {
    data: exercises,
    isPending: isExercisesPending,
    isError: isExercisesError,
    refetch: refetchExercises,
  } = exerciseQuery.useGetExercises();
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const assignment = plan.assignments.find((item) => item.weekday === weekday);
  const routine = routines?.find((item) => item.id === assignment?.routineId);
  const completedCount = routine?.exerciseIds.filter((id) => checkedIds.includes(id)).length ?? 0;
  const xp = routine
    ? Math.floor(
        ((plan.targetXp / plan.exerciseDayCount) * completedCount) / routine.exerciseIds.length,
      )
    : 0;
  const { endDate } = getPlanSchedule(
    plan.startDate,
    plan.duration,
    plan.assignments.map((item) => item.weekday),
  );
  const isLoading = isRoutinesPending || isExercisesPending;
  const isError = isRoutinesError || isExercisesError;

  function handleToggle(id: string) {
    setCheckedIds(
      checkedIds.includes(id) ? checkedIds.filter((value) => value !== id) : [...checkedIds, id],
    );
  }

  return (
    <>
      <CharacterPreview xp={xp} />

      <div className={styles['plan-summary']}>
        <span className={styles['plan-info']}>
          <strong>진행 중인 {plan.duration}일 플랜</strong>
          <span>
            {plan.startDate.slice(5).replace('-', '.')} ~ {endDate.slice(5).replace('-', '.')} · 주{' '}
            {plan.assignments.length}일 운동
          </span>
        </span>
      </div>

      <section className={styles['today']} aria-labelledby="home-today-title">
        <div className={styles['section-heading']}>
          <h2 id="home-today-title">오늘 운동</h2>
          <time dateTime={today}>
            {new Date(`${today}T00:00:00`).toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </time>
        </div>
        {!assignment && (
          <div className={styles['rest']}>
            <h3>오늘은 쉬는 날이에요.</h3>
            <p>운동이의 성장은 그대로 남아요. 준비되면 이어가세요.</p>
          </div>
        )}
        {assignment && isLoading && <BoxLoading height={160} />}
        {assignment && isError && (
          <div role="alert">
            <p>오늘 운동을 불러오지 못했어요.</p>
            <Button
              color="gray"
              fill="outline"
              onClick={() => {
                void refetchRoutines();
                void refetchExercises();
              }}
            >
              다시 시도
            </Button>
          </div>
        )}
        {assignment && !isLoading && !isError && !routine && (
          <p>루틴 정보를 확인할 수 없어요. 플랜에서 확인해 주세요.</p>
        )}
        {assignment && routine && !isLoading && !isError && (
          <>
            <div className={styles['routine-heading']}>
              <h3>{routine.name}</h3>
              <span>
                {completedCount} / {routine.exerciseIds.length} 완료
              </span>
            </div>
            <div className={styles['exercise-list']}>
              {routine.exerciseIds.map((id) => {
                const exercise = exercises?.find((item) => item.id === id);
                return (
                  <Checkbox
                    key={id}
                    className={styles['exercise']}
                    checked={checkedIds.includes(id)}
                    disabled={!exercise}
                    onChange={() => handleToggle(id)}
                  >
                    <span className={styles['exercise-name']}>
                      {exercise?.name ?? '운동 정보 없음'}
                    </span>
                    {exercise && (
                      <span className={styles['amount']}>
                        {exercise.amount || '운동량 미입력'}
                        {exercise.sets !== null && ` × ${exercise.sets}세트`}
                      </span>
                    )}
                  </Checkbox>
                );
              })}
            </div>
            <p className={styles['support']} aria-live="polite">
              {completedCount === routine.exerciseIds.length
                ? '오늘 정한 운동을 모두 해냈어요.'
                : '하나씩 해도 괜찮아요.'}
            </p>
          </>
        )}
      </section>
    </>
  );
}

function CharacterPreview({ xp }: { xp: number }) {
  const level = Math.min(10, Math.floor(xp / 1000) + 1);
  const levelXp = level === 10 ? 1000 : xp % 1000;

  return (
    <section className={styles['character-preview']} aria-label="운동이">
      <div className={styles['character-layout']}>
        <div className={styles['artwork']}>
          <SproutCharacter />
        </div>
        <div className={styles['character-info']}>
          <div className={styles['greeting']}>
            <h2>내 속도로 자라는 운동이</h2>
            <p>작은 실천이 모이고 있어요.</p>
          </div>
          <div className={styles['growth-heading']}>
            <strong>Lv.{level}</strong>
            <span>{levelXp.toLocaleString('ko-KR')} / 1,000 XP</span>
          </div>
          <progress aria-label="다음 레벨까지 성장" value={levelXp} max={1000} />
        </div>
      </div>
    </section>
  );
}
