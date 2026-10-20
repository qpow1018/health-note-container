import { useContext, useState } from 'react';
import type { FormEvent } from 'react';

import { updateNickname } from '@/api/auth';
import { AuthUserContext } from '@/features/auth/AuthUserContext';
import toast from '@/utils/toast';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import FieldError from '@/components/common/form/FieldError';
import Modal from '@/components/common/modal/Modal';

import styles from './NicknameForm.module.scss';

type TNicknameFormProps = {
  onClose: () => void;
};

export default function NicknameForm({ onClose }: TNicknameFormProps) {
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
      onClose();
    } catch {
      setError('닉네임을 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      title="닉네임 변경"
      onClose={() => {
        if (!isSaving) onClose();
      }}
    >
      <form className={styles['nickname-form']} onSubmit={handleSubmit} noValidate>
        <label htmlFor="nickname">닉네임</label>
        <p id="nickname-help" className={styles['help']}>
          공백 없이 한글·영문·숫자 1~10자로 설정할 수 있어요.
        </p>
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
        <FieldError id="nickname-error" message={error} />
        <div className={styles['actions']}>
          <Button color="gray" fill="outline" disabled={isSaving} onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? '저장 중…' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
