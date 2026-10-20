import { Link } from 'react-router-dom';

import routineQuery from '@/queries/routineQuery';
import { ROUTINES_LOAD_ERROR } from '@/features/exercise/routineMessages';

import ButtonLink from '@/components/common/button/ButtonLink';
import Header from '@/components/common/header/Header';
import ExerciseNavigation from '@/features/exercise/ExerciseNavigation';
import BoxLoading from '@/components/common/loading/BoxLoading';

import styles from './RoutinePage.module.scss';

import { MdAdd, MdChevronRight } from 'react-icons/md';

export default function RoutinePage() {
  const { data: routines = [], isError, isPending, refetch } = routineQuery.useGetRoutines();

  return (
    <section className={styles['routine-page']}>
      <Header
        title="운동 관리"
        showBack={false}
        actions={
          <ButtonLink className={styles['add-button']} to="/routine/new">
            <MdAdd size={20} aria-hidden="true" />
            루틴 생성
          </ButtonLink>
        }
      />
      <ExerciseNavigation />
      <div className={styles['content']}>
        {isPending && <BoxLoading />}

        {isError && <RoutineLoadError onRetry={() => void refetch()} />}

        {!isPending && !isError && routines.length === 0 && <EmptyRoutines />}

        {routines.length > 0 && (
          <>
            <div className={styles['list-toolbar']}>
              <p>총 {routines.length}개</p>
              {routines.length > 1 && (
                <Link to="/routine/order" className={styles['order-link']}>
                  순서 변경
                </Link>
              )}
            </div>
            <ul className={styles['list']}>
              {routines.map((routine) => (
                <li key={routine.id} className={styles['item']}>
                  <Link
                    className={styles['detail-link']}
                    to={`/routine/${encodeURIComponent(routine.id)}`}
                  >
                    <div className={styles['info']}>
                      <h2>{routine.name}</h2>
                      <p>
                        <span className={routine.isActive ? styles['active-status'] : undefined}>
                          {routine.isActive ? '활성' : '비활성'}
                        </span>
                        {' · '}운동 {routine.exerciseIds.length}개
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
      <p className={styles['hint']}>운동을 묶어 나만의 반복 일정을 만들어보세요.</p>
    </div>
  );
}
