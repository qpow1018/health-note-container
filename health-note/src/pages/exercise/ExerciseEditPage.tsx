import { Link, useNavigate, useParams } from 'react-router-dom';

import toast from '@/utils/toast';
import exerciseQuery from '@/queries/exerciseQuery';
import { EXERCISE_LOAD_ERROR } from '@/features/exercise/messages';
import type { TExerciseValues } from '@/api/exercise/type';

import Header from '@/components/common/header/Header';
import BoxLoading from '@/components/common/loading/BoxLoading';
import ExerciseForm from '@/features/exercise/exerciseForm/ExerciseForm';

import styles from './ExerciseEditPage.module.scss';

export default function ExerciseEditPage() {
  const { exerciseId } = useParams();
  // 수정 대상이 바뀌면 원본 데이터와 폼 상태를 초기화한다.
  return <ExerciseEditContent key={exerciseId} exerciseId={exerciseId} />;
}

function ExerciseEditContent({ exerciseId }: { exerciseId: string | undefined }) {
  const { mutateAsync: updateExercise } = exerciseQuery.useUpdateExercise();
  const navigate = useNavigate();

  const { data: exercises = [], isError, isPending, refetch } = exerciseQuery.useGetExercises();
  const exercise = exercises.find((exercise) => exercise.id === exerciseId);

  const detailTo = `/exercise/${encodeURIComponent(exerciseId ?? '')}`;

  async function handleSave(values: TExerciseValues): Promise<void> {
    if (!exercise) {
      toast.error('운동을 찾을 수 없어요.');
      return;
    }
    try {
      await updateExercise({ id: exercise.id, values });
    } catch {
      toast.error('저장하지 못했어요. 운동이 삭제되었거나 인터넷 연결에 문제가 있을 수 있어요.', {
        isShowCloseButton: true,
      });
      return;
    }
    toast.success('운동을 수정했어요.');
    navigate(detailTo, { replace: true });
  }

  return (
    <section className={styles['exercise-edit-page']}>
      <Header title="운동 수정" fallbackTo={detailTo} />
      <div className={styles['content']}>
        {isPending && <BoxLoading />}
        {isError && <ExerciseEditLoadError onRetry={() => void refetch()} />}
        {!isPending && !isError && !exercise && <MissingExercise />}
        {exercise && <ExerciseForm initialValues={exercise} onSave={handleSave} />}
      </div>
    </section>
  );
}

function ExerciseEditLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
      <p className={styles['error']} role="alert">
        {EXERCISE_LOAD_ERROR}
      </p>
    </>
  );
}

function MissingExercise() {
  return (
    <div className={styles['missing']}>
      <p>운동을 찾을 수 없어요.</p>
      <Link to="/exercise?tab=exercises">목록으로</Link>
    </div>
  );
}
