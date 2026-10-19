import { BrowserRouter, Route, Routes } from 'react-router-dom';

import QueryProvider from '@/lib/query/QueryProvider';

import ToastContainer from '@/components/common/toast/ToastContainer';
import BottomNavigationLayout from './BottomNavigationLayout';
import AuthBoundary from './AuthBoundary';

import HomePage from '@/pages/home/HomePage';
import MyPage from '@/pages/my/MyPage';
import NotFoundPage from '@/pages/notFound/NotFoundPage';
import RoutinePage from '@/pages/routine/RoutinePage';
import RoutineDetailPage from '@/pages/routine/RoutineDetailPage';
import RoutineEditPage from '@/pages/routine/RoutineEditPage';
import RoutineOrderPage from '@/pages/routine/RoutineOrderPage';
import RoutineCreatePage from '@/pages/routine/RoutineCreatePage';
import ExerciseListPage from '@/pages/exercise/ExerciseListPage';
import ExerciseDetailPage from '@/pages/exercise/ExerciseDetailPage';
import ExerciseEditPage from '@/pages/exercise/ExerciseEditPage';
import ExerciseOrderPage from '@/pages/exercise/ExerciseOrderPage';
import ExerciseCreatePage from '@/pages/exercise/ExerciseCreatePage';

import styles from './App.module.scss';

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <main className={styles['app-shell']}>
          <AuthBoundary>
            <Routes>
              <Route element={<BottomNavigationLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/routine" element={<RoutinePage />} />
                <Route path="/exercise" element={<ExerciseListPage />} />
                <Route path="/my" element={<MyPage />} />
              </Route>

              <Route path="/routine/:routineId" element={<RoutineDetailPage />} />
              <Route path="/routine/:routineId/edit" element={<RoutineEditPage />} />
              <Route path="/routine/order" element={<RoutineOrderPage />} />
              <Route path="/routine/new" element={<RoutineCreatePage />} />

              <Route path="/exercise/:exerciseId" element={<ExerciseDetailPage />} />
              <Route path="/exercise/:exerciseId/edit" element={<ExerciseEditPage />} />
              <Route path="/exercise/order" element={<ExerciseOrderPage />} />
              <Route path="/exercise/new" element={<ExerciseCreatePage />} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthBoundary>
        </main>
        <ToastContainer />
      </BrowserRouter>
    </QueryProvider>
  );
}
