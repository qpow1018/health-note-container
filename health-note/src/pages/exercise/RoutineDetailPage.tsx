import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import toast from '@/utils/toast';
import routineQuery from '@/queries/routineQuery';
import type { TRoutineSchedule } from '@/api/routine/type';
import { ROUTINE_LOAD_ERROR } from '@/features/exercise/routineMessages';
import exerciseQuery from '@/queries/exerciseQuery';
import { EXERCISES_LOAD_ERROR } from '@/features/exercise/messages';
import { getNextRoutineDate } from '@/features/exercise/routineSchedule';
import { useRoutineToday } from '@/features/exercise/useRoutineToday';

import Header from '@/components/common/header/Header';
import BoxLoading from '@/components/common/loading/BoxLoading';
import MoreMenu from '@/components/common/moreMenu/MoreMenu';
import Confirm from '@/components/common/modal/Confirm';

import styles from './RoutineDetailPage.module.scss';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function RoutineDetailPage() {
  const { routineId } = useParams();
  return <RoutineDetail key={routineId} routineId={routineId} />;
}

function RoutineDetail({ routineId }: { routineId: string | undefined }) {
  const { mutateAsync: setRoutineActive, isPending: isActivating } =
    routineQuery.useSetRoutineActive();
  const { mutateAsync: deleteRoutine, isPending: isDeleting } = routineQuery.useDeleteRoutine();
  const navigate = useNavigate();
  const { data: routines = [], isError, isPending, refetch } = routineQuery.useGetRoutines();
  const routine = routines.find((routine) => routine.id === routineId);
  const isSaving = isActivating || isDeleting;
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  let title = '루틴 상세';
  if (!isPending && !isError && !routine) title = '루틴을 찾을 수 없어요.';
  if (routine) title = routine.name;

  async function handleToggleActive() {
    if (!routine || isSaving) return;
    try {
      const updated = await setRoutineActive({
        id: routine.id,
        isActive: !routine.isActive,
        expectedIsActive: routine.isActive,
      });
      if (updated === 'conflict') {
        await refetch();
        toast.error('다른 화면에서 활성 상태가 변경되었어요. 현재 상태를 확인해 주세요.', {
          isShowCloseButton: true,
        });
        return;
      }
      toast.success(!routine.isActive ? '루틴을 활성화했어요.' : '루틴을 비활성화했어요.');
    } catch {
      toast.error('활성 상태를 변경하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', {
        isShowCloseButton: true,
      });
    }
  }

  async function handleDelete() {
    if (!routine || isSaving) return;
    setIsDeleteConfirmOpen(false);
    try {
      await deleteRoutine(routine.id);
    } catch {
      toast.error('삭제하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', {
        isShowCloseButton: true,
      });
      return;
    }
    toast.success('루틴을 삭제했어요.');
    navigate('/routine', { replace: true });
  }

  return (
    <section className={styles['routine-detail-page']}>
      <Header
        title={title}
        fallbackTo="/routine"
        actions={
          routine && !isSaving ? (
            <MoreMenu
              items={[
                { label: '수정', to: `/routine/${encodeURIComponent(routine.id)}/edit` },
                { label: '삭제', color: 'rose', onClick: () => setIsDeleteConfirmOpen(true) },
              ]}
            />
          ) : undefined
        }
      />
      <div className={styles['content']}>
        {isSaving && <p role="status">{isDeleting ? '삭제 중…' : '변경 중…'}</p>}
        {isPending && <BoxLoading />}
        {isError && <RoutineDetailLoadError onRetry={() => void refetch()} />}
        {!isPending && !isError && !routine && <MissingRoutine />}
        {routine && (
          <>
            <div className={styles['activation']}>
              <div>
                <p>루틴 활성화</p>
                <p className={routine.isActive ? styles['active-status'] : styles['hint']}>
                  {routine.isActive ? '활성' : '비활성'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="루틴 활성화"
                aria-checked={routine.isActive}
                className={styles['activation-switch']}
                onClick={handleToggleActive}
                disabled={isSaving}
              >
                <span aria-hidden="true" />
              </button>
            </div>
            <RoutineSchedule schedule={routine.schedule} isActive={routine.isActive} />
            <RoutineExercises exerciseIds={routine.exerciseIds} />
            <section className={styles['section']} aria-labelledby="memo-heading">
              <h2 id="memo-heading">메모</h2>
              <p className={routine.memo ? styles['memo'] : styles['hint']}>
                {routine.memo || '-'}
              </p>
            </section>
          </>
        )}
      </div>
      {routine && (
        <Confirm
          isOpen={isDeleteConfirmOpen}
          title="루틴 삭제"
          message={`“${routine.name}” 루틴을 삭제할까요? 삭제하면 복구할 수 없어요.`}
          confirmLabel="삭제"
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </section>
  );
}

function RoutineDetailLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
      <p className={styles['error']} role="alert">
        {ROUTINE_LOAD_ERROR}
      </p>
    </>
  );
}

function MissingRoutine() {
  return <p className={styles['hint']}>목록으로 돌아가 루틴을 선택해 주세요.</p>;
}

function RoutineSchedule({
  schedule,
  isActive,
}: {
  schedule: TRoutineSchedule;
  isActive: boolean;
}) {
  const today = useRoutineToday();
  const nextDate = getNextRoutineDate(schedule, today);
  let summary: string;
  if (schedule.type === 'weekdays') {
    const days = WEEKDAY_ORDER.filter((day) => schedule.days.includes(day));
    summary = `매주 ${days.map((day) => WEEKDAYS[day]).join(' · ')}`;
  } else {
    summary = `${schedule.intervalDays}일 간격`;
  }
  return (
    <section className={styles['section']} aria-labelledby="schedule-heading">
      <h2 id="schedule-heading">반복 일정</h2>
      <p className={styles['schedule-summary']}>{summary}</p>
      <dl className={styles['next-date']}>
        <dt>{isActive ? '다음 예정일' : '활성화 시 다음 예정일'}</dt>
        <dd>
          {nextDate && (
            <>
              <strong>{formatRelativeDate(nextDate, today)}</strong>
              {' · '}
              <time dateTime={nextDate}>{formatDate(nextDate)}</time>
            </>
          )}
          {!nextDate && '표시할 수 있는 다음 예정일이 없어요.'}
        </dd>
      </dl>
      {schedule.type === 'interval' && (
        <p className={styles['schedule-start']}>{formatDate(schedule.startDate)}부터 시작</p>
      )}
    </section>
  );
}

function RoutineExercises({ exerciseIds }: { exerciseIds: string[] }) {
  const { data: exercises = [], isError, isPending } = exerciseQuery.useGetExercises();
  return (
    <section className={styles['section']} aria-labelledby="exercises-heading">
      <h2 id="exercises-heading">
        운동 <span className={styles['exercise-count']}>{exerciseIds.length}개</span>
      </h2>
      {isError && (
        <p className={styles['error']} role="alert">
          {EXERCISES_LOAD_ERROR}
        </p>
      )}
      {isPending && <p role="status">운동을 불러오고 있어요.</p>}
      {!isPending && (!isError || exercises.length > 0) && (
        <ol className={styles['exercise-list']}>
          {exerciseIds.map((id) => {
            const exercise = exercises.find((item) => item.id === id);
            return (
              <li key={id}>
                {exercise && (
                  <>
                    <h3>{exercise.name}</h3>
                    <p className={styles['hint']}>
                      {exercise.amount || '운동량 미입력'}
                      {exercise.sets !== null && ` × ${exercise.sets}세트`}
                    </p>
                  </>
                )}
                {!exercise && <p className={styles['hint']}>삭제된 운동이에요.</p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

function formatRelativeDate(date: string, today: string) {
  const days =
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / (24 * 60 * 60 * 1000);
  if (days === 0) return '오늘';
  if (days === 1) return '내일';
  return `${days}일 후`;
}
