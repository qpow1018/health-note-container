import { useNavigate } from 'react-router-dom';

import routineQuery from '@/queries/routineQuery';
import type { TRoutineValues } from '@/api/routine/type';
import toast from '@/utils/toast';

import Header from '@/components/common/header/Header';
import RoutineForm from '@/features/exercise/RoutineForm';

import styles from './RoutineCreatePage.module.scss';

export default function RoutineCreatePage() {
  const { mutateAsync: createRoutine } = routineQuery.useCreateRoutine();
  const navigate = useNavigate();

  async function handleSave(values: TRoutineValues): Promise<void> {
    try {
      await createRoutine(values);
    } catch {
      toast.error(
        '저장하지 못했어요. 선택한 운동이 삭제되었거나 인터넷 연결에 문제가 있을 수 있어요. 운동 목록과 연결을 확인해 주세요.',
        { isShowCloseButton: true },
      );
      return;
    }
    toast.success('루틴을 등록했어요.');
    navigate('/exercise');
  }

  return (
    <section className={styles['routine-create-page']}>
      <Header title="루틴 생성" fallbackTo="/exercise" />
      <div className={styles['content']}>
        <RoutineForm onSave={handleSave} />
      </div>
    </section>
  );
}
