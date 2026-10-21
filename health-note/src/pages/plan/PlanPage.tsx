import { Link } from 'react-router-dom';

import routineQuery from '@/queries/routineQuery';

import Header from '@/components/common/header/Header';

import styles from './PlanPage.module.scss';

export default function PlanPage() {
  const { data: routines, isPending, isError, refetch } = routineQuery.useGetRoutines();

  return (
    <section className={styles['plan-page']}>
      <Header title="플랜" showBack={false} />
      <div className={styles['content']}>
        <h2>내 운동으로, 운동이와 함께</h2>
        <p>나에게 맞는 운동 일정을 정하고 운동이를 키워보세요.</p>
        <p>기간 안에 끝내지 못해도, 준비되면 계속 이어갈 수 있어요.</p>
        {isPending && <p role="status">루틴을 불러오는 중이에요.</p>}
        {isError && (
          <div role="alert">
            <p>루틴을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.</p>
            <button type="button" onClick={() => void refetch()}>
              다시 시도
            </button>
          </div>
        )}
        {!isPending && !isError && routines && (
          <>
            {routines.length === 0 && <p>플랜에 사용할 루틴을 먼저 만들어 주세요.</p>}
            <Link
              className={styles['primary-link']}
              to={routines.length === 0 ? '/routine/new' : '/plan/new'}
            >
              {routines.length === 0 ? '루틴 만들기' : '플랜 만들기'}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
