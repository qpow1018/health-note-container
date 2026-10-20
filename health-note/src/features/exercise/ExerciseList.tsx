import { useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import type { DragStartEvent } from '@dnd-kit/react';
import { Accessibility, PointerSensor, PointerActivationConstraints } from '@dnd-kit/dom';
import { isSortable, useSortable } from '@dnd-kit/react/sortable';
import { Link } from 'react-router-dom';

import exerciseQuery from '@/queries/exerciseQuery';
import { EXERCISES_LOAD_ERROR } from '@/features/exercise/constants/messages';
import type { TExercise } from '@/api/exercise/type';
import toast from '@/utils/toast';

import ButtonLink from '@/components/common/button/ButtonLink';
import BoxLoading from '@/components/common/loading/BoxLoading';

import styles from './ExerciseList.module.scss';

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
      `${operation.source?.data.name ?? '운동'} 순서 이동을 시작했어요.`,
    dragend: () => undefined,
  },
});

export default function ExerciseList() {
  const { data: exercises = [], isError, isPending, refetch } = exerciseQuery.useGetExercises();
  const { mutateAsync: reorderExercises, isPending: isSaving } =
    exerciseQuery.useReorderExercises();
  const [preview, setPreview] = useState<TExercise[] | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const displayedExercises = preview ?? exercises;

  async function handleMove(from: number, to: number) {
    if (from === to || isSaving) {
      setPreview(null);
      return true;
    }
    const original = displayedExercises;
    const next = [...original];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPreview(next);
    try {
      const result = await reorderExercises({
        orderedIds: next.map((exercise) => exercise.id),
        expectedIds: original.map((exercise) => exercise.id),
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
    <div className={styles['exercise-list']}>
      <div className={styles['list-toolbar']}>
        <p>총 {exercises.length}개</p>
        <ButtonLink to="/exercise/new" className={styles['add-button']} color="mint" fill="outline">
          <MdAdd size={18} aria-hidden="true" />
          운동 추가
        </ButtonLink>
      </div>

      {isPending && <BoxLoading />}

      {isError && <ExerciseLoadError onRetry={() => void refetch()} />}

      {!isPending && !isError && exercises.length === 0 && <EmptyExercises />}

      <p className={styles['announcement']} aria-live="polite">
        {announcement}
      </p>

      {displayedExercises.length > 0 && (
        <DragDropProvider
          sensors={(defaults) =>
            defaults.map((sensor) => (sensor === PointerSensor ? ORDER_POINTER_SENSOR : sensor))
          }
          plugins={(defaults) =>
            defaults.map((plugin) => (plugin === Accessibility ? ORDER_ACCESSIBILITY : plugin))
          }
          onDragStart={() => setPreview(exercises)}
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
          <ul className={styles['list']} aria-label="등록한 운동" aria-busy={isSaving}>
            {displayedExercises.map((exercise, index) => (
              <SortableExercise
                key={exercise.id}
                exercise={exercise}
                index={index}
                isDisabled={isSaving || isError || displayedExercises.length < 2}
              />
            ))}
          </ul>
        </DragDropProvider>
      )}
    </div>
  );
}

function SortableExercise({
  exercise,
  index,
  isDisabled,
}: {
  exercise: TExercise;
  index: number;
  isDisabled: boolean;
}) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: exercise.id,
    index,
    disabled: isDisabled,
    data: { name: exercise.name },
  });
  return (
    <li ref={ref} className={`${styles['item']} ${isDragSource ? styles['dragging'] : ''}`}>
      <Link className={styles['detail-link']} to={`/exercise/${encodeURIComponent(exercise.id)}`}>
        <div className={styles['info']}>
          <h2>{exercise.name}</h2>
          <p>
            {exercise.amount || (exercise.sets === null ? '-' : '')}
            {exercise.amount && exercise.sets !== null && ' × '}
            {exercise.sets !== null && `${exercise.sets}세트`}
          </p>
        </div>
      </Link>
      <button
        ref={handleRef}
        type="button"
        disabled={isDisabled}
        className={styles['handle']}
        aria-label={`${exercise.name} 순서 이동`}
      >
        <MdDragHandle size={24} aria-hidden="true" />
      </button>
    </li>
  );
}

function ExerciseLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
      <p role="alert" className={styles['error']}>
        {EXERCISES_LOAD_ERROR}
      </p>
    </>
  );
}

function EmptyExercises() {
  return (
    <div className={styles['empty']}>
      <p>아직 등록한 운동이 없어요.</p>
      <p className={styles['hint']}>운동 이름과 운동량을 자유롭게 적어보세요.</p>
    </div>
  );
}
