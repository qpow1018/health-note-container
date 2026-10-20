import { Link, useLocation, useSearchParams } from 'react-router-dom';

import styles from './ExerciseNavigation.module.scss';

export default function ExerciseNavigation() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const isExercises = pathname === '/exercise' && params.get('tab') === 'exercises';

  return (
    <nav className={styles['navigation']} aria-label="운동 관리">
      <Link to="/exercise" aria-current={!isExercises ? 'page' : undefined}>
        루틴
      </Link>
      <Link to="/exercise?tab=exercises" aria-current={isExercises ? 'page' : undefined}>
        등록한 운동
      </Link>
    </nav>
  );
}
