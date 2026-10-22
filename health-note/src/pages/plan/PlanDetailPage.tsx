import planQuery from '@/queries/planQuery';
import type { TPlan } from '@/api/plan/type';
import { getPlanSchedule } from '@/features/plan/utils/planSchedule';

import ButtonLink from '@/components/common/button/ButtonLink';
import Header from '@/components/common/header/Header';
import BoxLoading from '@/components/common/loading/BoxLoading';
import Button from '@/components/common/button/Button';

import styles from './PlanDetailPage.module.scss';

const WEEKDAYS = [
  { day: 1, label: '월요일' },
  { day: 2, label: '화요일' },
  { day: 3, label: '수요일' },
  { day: 4, label: '목요일' },
  { day: 5, label: '금요일' },
  { day: 6, label: '토요일' },
  { day: 0, label: '일요일' },
];

export default function PlanDetailPage() {
  const { data: plan, isPending, isError, refetch } = planQuery.useGetActivePlan();

  return (
    <section className={styles['plan-detail-page']}>
      <Header title="플랜 상세" fallbackTo="/plan" />
      <div className={styles['content']}>
        {isPending && <BoxLoading />}
        {isError && (
          <div role="alert">
            <p>플랜을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.</p>
            <Button color="gray" fill="outline" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        )}
        {!isPending && !isError && !plan && <EmptyPlan />}
        {plan && <PlanDetails plan={plan} />}
      </div>
    </section>
  );
}

function EmptyPlan() {
  return (
    <div>
      <p>진행 중인 플랜이 없어요.</p>
      <ButtonLink to="/plan">플랜으로 돌아가기</ButtonLink>
    </div>
  );
}

function PlanDetails({ plan }: { plan: TPlan }) {
  const { endDate } = getPlanSchedule(
    plan.startDate,
    plan.duration,
    plan.assignments.map((day) => day.weekday),
  );
  const dailyXp = plan.targetXp / plan.exerciseDayCount;

  return (
    <div className={styles['details']}>
      <section className={styles['schedule']} aria-labelledby="plan-schedule-title">
        <p className={styles['status']}>진행 중인 플랜</p>
        <h2 id="plan-schedule-title">{plan.duration}일 플랜</h2>
        <div className={styles['dates']}>
          <div>
            <time dateTime={plan.startDate}>{plan.startDate}</time>
            <span>시작일</span>
          </div>
          <span className={styles['date-arrow']} aria-hidden="true">
            →
          </span>
          <div>
            <time dateTime={endDate}>{endDate}</time>
            <span>기간 기준 종료일</span>
          </div>
        </div>
        <p className={styles['exercise-days']}>
          주 {plan.assignments.length}일 운동 · 시작 시 총 {plan.exerciseDayCount}일
        </p>
      </section>
      <section aria-labelledby="plan-weekdays-title">
        <h2 id="plan-weekdays-title">주간 운동표</h2>
        <ul className={styles['weekdays']} aria-label="플랜 주간 운동표">
          {WEEKDAYS.map(({ day, label }) => {
            const assignment = plan.assignments.find((item) => item.weekday === day);
            return (
              <li key={day}>
                <span className={styles['weekday-label']} role="img" aria-label={label}>
                  {label.slice(0, 1)}
                </span>
                <span className={!assignment ? styles['rest'] : undefined}>
                  {assignment ? (assignment.routineName ?? '루틴 정보 없음') : '휴식'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className={styles['growth']} aria-labelledby="plan-growth-title">
        <h2 id="plan-growth-title">운동이 성장</h2>
        <dl>
          <div>
            <dt>성장 목표</dt>
            <dd>{plan.targetXp.toLocaleString('ko-KR')} XP</dd>
          </div>
          <div>
            <dt>운동일마다</dt>
            <dd>
              {Number.isInteger(dailyXp) ? '' : '약 '}
              {dailyXp.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} XP
            </dd>
          </div>
        </dl>
        <p>예정된 운동을 모두 완료했을 때의 경험치예요.</p>
        <p>기간이 지나도 계속 이어갈 수 있어요.</p>
      </section>
    </div>
  );
}
