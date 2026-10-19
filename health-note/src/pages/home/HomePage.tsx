import { useRoutineToday } from '@/features/routine/useRoutineToday';
import HomeRoutines from '@/features/routine/homeRoutines/HomeRoutines';
import LogoutButton from '@/features/auth/LogoutButton';

import styles from './HomePage.module.scss';

export default function HomePage() {
  const today = useRoutineToday();
  return (
    <section className={styles['home-page']}>
      <header className={styles['header']}>
        <h1 className={styles['logo']}>
          <img src="/brand/health-note.svg" alt="" width="32" height="32" />
          <span>헬스노트</span>
        </h1>
        <LogoutButton />
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
        <HomeRoutines today={today} />
      </div>
    </section>
  );
}
