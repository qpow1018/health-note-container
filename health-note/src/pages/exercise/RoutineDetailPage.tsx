import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import toast from '@/utils/toast';
import routineQuery from '@/queries/routineQuery';
import { ROUTINE_LOAD_ERROR } from '@/features/exercise/constants/routineMessages';
import exerciseQuery from '@/queries/exerciseQuery';
import { EXERCISES_LOAD_ERROR } from '@/features/exercise/constants/messages';

import Header from '@/components/common/header/Header';
import BoxLoading from '@/components/common/loading/BoxLoading';
import MoreMenu from '@/components/common/moreMenu/MoreMenu';
import Confirm from '@/components/common/modal/Confirm';

import styles from './RoutineDetailPage.module.scss';

export default function RoutineDetailPage() {
  const { routineId } = useParams();
  return <RoutineDetail key={routineId} routineId={routineId} />;
}

function RoutineDetail({ routineId }: { routineId: string | undefined }) {
  const { mutateAsync: deleteRoutine, isPending: isDeleting } = routineQuery.useDeleteRoutine();
  const navigate = useNavigate();
  const { data: routines = [], isError, isPending, refetch } = routineQuery.useGetRoutines();
  const routine = routines.find((routine) => routine.id === routineId);
  const isSaving = isDeleting;
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  let title = '루틴 상세';
  if (!isPending && !isError && !routine) title = '루틴을 찾을 수 없어요.';
  if (routine) title = routine.name;

  async function handleDelete() {
    if (!routine || isSaving) return;
    setIsDeleteConfirmOpen(false);
    try {
      const result = await deleteRoutine(routine.id);
      if (result === 'in-use') {
        toast.error('진행 중인 플랜에서 사용하는 루틴이에요.');
        return;
      }
    } catch {
      toast.error('삭제하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', {
        isShowCloseButton: true,
      });
      return;
    }
    toast.success('루틴을 삭제했어요.');
    navigate('/exercise', { replace: true });
  }

  return (
    <section className={styles['routine-detail-page']}>
      <Header
        title={title}
        fallbackTo="/exercise"
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
        {isSaving && <p role="status">삭제 중…</p>}
        {isPending && <BoxLoading />}
        {isError && <RoutineDetailLoadError onRetry={() => void refetch()} />}
        {!isPending && !isError && !routine && <MissingRoutine />}
        {routine && (
          <>
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
