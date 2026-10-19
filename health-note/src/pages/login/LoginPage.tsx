import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/features/auth/signInWithGoogle';

import styles from './LoginPage.module.scss';

import { FcGoogle } from 'react-icons/fc';

export default function LoginPage({ initialError }: { initialError: string }) {
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    function handlePageShow() {
      setIsSigningIn(false);
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  async function handleSignIn() {
    if (isSigningIn) return;
    setError('');
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (result === 'unavailable') {
        setError('구글 로그인 연결을 준비하고 있어요. 잠시 후 다시 시도해 주세요.');
        setIsSigningIn(false);
      }
    } catch {
      setError('로그인을 시작하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
      setIsSigningIn(false);
    }
  }

  return (
    <section className={styles['login-page']} aria-labelledby="login-title">
      <div className={styles['intro']}>
        <img src="/brand/health-note.svg" alt="" width="64" height="64" />
        <p className={styles['brand']}>헬스노트</p>
        <h1 id="login-title">
          내 방식대로 운동하고,
          <br />
          꾸준히 이어가세요.
        </h1>
        <p className={styles['description']}>로그인하고 나만의 운동과 루틴을 관리하세요.</p>
      </div>
      <div className={styles['actions']}>
        {(error || initialError) && <p role="alert">{error || initialError}</p>}
        <button
          type="button"
          className={styles['google-button']}
          disabled={isSigningIn || !supabase}
          aria-busy={isSigningIn}
          onClick={handleSignIn}
        >
          <FcGoogle size={20} aria-hidden="true" />
          {isSigningIn ? '구글로 이동하고 있어요…' : 'Google로 계속하기'}
        </button>
        <p className={styles['hint']}>구글 계정으로 간편하게 시작할 수 있어요.</p>
      </div>
    </section>
  );
}
