import { useLocation, useSearchParams } from 'react-router-dom';

import Tabs from '@/components/common/tabs/Tabs';

export default function ExerciseNavigation() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const isExercises = pathname === '/exercise' && params.get('tab') === 'exercises';

  return (
    <Tabs
      label="운동 관리"
      items={[
        { label: '루틴', to: '/exercise', isActive: !isExercises },
        { label: '등록한 운동', to: '/exercise?tab=exercises', isActive: isExercises },
      ]}
    />
  );
}
