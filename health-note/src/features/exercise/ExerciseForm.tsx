import { useState } from 'react';
import type { SubmitEvent } from 'react';

import { isYoutubeUrl } from '@/features/exercise/utils/youtubeUrl';
import type { TExerciseValues } from '@/api/exercise/type';
import { MAX_EXERCISE_SETS } from '@/api/exercise/type';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import Textarea from '@/components/common/form/Textarea';
import FieldError from '@/components/common/form/FieldError';

import styles from './ExerciseForm.module.scss';

type TLinkInput = { id: string; value: string };

type TExerciseFormProps = {
  initialValues?: TExerciseValues;
  onSave: (values: TExerciseValues) => Promise<void>;
};

export default function ExerciseForm({
  initialValues: initialFormValues,
  onSave,
}: TExerciseFormProps) {
  const [initialValues] = useState(initialFormValues);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [setsError, setSetsError] = useState('');
  const [links, setLinks] = useState<TLinkInput[]>(() => createLinkInputs(initialValues));
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});

  function handleAddLink() {
    setLinks([...links, { id: crypto.randomUUID(), value: '' }]);
  }

  function handleRemoveLink(id: string) {
    setLinks(links.filter((link) => link.id !== id));
    setLinkErrors((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  function handleLinkChange(id: string, value: string) {
    setLinks(links.map((link) => (link.id === id ? { ...link, value } : link)));
    setLinkErrors((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const amount = String(formData.get('amount') ?? '').trim();
    const setsInput = String(formData.get('sets') ?? '').trim();
    const sets = setsInput === '' ? null : Number(setsInput);
    const memo = String(formData.get('memo') ?? '').trim();
    const youtubeLinks = links.map((link) => link.value.trim()).filter(Boolean);

    setNameError('');
    setSetsError('');

    const invalidLinks: Record<string, string> = {};
    for (const link of links) {
      if (link.value.trim() && !isYoutubeUrl(link.value.trim())) {
        invalidLinks[link.id] =
          '유튜브 링크를 확인해 주세요. http:// 또는 https://로 시작하는 전체 주소를 입력해 주세요.';
      }
    }
    setLinkErrors(invalidLinks);
    if (Object.keys(invalidLinks).length > 0) return;

    if (!name) {
      setNameError('운동 이름을 입력해 주세요.');
      return;
    }

    if (sets !== null && (!Number.isSafeInteger(sets) || sets < 1 || sets > MAX_EXERCISE_SETS)) {
      setSetsError(`세트는 1 이상 ${MAX_EXERCISE_SETS} 이하의 정수로 입력해 주세요.`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ name, amount, sets, youtubeLinks, memo });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles['form']} onSubmit={handleSubmit}>
      <fieldset className={styles['fields']} disabled={isSaving}>
        <div className={styles['field']}>
          <label htmlFor="exercise-name">
            운동 이름{' '}
            <span className={styles['required']} aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="exercise-name"
            name="name"
            defaultValue={initialValues?.name}
            required
            placeholder="예: 푸시업"
            onChange={() => setNameError('')}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'exercise-name-error' : undefined}
          />
          <FieldError id="exercise-name-error" message={nameError} />
        </div>
        <div className={styles['amount-row']}>
          <div className={`${styles['field']} ${styles['amount-field']}`}>
            <label htmlFor="exercise-amount">운동량</label>
            <Input
              id="exercise-amount"
              name="amount"
              defaultValue={initialValues?.amount}
              placeholder="예: 10회, 30초"
              aria-describedby="amount-hint"
            />
          </div>
          <div className={`${styles['field']} ${styles['sets-field']}`}>
            <label htmlFor="exercise-sets">세트</label>
            <Input
              id="exercise-sets"
              name="sets"
              defaultValue={initialValues?.sets ?? ''}
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_EXERCISE_SETS}
              step="1"
              placeholder="예: 3"
              onChange={() => setSetsError('')}
              aria-invalid={Boolean(setsError)}
              aria-describedby={setsError ? 'exercise-sets-error' : undefined}
            />
            <FieldError id="exercise-sets-error" message={setsError} />
          </div>
        </div>
        <p id="amount-hint" className={styles['amount-hint']}>
          횟수나 시간을 원하는 방식으로 적어주세요.
        </p>
        <fieldset className={styles['links-field']}>
          <legend>유튜브 링크</legend>
          {links.map((link, index) => {
            const inputId = `youtube-${link.id}`;
            const errorId = `${inputId}-error`;
            return (
              <div className={styles['link-item']} key={link.id}>
                <div className={styles['link-row']}>
                  <Input
                    id={inputId}
                    aria-label={`유튜브 링크 ${index + 1}`}
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="https://youtu.be/..."
                    value={link.value}
                    onChange={(event) => handleLinkChange(link.id, event.target.value)}
                    aria-invalid={Boolean(linkErrors[link.id])}
                    aria-describedby={linkErrors[link.id] ? errorId : undefined}
                  />
                  {links.length > 1 && (
                    <Button
                      color="gray"
                      fill="outline"
                      aria-label={`유튜브 링크 ${index + 1} 삭제`}
                      onClick={() => handleRemoveLink(link.id)}
                    >
                      삭제
                    </Button>
                  )}
                </div>
                <FieldError id={errorId} message={linkErrors[link.id]} />
              </div>
            );
          })}
          <Button color="gray" fill="outline" onClick={handleAddLink}>
            링크 추가
          </Button>
        </fieldset>
        <div className={styles['field']}>
          <label htmlFor="exercise-memo">메모</label>
          <Textarea
            id="exercise-memo"
            name="memo"
            defaultValue={initialValues?.memo}
            rows={4}
            placeholder="자세, 주의할 점 등 자유롭게 적어주세요."
          />
        </div>
      </fieldset>
      <div className={styles['actions']}>
        <Button className={styles['action']} type="submit" fill="solid" disabled={isSaving}>
          {isSaving ? '저장 중…' : '저장'}
        </Button>
      </div>
    </form>
  );
}

function createLinkInputs(values: TExerciseValues | undefined): TLinkInput[] {
  const links = values?.youtubeLinks ?? [];
  if (links.length === 0) {
    return [{ id: crypto.randomUUID(), value: '' }];
  }
  return links.map((value) => ({ id: crypto.randomUUID(), value }));
}
