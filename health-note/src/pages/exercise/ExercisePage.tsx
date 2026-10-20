import { useSearchParams } from 'react-router-dom';

import ExerciseList from '@/features/exercise/ExerciseList';
import RoutineList from '@/features/exercise/RoutineList';

import Header from '@/components/common/header/Header';
import Tabs from '@/components/common/tabs/Tabs';

import styles from './ExercisePage.module.scss';

export default function ExercisePage() {
  const [params] = useSearchParams();

  const isExercises = params.get('tab') === 'exercises';

  return (
    <section className={styles['exercise-page']}>
      <Header title="운동 관리" showBack={false} />

      <Tabs
        label="운동 관리"
        items={[
          { label: '루틴', to: '/exercise', isActive: !isExercises },
          { label: '등록한 운동', to: '/exercise?tab=exercises', isActive: isExercises },
        ]}
      />

      <div className={styles['content']}>{isExercises ? <ExerciseList /> : <RoutineList />}</div>
    </section>
  );
}
