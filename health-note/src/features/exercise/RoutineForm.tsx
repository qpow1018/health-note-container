import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/react';
import type { DragDropManager } from '@dnd-kit/dom';
import { Accessibility, Feedback, PointerSensor, PointerActivationConstraints } from '@dnd-kit/dom';
import { isSortable, useSortable } from '@dnd-kit/react/sortable';

import exerciseQuery from '@/queries/exerciseQuery';
import { EXERCISES_LOAD_ERROR } from '@/features/exercise/constants/messages';
import type { TExercise } from '@/api/exercise/type';
import type { TRoutineValues } from '@/api/routine/type';

import BottomSheet from '@/components/common/modal/BottomSheet';
import Button from '@/components/common/button/Button';
import Textarea from '@/components/common/form/Textarea';
import FieldError from '@/components/common/form/FieldError';
import Input from '@/components/common/form/Input';
import Checkbox from '@/components/common/form/Checkbox';

import styles from './RoutineForm.module.scss';

import { MdAdd, MdDragHandle } from 'react-icons/md';

const ORDER_POINTER_SENSOR = PointerSensor.configure({
  activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
});

// Avoid delayed keyboard focus restoration stealing input after a drop.
const ORDER_FEEDBACK = Feedback.configure({ dropAnimation: null });

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

type TRoutineFormProps = {
  initialValues?: TRoutineValues;
  onSave: (values: TRoutineValues) => Promise<void>;
};

