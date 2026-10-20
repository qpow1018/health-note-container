import { useNavigate } from 'react-router-dom';

import toast from '@/utils/toast';
import exerciseQuery from '@/queries/exerciseQuery';
import type { TExerciseValues } from '@/api/exercise/type';

import Header from '@/components/common/header/Header';
import ExerciseForm from '@/features/exercise/exerciseForm/ExerciseForm';

import styles from './ExerciseCreatePage.module.scss';

export default function ExerciseCreatePage() {
  const { mutateAsync: createExercise } = exerciseQuery.useCreateExercise();
  const navigate = useNavigate();

  async function handleSave(values: TExerciseValues): Promise<void> {
    try {
      await createExercise(values);
    } catch {
      toast.error('저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', {
        isShowCloseButton: true,
      });
      return;
    }
    toast.success('운동을 등록했어요.');
    navigate('/exercise?tab=exercises');
  }

  return (
    <section className={styles['exercise-create-page']}>
      <Header title="운동 등록" fallbackTo="/exercise?tab=exercises" />
      <div className={styles['content']}>
        <ExerciseForm onSave={handleSave} />
      </div>
    </section>
  );
}
