import { useLocation, useSearchParams } from 'react-router-dom';

import ExerciseList from '@/features/exercise/ExerciseList';
import RoutineList from '@/features/exercise/RoutineList';

import ButtonLink from '@/components/common/button/ButtonLink';
import Header from '@/components/common/header/Header';
import Tabs from '@/components/common/tabs/Tabs';

import styles from './ExercisePage.module.scss';

import { MdAdd } from 'react-icons/md';

export default function ExercisePage() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const isExercises = pathname === '/exercise' && params.get('tab') === 'exercises';

  return (
    <section className={styles['exercise-page']}>
      <Header
        title="운동 관리"
        showBack={false}
        actions={
          <ButtonLink
            className={styles['add-button']}
            to={isExercises ? '/exercise/new' : '/routine/new'}
          >
            <MdAdd size={20} aria-hidden="true" />
            {isExercises ? '운동 추가' : '루틴 생성'}
          </ButtonLink>
        }
      />
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
