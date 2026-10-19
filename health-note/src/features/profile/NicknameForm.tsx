import { useContext, useState } from 'react';
import type { FormEvent } from 'react';

import { updateNickname } from '@/api/auth';
import { AuthUserContext } from '@/features/auth/AuthUserContext';
import toast from '@/utils/toast';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import FieldError from '@/components/common/form/FieldError';

import styles from './NicknameForm.module.scss';

export default function NicknameForm() {
  const user = useContext(AuthUserContext);
  const savedNickname = user?.user_metadata.nickname;
  const [nickname, setNickname] = useState(
    typeof savedNickname === 'string' && savedNickname ? savedNickname : '운동이',
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    if (!/^[가-힣a-zA-Z0-9]{1,10}$/.test(nickname)) {
      setError('공백 없이 한글·영문·숫자 1~10자로 입력해 주세요.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await updateNickname(nickname);
      toast.success('닉네임을 저장했어요.');
    } catch {
      setError('닉네임을 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles['nickname-form']} onSubmit={handleSubmit} noValidate>
      <label htmlFor="nickname">닉네임</label>
      <p id="nickname-help" className={styles['help']}>
        공백 없이 한글·영문·숫자 1~10자로 설정할 수 있어요.
      </p>
      <div className={styles['controls']}>
        <Input
          id="nickname"
          value={nickname}
          disabled={isSaving}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'nickname-help nickname-error' : 'nickname-help'}
          onChange={(event) => {
            setNickname(event.target.value);
            setError('');
          }}
        />
        <Button type="submit" disabled={isSaving}>
          {isSaving ? '저장 중…' : '저장'}
        </Button>
      </div>
      <FieldError id="nickname-error" message={error} />
    </form>
  );
}
