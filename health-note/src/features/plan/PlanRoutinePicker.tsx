import type { TRoutine } from '@/api/routine/type';
import exerciseQuery from '@/queries/exerciseQuery';

import Radio from '@/components/common/form/Radio';
import BoxLoading from '@/components/common/loading/BoxLoading';
import Button from '@/components/common/button/Button';

import styles from './PlanRoutinePicker.module.scss';

type TPlanRoutinePickerProps = {
  routines: TRoutine[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function PlanRoutinePicker({
  routines,
  selectedId,
  onSelect,
}: TPlanRoutinePickerProps) {
  const { data: exercises, isPending, isError, refetch } = exerciseQuery.useGetExercises();

  return (
    <div className={styles['routine-picker']}>
      {isPending && <BoxLoading height={120} />}
      {isError && (
        <div className={styles['error']} role="alert">
          <p>포함 운동을 불러오지 못했어요.</p>
          <Button color="gray" fill="outline" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </div>
      )}
      {routines.map((routine) => (
        <Radio
          key={routine.id}
          className={styles['option']}
          name="plan-routine"
          value={routine.id}
          checked={selectedId === routine.id}
          onChange={() => onSelect(routine.id)}
          onClick={() => {
            if (selectedId === routine.id) onSelect(routine.id);
          }}
        >
          <span className={styles['name']}>{routine.name}</span>
          <span className={styles['description']}>
            {exercises
              ? routine.exerciseIds
                  .map(
                    (id) =>
                      exercises.find((exercise) => exercise.id === id)?.name ?? '운동 정보 없음',
                  )
                  .join(' · ')
              : `운동 ${routine.exerciseIds.length}개`}
          </span>
        </Radio>
      ))}
      <Radio
        className={styles['option']}
        name="plan-routine"
        value=""
        checked={selectedId === ''}
        onChange={() => onSelect('')}
        onClick={() => {
          if (selectedId === '') onSelect('');
        }}
      >
        <span className={styles['name']}>휴식</span>
        <span className={styles['description']}>이날은 루틴을 배정하지 않아요.</span>
      </Radio>
    </div>
  );
}
