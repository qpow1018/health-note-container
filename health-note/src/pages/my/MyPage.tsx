import { useContext, useEffect, useRef, useState } from 'react';

import { AuthUserContext } from '@/features/auth/AuthUserContext';

import Header from '@/components/common/header/Header';
import LogoutButton from '@/features/auth/LogoutButton';
import NicknameForm from '@/features/profile/NicknameForm';

import styles from './MyPage.module.scss';

export default function MyPage() {
  const { user } = useContext(AuthUserContext)!;
  const provider = user.app_metadata.provider;
  const [isNicknameOpen, setIsNicknameOpen] = useState(false);
  const nicknameButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isNicknameOpen) return;
    const button = nicknameButtonRef.current;
    return () => button?.focus();
  }, [isNicknameOpen]);

  return (
    <section className={styles['my-page']}>
      <Header title="마이페이지" showBack={false} />
      <div className={styles['content']}>
        <h2>로그인 계정</h2>
        <dl className={styles['account']}>
          <div>
            <dt>이메일</dt>
            <dd>{user.email || '이메일 정보가 없어요.'}</dd>
          </div>
          <div>
            <dt>로그인 방식</dt>
            <dd>{provider === 'google' ? 'Google' : provider || '확인할 수 없어요.'}</dd>
          </div>
        </dl>
        <div className={styles['menu']}>
          <button
            ref={nicknameButtonRef}
            className={styles['menu-item']}
            type="button"
            onClick={() => setIsNicknameOpen(true)}
          >
            <span>닉네임 변경</span>
            <span aria-hidden="true">›</span>
          </button>
          <LogoutButton />
        </div>
      </div>
      {isNicknameOpen && <NicknameForm onClose={() => setIsNicknameOpen(false)} />}
    </section>
  );
}
