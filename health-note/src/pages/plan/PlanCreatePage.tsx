import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import planQuery from '@/queries/planQuery';
import routineQuery from '@/queries/routineQuery';
import type { TPlanValues } from '@/api/plan/type';
import toast from '@/utils/toast';

import ButtonLink from '@/components/common/button/ButtonLink';
import Header from '@/components/common/header/Header';
import BoxLoading from '@/components/common/loading/BoxLoading';
import PlanForm from '@/features/plan/PlanForm';

import styles from './PlanCreatePage.module.scss';

export default function PlanCreatePage() {
  const { data: activePlan, isPending, isError, refetch } = planQuery.useGetActivePlan();

  return (
    <section className={styles['plan-create-page']}>
      <Header title="플랜 만들기" />
      <div className={styles['content']}>
        {isPending && <BoxLoading />}
        {isError && (
          <div role="alert">
            <p>진행 중인 플랜을 확인하지 못했어요.</p>
            <button type="button" onClick={() => void refetch()}>
              다시 시도
            </button>
          </div>
        )}
        {activePlan && (
          <div>
            <p>이미 진행 중인 플랜이 있어요.</p>
            <ButtonLink to="/plan">플랜 확인</ButtonLink>
          </div>
        )}
        {activePlan === null && <PlanCreateContent />}
      </div>
    </section>
  );
}

function PlanCreateContent() {
  const navigate = useNavigate();
  const [requestId] = useState(() => crypto.randomUUID());
  const { mutateAsync: createPlan } = planQuery.useCreatePlan();
  const { data: routines, isPending, isError, refetch } = routineQuery.useGetRoutines();

  async function handleSave(values: TPlanValues) {
    try {
      const result = await createPlan({ id: requestId, values });
      if (result === 'already-active') toast.info('이미 진행 중인 플랜이 있어요.');
      else toast.success('플랜을 시작했어요.');
      navigate('/plan', { replace: true });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
        void refetch();
      }
      toast.error('플랜을 시작하지 못했어요. 연결과 선택한 루틴을 확인하고 다시 시도해 주세요.', {
        isShowCloseButton: true,
      });
    }
  }

  return (
    <>
      {isPending && <BoxLoading />}
      {isError && <PlanRoutineLoadError onRetry={() => void refetch()} />}
      {!isPending && !isError && routines?.length === 0 && <EmptyPlanRoutines />}
      {routines && routines.length > 0 && <PlanForm routines={routines} onSave={handleSave} />}
    </>
  );
}

function PlanRoutineLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert">
      <p>루틴을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.</p>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}

function EmptyPlanRoutines() {
  return (
    <>
      <p>플랜에 사용할 루틴을 먼저 만들어 주세요.</p>
      <Link className={styles['primary-link']} to="/routine/new">
        루틴 만들기
      </Link>
    </>
  );
}
