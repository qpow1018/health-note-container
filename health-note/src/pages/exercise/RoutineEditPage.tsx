import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import routineQuery from '@/queries/routineQuery';
import { ROUTINE_LOAD_ERROR } from '@/features/exercise/constants/routineMessages';
import type { TRoutine, TRoutineValues } from '@/api/routine/type';
import toast from '@/utils/toast';

import Header from '@/components/common/header/Header';
import BoxLoading from '@/components/common/loading/BoxLoading';
import ButtonLink from '@/components/common/button/ButtonLink';
import RoutineForm from '@/features/exercise/RoutineForm';

import styles from './RoutineEditPage.module.scss';

export default function RoutineEditPage() {
  const { routineId } = useParams();
  return <RoutineEditContent key={routineId} routineId={routineId} />;
}

function RoutineEditContent({ routineId }: { routineId: string | undefined }) {
  const { data: routines = [], isError, isPending, refetch } = routineQuery.useGetRoutines();
  const routine = routines.find((routine) => routine.id === routineId);
  const detailTo = `/routine/${encodeURIComponent(routineId ?? '')}`;

  return (
    <section className={styles['routine-edit-page']}>
      <Header title="루틴 수정" backTo={detailTo} />
      <div className={styles['content']}>
        {isPending && <BoxLoading />}
        {isError && <RoutineEditLoadError onRetry={() => void refetch()} />}
        {!isPending && !isError && !routine && <MissingRoutine />}
        {routine && (
          <RoutineEditor initialRoutine={routine} detailTo={detailTo} onRefresh={refetch} />
        )}
      </div>
    </section>
  );
}

function RoutineEditor({
  initialRoutine,
  detailTo,
  onRefresh,
}: {
  initialRoutine: TRoutine;
  detailTo: string;
  onRefresh: () => Promise<unknown>;
}) {
  const [routine] = useState(initialRoutine);
  const { mutateAsync: updateRoutine } = routineQuery.useUpdateRoutine();
  const navigate = useNavigate();
  async function handleSave(values: TRoutineValues): Promise<void> {
    try {
      const result = await updateRoutine({
        id: routine.id,
        values,
        expectedRoutine: routine,
      });
      if (result === 'conflict') {
        await onRefresh();
        toast.error(
          '다른 화면에서 변경된 루틴이에요. 입력은 유지했어요. 상세로 돌아가 최신 내용을 확인한 뒤 다시 수정해 주세요.',
          { isShowCloseButton: true },
        );
        return;
      }
    } catch {
      toast.error(
        '저장하지 못했어요. 루틴 또는 선택한 운동이 삭제되었거나 인터넷 연결에 문제가 있을 수 있어요.',
        { isShowCloseButton: true },
      );
      return;
    }
    toast.success('루틴을 수정했어요.');
    navigate(detailTo, { replace: true });
  }

  return <RoutineForm initialValues={routine} onSave={handleSave} />;
}

function RoutineEditLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
      <p role="alert" className={styles['error']}>
        {ROUTINE_LOAD_ERROR}
      </p>
    </>
  );
}

function MissingRoutine() {
  return (
    <div className={styles['missing']}>
      <p>루틴을 찾을 수 없어요.</p>
      <ButtonLink to="/exercise" color="gray" fill="outline">
        루틴 목록으로
      </ButtonLink>
    </div>
  );
}
