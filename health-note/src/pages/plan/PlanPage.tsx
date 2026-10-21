import { Link } from 'react-router-dom';

import Header from '@/components/common/header/Header';

import styles from './PlanPage.module.scss';

export default function PlanPage() {
  return (
    <section className={styles['plan-page']}>
      <Header title="플랜" showBack={false} />
      <div className={styles['content']}>
        <h2>내 운동으로, 운동이와 함께</h2>
        <p>나에게 맞는 운동 일정을 정하고 운동이를 키워보세요.</p>
        <p>기간 안에 끝내지 못해도, 준비되면 계속 이어갈 수 있어요.</p>
        <Link className={styles['primary-link']} to="/plan/new">
          플랜 만들기
        </Link>
      </div>
    </section>
  );
}
