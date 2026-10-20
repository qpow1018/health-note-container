import { useSearchParams } from 'react-router-dom';

import ExerciseListPage from './ExerciseListPage';
import RoutinePage from './RoutinePage';

export default function ExercisePage() {
  const [params] = useSearchParams();
  return params.get('tab') === 'exercises' ? <ExerciseListPage /> : <RoutinePage />;
}
