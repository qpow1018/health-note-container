import { Link } from 'react-router-dom';

import exerciseQuery from '@/queries/exerciseQuery';
import { EXERCISES_LOAD_ERROR } from '@/features/exercise/constants/messages';

import BoxLoading from '@/components/common/loading/BoxLoading';

import styles from './ExerciseList.module.scss';

import { MdChevronRight } from 'react-icons/md';

export default function ExerciseList() {
  const { data: exercises = [], isError, isPending, refetch } = exerciseQuery.useGetExercises();

  return (
    <div className={styles['exercise-list']}>
      {isPending && <BoxLoading />}

      {isError && <ExerciseLoadError onRetry={() => void refetch()} />}

      {!isPending && !isError && exercises.length === 0 && <EmptyExercises />}

      {exercises.length > 0 && (
        <>
          <div className={styles['list-toolbar']}>
            <p>총 {exercises.length}개</p>
            {exercises.length > 1 && (
              <Link to="/exercise/order" className={styles['order-link']}>
                순서 변경
              </Link>
            )}
          </div>
          <ul className={styles['list']}>
            {exercises.map((exercise) => (
              <li key={exercise.id} className={styles['item']}>
                <Link
                  className={styles['detail-link']}
                  to={`/exercise/${encodeURIComponent(exercise.id)}`}
                >
                  <div className={styles['info']}>
                    <h2>{exercise.name}</h2>
                    <p>
                      {exercise.amount || (exercise.sets === null ? '-' : '')}
                      {exercise.amount && exercise.sets !== null && ' × '}
                      {exercise.sets !== null && `${exercise.sets}세트`}
                    </p>
                  </div>
                  <MdChevronRight className={styles['chevron']} size={20} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
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
