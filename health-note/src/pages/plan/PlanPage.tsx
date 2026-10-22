import planQuery from '@/queries/planQuery';
import { useTodayDate } from '@/hooks/useTodayDate';

import PlanIntro from '@/features/plan/PlanIntro';
import BoxLoading from '@/components/common/loading/BoxLoading';
import Button from '@/components/common/button/Button';
import ActivePlan from '@/features/plan/ActivePlan';

import styles from './PlanPage.module.scss';

export default function PlanPage() {
  const today = useTodayDate();
  const { data: plan, isPending, isError, refetch } = planQuery.useGetActivePlan();

  return (
    <section className={styles['plan-page']}>
      <header className={styles['header']}>
        <h1 className={styles['logo']}>
          <img src="/brand/health-note.svg" alt="" width="32" height="32" />
          <span>헬스노트</span>
        </h1>
      </header>

      <div className={styles['content']}>
        {isPending && <BoxLoading />}

        {isError && (
          <div role="alert">
            <p>플랜을 불러오지 못했어요.</p>
            <Button color="gray" fill="outline" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {!isPending && !isError && !plan && <PlanIntro />}
        {plan && <ActivePlan key={plan.id + today} plan={plan} today={today} />}
      </div>
    </section>
  );
}
