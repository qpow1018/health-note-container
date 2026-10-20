import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropProvider } from '@dnd-kit/react';
import type { DragStartEvent } from '@dnd-kit/react';
import { Accessibility, PointerSensor, PointerActivationConstraints } from '@dnd-kit/dom';
import { isSortable, useSortable } from '@dnd-kit/react/sortable';

import routineQuery from '@/queries/routineQuery';
import type { TRoutine } from '@/api/routine/type';
import { ROUTINES_LOAD_ERROR } from '@/features/exercise/constants/routineMessages';
import toast from '@/utils/toast';

import Button from '@/components/common/button/Button';
import Header from '@/components/common/header/Header';
import BoxLoading from '@/components/common/loading/BoxLoading';

import styles from './RoutineOrderPage.module.scss';

import { MdDragHandle } from 'react-icons/md';

const ORDER_POINTER_SENSOR = PointerSensor.configure({
  activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
});

const ORDER_ACCESSIBILITY = Accessibility.configure({
  screenReaderInstructions: {
    draggable:
      '스페이스 또는 Enter로 이동을 시작하고, 방향키로 위치를 바꾼 뒤 다시 눌러 놓으세요. Escape로 이동을 취소할 수 있어요.',
  },
  announcements: {
    dragstart: ({ operation }: DragStartEvent) =>
      `${operation.source?.data.name ?? '루틴'} 순서 이동을 시작했어요.`,
    dragend: () => undefined,
  },
});

type TSortableRoutineProps = {
  routine: TRoutine;
  index: number;
  isDisabled: boolean;
};

export default function RoutineOrderPage() {
  const navigate = useNavigate();

  const { data: routines, isError, isPending, refetch } = routineQuery.useGetRoutines();

  return (
    <section className={styles['order-page']}>
      <Header title="루틴 순서 변경" onBack={() => navigate('/exercise', { replace: true })} />
      <div className={styles['content']}>
        {isPending && <BoxLoading />}
        {isError && <RoutineOrderLoadError onRetry={() => void refetch()} />}
        {routines !== undefined && <RoutineOrderContent initialRoutines={routines} />}
      </div>
    </section>
  );
}

function RoutineOrderContent({ initialRoutines }: { initialRoutines: TRoutine[] }) {
  const { mutateAsync: reorderRoutines } = routineQuery.useReorderRoutines();
  const navigate = useNavigate();
  const [routines] = useState(initialRoutines);
  const [isSaving, setIsSaving] = useState(false);
  const [orderedIds, setOrderedIds] = useState(() => routines.map((routine) => routine.id));
  const [isDragging, setIsDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const isChanged = orderedIds.some((id, index) => id !== routines[index].id);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await reorderRoutines({
        orderedIds,
        expectedIds: routines.map((routine) => routine.id),
      });
      if (saved === 'conflict') {
        toast.error('목록이 변경되었어요. 목록으로 돌아가 다시 시도해 주세요.', {
          isShowCloseButton: true,
        });
        return;
      }
    } catch {
      toast.error('순서를 저장하지 못했어요. 다시 시도해 주세요.', {
        isShowCloseButton: true,
      });
      return;
    } finally {
      setIsSaving(false);
    }
    toast.success('루틴 순서를 변경했어요.');
    navigate('/exercise', { replace: true });
  }

  function handleMove(from: number, to: number) {
    if (from === to) return;
    const next = [...orderedIds];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    setOrderedIds(next);
    const routine = routines.find((item) => item.id === id)!;
    setAnnouncement(`${routine.name}, ${routines.length}개 중 ${to + 1}번째로 이동했어요.`);
  }

  return (
    <>
      {routines.length === 0 && <p className={styles['hint']}>순서를 변경할 루틴이 없어요.</p>}
      {routines.length > 0 && (
        <>
          <p className={styles['hint']}>핸들을 잡고 옮겨 순서를 바꿔주세요.</p>
          <p className={styles['announcement']} role="status" aria-live="polite">
            {announcement}
          </p>
          <DragDropProvider
            sensors={(defaults) =>
              defaults.map((sensor) => (sensor === PointerSensor ? ORDER_POINTER_SENSOR : sensor))
            }
            plugins={(defaults) =>
              defaults.map((plugin) => (plugin === Accessibility ? ORDER_ACCESSIBILITY : plugin))
            }
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(event) => {
              setIsDragging(false);
              if (event.canceled) {
                setAnnouncement('이동을 취소했어요.');
                return;
              }
              const { source } = event.operation;
              if (isSortable(source)) handleMove(source.initialIndex, source.index);
            }}
          >
            <ul className={styles['list']} aria-label="루틴 순서">
              {orderedIds.map((id, index) => (
                <SortableRoutine
                  key={id}
                  routine={routines.find((routine) => routine.id === id)!}
                  index={index}
                  isDisabled={isSaving}
                />
              ))}
            </ul>
          </DragDropProvider>
          <div className={styles['actions']}>
            <Button disabled={!isChanged || isDragging || isSaving} onClick={handleSave}>
              완료
            </Button>
          </div>
        </>
      )}
    </>
  );
}

function SortableRoutine({ routine, index, isDisabled }: TSortableRoutineProps) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: routine.id,
    index,
    disabled: isDisabled,
    data: { name: routine.name },
  });

  return (
    <li ref={ref} className={`${styles['item']} ${isDragSource ? styles['dragging'] : ''}`}>
      <button
        ref={handleRef}
        disabled={isDisabled}
        type="button"
        className={styles['handle']}
        aria-label={`${routine.name} 순서 이동`}
      >
        <MdDragHandle size={24} aria-hidden="true" />
      </button>
      <div className={styles['info']}>
        <h2>{routine.name}</h2>
        <p>운동 {routine.exerciseIds.length}개</p>
      </div>
    </li>
  );
}

function RoutineOrderLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <p className={styles['error']} role="alert">
        {ROUTINES_LOAD_ERROR}
      </p>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
    </>
  );
}
