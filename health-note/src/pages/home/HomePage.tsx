import { useContext } from 'react';

import { AuthUserContext } from '@/features/auth/AuthUserContext';
import { useRoutineToday } from '@/features/routine/useRoutineToday';
import Avatar from '@/features/avatar/Avatar';
import StepCard from '@/features/steps/StepCard';
import HomeRoutines from '@/features/routine/homeRoutines/HomeRoutines';

import styles from './HomePage.module.scss';

export default function HomePage() {
  const today = useRoutineToday();
  const { nickname } = useContext(AuthUserContext)!;
  return (
    <section className={styles['home-page']}>
      <header className={styles['header']}>
        <h1 className={styles['logo']}>
          <img src="/brand/health-note.svg" alt="" width="32" height="32" />
          <span>헬스노트</span>
        </h1>
      </header>
      <div className={styles['date-bar']}>
        <time dateTime={today}>
          {new Date(`${today}T00:00:00`).toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </time>
      </div>
      <div className={styles['content']}>
        <div className={styles['companion']}>
          <Avatar />
          <div className={styles['companion-info']}>
            <h2>{nickname}</h2>
            <p>운동이를 눌러 인사해 보세요.</p>
          </div>
        </div>
        <StepCard today={today} />
        <HomeRoutines today={today} />
      </div>
    </section>
  );
}
