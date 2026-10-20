import { useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import type { DragStartEvent } from '@dnd-kit/react';
import { Accessibility, PointerSensor, PointerActivationConstraints } from '@dnd-kit/dom';
import { isSortable, useSortable } from '@dnd-kit/react/sortable';
import { Link } from 'react-router-dom';

import routineQuery from '@/queries/routineQuery';
import { ROUTINES_LOAD_ERROR } from '@/features/exercise/constants/routineMessages';
import type { TRoutine } from '@/api/routine/type';
import toast from '@/utils/toast';

import ButtonLink from '@/components/common/button/ButtonLink';
import BoxLoading from '@/components/common/loading/BoxLoading';

import styles from './RoutineList.module.scss';

import { MdAdd, MdDragHandle } from 'react-icons/md';

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

export default function RoutineList() {
  const { data: routines = [], isError, isPending, refetch } = routineQuery.useGetRoutines();
  const { mutateAsync: reorderRoutines, isPending: isSaving } = routineQuery.useReorderRoutines();
  const [preview, setPreview] = useState<TRoutine[] | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const displayedRoutines = preview ?? routines;

  async function handleMove(from: number, to: number) {
    if (from === to || isSaving) {
      setPreview(null);
      return true;
    }
    const original = displayedRoutines;
    const next = [...original];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPreview(next);
    try {
      const result = await reorderRoutines({
        orderedIds: next.map((routine) => routine.id),
        expectedIds: original.map((routine) => routine.id),
      });
      if (result === 'conflict') {
        toast.error('목록이 변경되었어요. 다시 시도해 주세요.', { isShowCloseButton: true });
        await refetch();
        return false;
      } else {
        setAnnouncement(`${moved.name}, ${next.length}개 중 ${to + 1}번째로 이동했어요.`);
        return true;
      }
    } catch {
      toast.error('순서를 저장하지 못했어요. 다시 시도해 주세요.', { isShowCloseButton: true });
      return false;
    } finally {
      setPreview(null);
    }
  }

  return (
    <div className={styles['routine-list']}>
      <div className={styles['list-toolbar']}>
        <p>총 {routines.length}개</p>
        <ButtonLink to="/routine/new" className={styles['add-button']} color="mint" fill="outline">
          <MdAdd size={18} aria-hidden="true" />
          루틴 추가
        </ButtonLink>
      </div>

      {isPending && <BoxLoading />}

      {isError && <RoutineLoadError onRetry={() => void refetch()} />}

      {!isPending && !isError && routines.length === 0 && <EmptyRoutines />}

      <p className={styles['announcement']} aria-live="polite">
        {announcement}
      </p>

      {displayedRoutines.length > 0 && (
        <DragDropProvider
          sensors={(defaults) =>
            defaults.map((sensor) => (sensor === PointerSensor ? ORDER_POINTER_SENSOR : sensor))
          }
          plugins={(defaults) =>
            defaults.map((plugin) => (plugin === Accessibility ? ORDER_ACCESSIBILITY : plugin))
          }
          onDragStart={() => setPreview(routines)}
          onDragEnd={async (event) => {
            if (event.canceled) {
              setPreview(null);
              setAnnouncement('이동을 취소했어요.');
              return;
            }
            const { source } = event.operation;
            if (!isSortable(source)) {
              setPreview(null);
              return;
            }
            const { resume, abort } = event.suspend();
            const saved = await handleMove(source.initialIndex, source.index);
            if (saved) resume();
            else abort();
          }}
        >
          <ul className={styles['list']} aria-label="등록한 루틴" aria-busy={isSaving}>
            {displayedRoutines.map((routine, index) => (
              <SortableRoutine
                key={routine.id}
                routine={routine}
                index={index}
                isDisabled={isSaving || isError || displayedRoutines.length < 2}
              />
            ))}
          </ul>
        </DragDropProvider>
      )}
    </div>
  );
}

function SortableRoutine({
  routine,
  index,
  isDisabled,
}: {
  routine: TRoutine;
  index: number;
  isDisabled: boolean;
}) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: routine.id,
    index,
    disabled: isDisabled,
    data: { name: routine.name },
  });
  return (
    <li ref={ref} className={`${styles['item']} ${isDragSource ? styles['dragging'] : ''}`}>
      <Link className={styles['detail-link']} to={`/routine/${encodeURIComponent(routine.id)}`}>
        <div className={styles['info']}>
          <h2>{routine.name}</h2>
          <p>운동 {routine.exerciseIds.length}개</p>
        </div>
      </Link>
      <button
        ref={handleRef}
        type="button"
        disabled={isDisabled}
        className={styles['handle']}
        aria-label={`${routine.name} 순서 이동`}
      >
        <MdDragHandle size={24} aria-hidden="true" />
      </button>
    </li>
  );
}

function RoutineLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
      <p role="alert" className={styles['error']}>
        {ROUTINES_LOAD_ERROR}
      </p>
    </>
  );
}

function EmptyRoutines() {
  return (
    <div className={styles['empty']}>
      <p>아직 등록한 루틴이 없어요.</p>
      <p className={styles['hint']}>함께 할 운동을 묶어 루틴을 만들어보세요.</p>
    </div>
  );
}
