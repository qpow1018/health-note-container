import { Link } from 'react-router-dom';

import planQuery from '@/queries/planQuery';
import type { TPlan } from '@/api/plan/type';
import { getPlanSchedule } from '@/features/plan/utils/planSchedule';

import Header from '@/components/common/header/Header';
import BoxLoading from '@/components/common/loading/BoxLoading';
import Button from '@/components/common/button/Button';

import styles from './PlanPage.module.scss';

const WEEKDAYS = [
  { day: 1, label: '월요일' },
  { day: 2, label: '화요일' },
  { day: 3, label: '수요일' },
  { day: 4, label: '목요일' },
  { day: 5, label: '금요일' },
  { day: 6, label: '토요일' },
  { day: 0, label: '일요일' },
];

export default function PlanPage() {
  const { data: plan, isPending, isError, refetch } = planQuery.useGetActivePlan();

  return (
    <section className={styles['plan-page']}>
      <Header title="플랜" showBack={false} />
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
        {plan && <ActivePlan plan={plan} />}
      </div>
    </section>
  );
}

function EmptyPlan() {
  return (
    <>
      <h2>내 운동으로, 운동이와 함께</h2>
      <p>나에게 맞는 운동 일정을 정하고 운동이를 키워보세요.</p>
      <p>기간 안에 끝내지 못해도, 준비되면 계속 이어갈 수 있어요.</p>
      <Link className={styles['primary-link']} to="/plan/new">
        플랜 만들기
      </Link>
    </>
  );
}

function ActivePlan({ plan }: { plan: TPlan }) {
  const { endDate } = getPlanSchedule(
    plan.startDate,
    plan.duration,
    plan.assignments.map((day) => day.weekday),
  );
  const dailyXp = plan.targetXp / plan.exerciseDayCount;

  return (
    <div className={styles['active-plan']}>
      <h2>진행 중인 플랜</h2>
      <dl className={styles['summary']}>
        <div>
          <dt>시작일</dt>
          <dd>
            <time dateTime={plan.startDate}>{plan.startDate}</time>
          </dd>
        </div>
        <div>
          <dt>기간</dt>
          <dd>{plan.duration}일</dd>
        </div>
        <div>
          <dt>기간 기준 종료일</dt>
          <dd>
            <time dateTime={endDate}>{endDate}</time>
          </dd>
        </div>
        <div>
          <dt>주간 운동</dt>
          <dd>주 {plan.assignments.length}일</dd>
        </div>
        <div>
          <dt>시작 시 총 운동일</dt>
          <dd>{plan.exerciseDayCount}일</dd>
        </div>
        <div>
          <dt>최종 성장 목표</dt>
          <dd>{plan.targetXp.toLocaleString('ko-KR')} XP</dd>
        </div>
        <div>
          <dt>하루 전체 완료 몫</dt>
          <dd>
            {Number.isInteger(dailyXp) ? '' : '약 '}
            {dailyXp.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} XP
          </dd>
        </div>
      </dl>
      <h3>주간 운동표</h3>
      <ul className={styles['weekdays']} aria-label="플랜 주간 운동표">
        {WEEKDAYS.map(({ day, label }) => {
          const assignment = plan.assignments.find((item) => item.weekday === day);
          return (
            <li key={day}>
              <span>{label}</span>
              <span>{assignment ? (assignment.routineName ?? '루틴 정보 없음') : '휴식'}</span>
            </li>
          );
        })}
      </ul>
      <p>기간은 성장과 보상의 기준이에요. 기간이 지나도 계속 이어갈 수 있어요.</p>
    </div>
  );
}