export default function RoutineForm({
  initialValues: initialFormValues,
  onSave,
}: TRoutineFormProps) {
  const [initialValues] = useState(initialFormValues);
  const { data: exercises = [], isError, isPending, refetch } = exerciseQuery.useGetExercises();
  const [isSaving, setIsSaving] = useState(false);
  const [exerciseIds, setExerciseIds] = useState<string[]>(initialValues?.exerciseIds ?? []);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [nameError, setNameError] = useState('');
  const [exerciseError, setExerciseError] = useState('');

  async function handleOpenExercises() {
    const latest = await refetch();
    if (latest.isError) return;
    setDraftIds([...exerciseIds]);
    setIsSheetOpen(true);
  }

  function handleToggleExercise(id: string) {
    setDraftIds(
      draftIds.includes(id) ? draftIds.filter((value) => value !== id) : [...draftIds, id],
    );
  }

  function handleConfirmExercises() {
    setExerciseIds([
      ...exerciseIds.filter((id) => draftIds.includes(id)),
      ...draftIds.filter((id) => !exerciseIds.includes(id)),
    ]);
    setExerciseError('');
    setIsSheetOpen(false);
  }

  function handleMoveExercise(from: number, to: number) {
    if (from === to) return;
    const next = [...exerciseIds];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    setExerciseIds(next);
    const name = exercises.find((exercise) => exercise.id === id)?.name ?? '운동';
    setAnnouncement(`${name}, ${next.length}개 중 ${to + 1}번째로 이동했어요.`);
  }

  function handleRemoveExercise(id: string) {
    setExerciseIds(exerciseIds.filter((value) => value !== id));
    setExerciseError('');
  }

  function handleDragEnd(event: DragEndEvent, manager: DragDropManager) {
    setIsDragging(false);
    const { source, activatorEvent } = event.operation;
    const handle = source?.handle;
    if (activatorEvent instanceof KeyboardEvent && handle instanceof HTMLElement) {
      void manager.renderer.rendering.then(() => {
        requestAnimationFrame(() => {
          if (handle.ownerDocument.activeElement === handle.ownerDocument.body) handle.focus();
        });
      });
    }
    if (event.canceled) {
      setAnnouncement('이동을 취소했어요.');
      return;
    }
    if (isSortable(source)) handleMoveExercise(source.initialIndex, source.index);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    setNameError('');
    setExerciseError('');
    if (!name) {
      setNameError('루틴 이름을 입력해 주세요.');
      return;
    }
    if (exerciseIds.length === 0) {
      setExerciseError('운동을 하나 이상 선택해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const latest = await refetch();
      if (latest.isError) return;
      if (exerciseIds.some((id) => !(latest.data ?? []).some((exercise) => exercise.id === id))) {
        setExerciseError('저장하지 못했어요. 삭제된 운동을 제거하거나 다시 선택해 주세요.');
        return;
      }
      await onSave({
        name,
        exerciseIds,
        memo: String(data.get('memo') ?? '').trim(),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles['routine-form']}>
      <form className={styles['form']} onSubmit={handleSubmit}>
        <fieldset className={styles['fields']} disabled={isSaving}>
          <div className={styles['field']}>
            <label htmlFor="routine-name">
              루틴 이름{' '}
              <span className={styles['required']} aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id="routine-name"
              name="name"
              defaultValue={initialValues?.name}
              required
              placeholder="예: 상체 루틴"
              onChange={() => setNameError('')}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'routine-name-error' : undefined}
            />
            <FieldError id="routine-name-error" message={nameError} />
          </div>
          <div className={styles['field']}>
            <div className={styles['exercise-heading']}>
              <h2>
                운동{' '}
                <span className={styles['required']} aria-hidden="true">
                  *
                </span>
              </h2>
              <button
                type="button"
                className={styles['select-button']}
                onClick={handleOpenExercises}
                disabled={isDragging || isPending || isSaving}
                aria-describedby={exerciseError ? 'routine-exercises-error' : undefined}
              >
                <MdAdd size={18} aria-hidden="true" />
                운동 선택
              </button>
            </div>
            {isError && (
              <p role="alert" className={styles['error']}>
                {EXERCISES_LOAD_ERROR}
              </p>
            )}
            <FieldError id="routine-exercises-error" message={exerciseError} />
            <p className={styles['announcement']} role="status" aria-live="polite">
              {announcement}
            </p>
            <div className={styles['exercise-box']}>
              {exerciseIds.length === 0 && (
                <p className={styles['empty-exercises']}>선택한 운동이 없어요.</p>
              )}
              {isPending && <p role="status">운동을 불러오고 있어요.</p>}
              {exerciseIds.length > 0 && !isPending && (
                <DragDropProvider
                  sensors={(defaults) =>
                    defaults.map((sensor) =>
                      sensor === PointerSensor ? ORDER_POINTER_SENSOR : sensor,
                    )
                  }
                  plugins={(defaults) =>
                    defaults.map((plugin) => {
                      if (plugin === Accessibility) return ORDER_ACCESSIBILITY;
                      if (plugin === Feedback) return ORDER_FEEDBACK;
                      return plugin;
                    })
                  }
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                >
                  <ol className={styles['selected-list']} aria-label="선택한 운동 순서">
                    {exerciseIds.map((id, index) => (
                      <SelectedExercise
                        key={id}
                        id={id}
                        index={index}
                        exercise={exercises.find((exercise) => exercise.id === id)}
                        isLoadError={isError}
                        isSortable={exerciseIds.length > 1}
                        isDisabled={isSaving}
                        onRemove={handleRemoveExercise}
                      />
                    ))}
                  </ol>
                </DragDropProvider>
              )}
            </div>
          </div>
          <div className={styles['field']}>
            <label htmlFor="routine-memo">메모</label>
            <Textarea
              id="routine-memo"
              name="memo"
              defaultValue={initialValues?.memo}
              rows={4}
              placeholder="루틴에 대해 자유롭게 적어주세요."
            />
          </div>
        </fieldset>
        <div className={styles['actions']}>
          <Button type="submit" disabled={isError || isDragging || isSaving || isPending}>
            {isSaving ? '저장 중…' : '저장'}
          </Button>
        </div>
      </form>
      <BottomSheet
        isOpen={isSheetOpen}
        title="운동 선택"
        onClose={() => setIsSheetOpen(false)}
        footer={
          <Button className={styles['confirm-button']} onClick={handleConfirmExercises}>
            선택 완료 ({draftIds.length})
          </Button>
        }
      >
        {exercises.length === 0 && (
          <p className={styles['hint']}>
            등록한 운동이 없어요. 운동 메뉴에서 먼저 운동을 등록해 주세요.
          </p>
        )}
        <div className={styles['exercise-options']}>
          {exercises.map((exercise) => (
            <Checkbox
              key={exercise.id}
              className={styles['exercise-option']}
              checked={draftIds.includes(exercise.id)}
              onChange={() => handleToggleExercise(exercise.id)}
            >
              <span className={styles['exercise-option-info']}>
                <strong>{exercise.name}</strong>
                <span>
                  {exercise.amount || '운동량 미입력'}
                  {exercise.sets !== null && ` × ${exercise.sets}세트`}
                </span>
              </span>
            </Checkbox>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

type TSelectedExerciseProps = {
  id: string;
  index: number;
  exercise: TExercise | undefined;
  isLoadError: boolean;
  isSortable: boolean;
  isDisabled: boolean;
  onRemove: (id: string) => void;
};

function SelectedExercise({
  id,
  index,
  exercise,
  isLoadError,
  isSortable: isSortingEnabled,
  isDisabled,
  onRemove,
}: TSelectedExerciseProps) {
  const exerciseName = exercise?.name ?? (isLoadError ? '운동 정보 확인 불가' : '삭제된 운동');
  const { ref, handleRef, isDragSource } = useSortable({
    id,
    index,
    disabled: !isSortingEnabled || isDisabled,
    data: { name: exerciseName },
  });

  return (
    <li
      ref={ref}
      className={`${styles['selected-item']} ${isDragSource ? styles['dragging'] : ''}`}
    >
      <button
        ref={handleRef}
        type="button"
        className={styles['drag-handle']}
        aria-label={`${exerciseName} 순서 이동`}
        hidden={!isSortingEnabled}
        disabled={!isSortingEnabled || isDisabled}
      >
        <MdDragHandle size={20} aria-hidden="true" />
      </button>
      <div className={styles['exercise-info']}>
        <strong>{exerciseName}</strong>
        {exercise && (
          <p>
            {exercise.amount || '운동량 미입력'}
            {exercise.sets !== null && ` × ${exercise.sets}세트`}
          </p>
        )}
        {!exercise && !isLoadError && (
          <Button color="gray" fill="outline" onClick={() => onRemove(id)}>
            삭제된 운동 제거
          </Button>
        )}
      </div>
    </li>
  );
}
