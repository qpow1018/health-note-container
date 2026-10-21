import { Link } from 'react-router-dom';

import routineQuery from '@/queries/routineQuery';

import Header from '@/components/common/header/Header';
import PlanForm from '@/features/plan/PlanForm';

import styles from './PlanPage.module.scss';

export default function PlanCreatePage() {
  const { data: routines, isPending, isError, refetch } = routineQuery.useGetRoutines();

  return (
    <section className={styles['plan-page']}>
      <Header title="플랜 만들기" backTo="/plan" />
      <div className={styles['content']}>
        {isPending && <p role="status">루틴을 불러오는 중이에요.</p>}
        {isError && (
          <div role="alert">
            <p>루틴을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.</p>
            <button type="button" onClick={() => void refetch()}>
              다시 시도
            </button>
          </div>
        )}
        {!isPending && !isError && routines?.length === 0 && (
          <>
            <p>플랜에 사용할 루틴을 먼저 만들어 주세요.</p>
            <Link className={styles['primary-link']} to="/routine/new">
              루틴 만들기
            </Link>
          </>
        )}
        {routines && routines.length > 0 && <PlanForm routines={routines} />}
      </div>
    </section>
  );
}
