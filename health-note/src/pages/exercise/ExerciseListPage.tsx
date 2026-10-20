import { Link } from 'react-router-dom';

import exerciseQuery from '@/queries/exerciseQuery';
import { EXERCISES_LOAD_ERROR } from '@/features/exercise/messages';

import ButtonLink from '@/components/common/button/ButtonLink';
import Header from '@/components/common/header/Header';
import ExerciseNavigation from '@/features/exercise/ExerciseNavigation';
import BoxLoading from '@/components/common/loading/BoxLoading';

import styles from './ExerciseListPage.module.scss';

import { MdAdd, MdChevronRight } from 'react-icons/md';

export default function ExerciseListPage() {
  const { data: exercises = [], isError, isPending, refetch } = exerciseQuery.useGetExercises();

  return (
    <section className={styles['exercise-page']}>
      <Header
        title="운동 관리"
        showBack={false}
        actions={
          <ButtonLink className={styles['add-button']} to="/exercise/new">
            <MdAdd size={20} aria-hidden="true" />
            운동 추가
          </ButtonLink>
        }
      />

      <ExerciseNavigation />
      <div className={styles['content']}>
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
    </section>
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
