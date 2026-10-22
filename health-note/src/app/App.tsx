import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import QueryProvider from '@/lib/query/QueryProvider';

import ToastContainer from '@/components/common/toast/ToastContainer';
import BottomNavigationLayout from './BottomNavigationLayout';
import AuthBoundary from './AuthBoundary';
import RouteScrollReset from './RouteScrollReset';

import ActivityPage from '@/pages/activity/ActivityPage';
import PlanPage from '@/pages/plan/PlanPage';
import PlanDetailPage from '@/pages/plan/PlanDetailPage';
import PlanCreatePage from '@/pages/plan/PlanCreatePage';
import PlaygroundPage from '@/pages/playground/PlaygroundPage';
import MyPage from '@/pages/my/MyPage';
import NotFoundPage from '@/pages/notFound/NotFoundPage';
import RoutineDetailPage from '@/pages/exercise/RoutineDetailPage';
import RoutineEditPage from '@/pages/exercise/RoutineEditPage';
import RoutineCreatePage from '@/pages/exercise/RoutineCreatePage';
import ExercisePage from '@/pages/exercise/ExercisePage';
import ExerciseDetailPage from '@/pages/exercise/ExerciseDetailPage';
import ExerciseEditPage from '@/pages/exercise/ExerciseEditPage';
import ExerciseCreatePage from '@/pages/exercise/ExerciseCreatePage';

import styles from './App.module.scss';

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <RouteScrollReset />
        <main className={styles['app-shell']}>
          <AuthBoundary>
            <Routes>
              <Route element={<BottomNavigationLayout />}>
                <Route path="/" element={<Navigate to="/plan" replace />} />
                <Route path="/plan" element={<PlanPage />} />
                <Route path="/exercise" element={<ExercisePage />} />
                <Route path="/playground" element={<PlaygroundPage />} />
                <Route path="/my" element={<MyPage />} />
              </Route>

              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/plan/detail" element={<PlanDetailPage />} />
              <Route path="/plan/new" element={<PlanCreatePage />} />

              <Route path="/routine/new" element={<RoutineCreatePage />} />
              <Route path="/routine/:routineId" element={<RoutineDetailPage />} />
              <Route path="/routine/:routineId/edit" element={<RoutineEditPage />} />
              <Route path="/exercise/new" element={<ExerciseCreatePage />} />
              <Route path="/exercise/:exerciseId" element={<ExerciseDetailPage />} />
              <Route path="/exercise/:exerciseId/edit" element={<ExerciseEditPage />} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthBoundary>
        </main>
        <ToastContainer />
      </BrowserRouter>
    </QueryProvider>
  );
}
