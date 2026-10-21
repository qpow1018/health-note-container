import HomePlanPreview from '@/features/home/HomePlanPreview';

import styles from './PlanPage.module.scss';

export default function PlanPage() {
  return (
    <section className={styles['plan-page']}>
      <header className={styles['header']}>
        <h1 className={styles['logo']}>
          <img src="/brand/health-note.svg" alt="" width="32" height="32" />
          <span>헬스노트</span>
        </h1>
      </header>

      <div className={styles['content']}>
        <HomePlanPreview />
      </div>
    </section>
  );
}
