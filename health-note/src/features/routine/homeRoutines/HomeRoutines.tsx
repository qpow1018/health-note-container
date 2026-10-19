import { useState } from 'react';
import { Link } from 'react-router-dom';

import routineQuery from '@/queries/routineQuery';
import { ROUTINES_LOAD_ERROR, ROUTINE_PROGRESS_LOAD_ERROR } from '@/features/routine/messages';
import exerciseQuery from '@/queries/exerciseQuery';
import { EXERCISES_LOAD_ERROR } from '@/features/exercise/messages';
import toast from '@/utils/toast';
import {
  getNextRoutineDate,
  getTodayDate,
  isRoutineScheduled,
} from '@/features/routine/routineSchedule';

import ButtonLink from '@/components/common/button/ButtonLink';

import styles from './HomeRoutines.module.scss';

import { MdChevronRight } from 'react-icons/md';

export default function HomeRoutines({ today }: { today: string }) {
  const { mutateAsync: setExerciseCompleted } = routineQuery.useSetExerciseCompleted();
  const [isSaving, setIsSaving] = useState(false);
  const {
    data: progress = [],
    isError: isProgressError,
    isPending: isProgressLoading,
    refetch: refetchProgress,
  } = routineQuery.useGetRoutineProgress(today);
  const {
    data: routines = [],
    isError: isRoutineError,
    isPending: isRoutineLoading,
    refetch: refetchRoutines,
  } = routineQuery.useGetRoutines();
  const {
    data: exercises = [],
    isError: isExerciseError,
    isPending: isExerciseLoading,
    refetch,
  } = exerciseQuery.useGetExercises();
  const routineError = isRoutineError ? ROUTINES_LOAD_ERROR : '';
  const progressError = isProgressError ? ROUTINE_PROGRESS_LOAD_ERROR : '';
  const exerciseError = isExerciseError ? EXERCISES_LOAD_ERROR : '';
  const isLoading = isRoutineLoading || isExerciseLoading || isProgressLoading;
  const error = progressError || routineError || exerciseError;
  const active = routines.filter((routine) => routine.isActive);
  const scheduled = active.filter((routine) => isRoutineScheduled(routine.schedule, today));
  const upcoming = active
    .map((routine) => ({ routine, date: getNextRoutineDate(routine.schedule, today) }))
    .filter((item) => item.date !== null)
    .sort((a, b) => a.date!.localeCompare(b.date!));
  const next = upcoming[0];

  async function handleExerciseCompleted(
    routineId: string,
    exerciseId: string,
    isCompleted: boolean,
  ) {
    if (isSaving) return;
    if (today !== getTodayDate()) {
      toast.error('날짜가 바뀌었어요. 오늘의 루틴을 다시 확인해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await setExerciseCompleted({ routineId, date: today, exerciseId, isCompleted });
    } catch {
      toast.error(
        '완료 상태를 저장하지 못했어요. 인터넷 연결과 루틴 정보를 확인하고 다시 시도해 주세요.',
        {
          isShowCloseButton: true,
        },
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      className={styles['home-routines']}
      aria-label="오늘의 루틴"
      aria-busy={isSaving || isLoading}
    >
      <div className={styles['content']}>
        {isLoading && <p role="status">오늘의 루틴을 불러오고 있어요.</p>}
        {(exerciseError || routineError || progressError) && (
          <button
            type="button"
            onClick={() => {
              void refetch();
              void refetchRoutines();
              void refetchProgress();
            }}
          >
            다시 시도
          </button>
        )}
        {error && (
          <p role="alert" className={styles['error']}>
            {error}
          </p>
        )}
        {!isLoading && !error && scheduled.length > 0 && (
          <ul className={styles['list']}>
            {scheduled.map((routine) => {
              const available = routine.exerciseIds.filter((id) =>
                exercises.some((exercise) => exercise.id === id),
              );
              const checked = progress
                .filter((item) => item.routineId === routine.id)
                .map((item) => item.exerciseId);
              const count = available.filter((id) => checked.includes(id)).length;
              const isComplete = available.length > 0 && count === available.length;
              return (
                <li key={routine.id}>
                  <div className={styles['card']}>
                    <div className={styles['routine-heading']}>
                      <div className={styles['routine-title']}>
                        <h2>{routine.name}</h2>
                        {isComplete && <span className={styles['completed-status']}>완료</span>}
                      </div>
                      <Link
                        to={`/routine/${encodeURIComponent(routine.id)}`}
                        aria-label={`${routine.name} 관리`}
                      >
                        관리 <MdChevronRight aria-hidden="true" />
                      </Link>
                    </div>
                    <progress
                      aria-label={`${routine.name} 진행 상태`}
                      aria-valuetext={`운동 ${available.length}개 중 ${count}개 완료`}
                      max={Math.max(available.length, 1)}
                      value={count}
                    />
                    <ol className={styles['exercises']}>
                      {routine.exerciseIds.map((id) => {
                        const exercise = exercises.find((item) => item.id === id);
                        const isChecked = checked.includes(id);
                        return (
                          <li key={id} className={isChecked ? styles['completed'] : undefined}>
                            {exercise && (
                              <label className={styles['exercise-row']}>
                                <span className={styles['exercise-info']}>
                                  <span className={styles['exercise-name']}>{exercise.name}</span>
                                  <span className={styles['amount']}>
                                    {exercise.amount || '운동량 미입력'}
                                    {exercise.sets !== null && ` × ${exercise.sets}세트`}
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  aria-label={`${exercise.name} 완료`}
                                  checked={isChecked}
                                  disabled={isSaving}
                                  onChange={(event) =>
                                    handleExerciseCompleted(routine.id, id, event.target.checked)
                                  }
                                />
                              </label>
                            )}
                            {!exercise && (
                              <p className={styles['missing']}>
                                삭제된 운동이에요. 완료 대상에서 제외됩니다.
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!isLoading && !error && scheduled.length === 0 && (
          <div className={styles['empty']}>
            {routines.length === 0 && (
              <>
                <p>아직 등록한 루틴이 없어요.</p>
                <ButtonLink to="/routine/new">루틴 생성</ButtonLink>
              </>
            )}
            {routines.length > 0 && active.length === 0 && (
              <>
                <p>활성화된 루틴이 없어요.</p>
                <ButtonLink to="/routine">루틴 관리</ButtonLink>
              </>
            )}
            {active.length > 0 && (
              <>
                <p>오늘 예정된 루틴이 없어요.</p>
                {next && (
                  <p className={styles['upcoming']}>
                    다음 예정 · {next.date}
                    <br />
                    {next.routine.name}
                  </p>
                )}
                <ButtonLink to="/routine">내 루틴 보기</ButtonLink>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
