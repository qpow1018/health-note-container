import exerciseQuery from '@/queries/exerciseQuery';
import routineQuery from '@/queries/routineQuery';

import SproutCharacter from '@/features/character/SproutCharacter';
import Button from '@/components/common/button/Button';
import ButtonLink from '@/components/common/button/ButtonLink';
import BoxLoading from '@/components/common/loading/BoxLoading';

import styles from './PlanIntro.module.scss';

import { MdCheck } from 'react-icons/md';

export default function PlanIntro() {
  const exercises = exerciseQuery.useGetExercises();
  const routines = routineQuery.useGetRoutines();
  const isPending = exercises.isPending || routines.isPending;
  const isError = exercises.isError || routines.isError;
  const isExerciseComplete = Boolean(exercises.data?.length);
  const isRoutineComplete = Boolean(routines.data?.length);
  const currentStep = !isExerciseComplete ? 0 : !isRoutineComplete ? 1 : 2;
  const steps = [
    {
      title: '운동 만들기',
      description: '내가 할 운동과 운동량을 등록해요.',
      to: '/exercise/new',
      isComplete: isExerciseComplete,
    },
    {
      title: '루틴 만들기',
      description: '등록한 운동을 묶어 나만의 루틴을 만들어요.',
      to: '/routine/new',
      isComplete: isRoutineComplete,
    },
    {
      title: '플랜 만들기',
      description: '기간과 운동 요일을 정하고 운동이와 시작해요.',
      to: '/plan/new',
      isComplete: false,
    },
  ];

  return (
    <section className={styles['plan-intro']} aria-labelledby="plan-intro-title">
      <div className={styles['greeting']}>
        <div className={styles['character']}>
          <SproutCharacter />
        </div>
        <h2 id="plan-intro-title">안녕! 함께 운동해볼까?</h2>
        <p className={styles['description']}>
          네가 정한 운동을 꾸준히 실천하면 내가 자라나.
          <br />
          아래 순서대로 우리만의 플랜을 준비해보자!
        </p>
      </div>
      {isError && (
        <div role="alert">
          <p>준비 상태를 불러오지 못했어요.</p>
          <Button
            color="gray"
            fill="outline"
            onClick={() => {
              void exercises.refetch();
              void routines.refetch();
            }}
          >
            다시 시도
          </Button>
        </div>
      )}
      {!isError && isPending && <BoxLoading />}
      {!isError && !isPending && (
        <ol className={styles['steps']} aria-label="플랜 준비 순서">
          {steps.map((step, index) => (
            <li key={step.title} aria-current={index === currentStep ? 'step' : undefined}>
              <span className={styles['marker']} aria-hidden="true">
                {step.isComplete ? <MdCheck size={20} /> : index + 1}
              </span>
              <div className={styles['step-content']}>
                <h3>
                  {step.title}
                  {step.isComplete && <span className={styles['complete']}>완료</span>}
                </h3>
                <p>{step.description}</p>
                {index === currentStep && (
                  <ButtonLink to={step.to} color="mint" fill="solid">
                    {step.title}
                  </ButtonLink>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
