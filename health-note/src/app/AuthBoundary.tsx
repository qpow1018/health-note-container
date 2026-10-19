import { Fragment } from 'react';
import type { ReactNode } from 'react';

import { useAuthSession } from '@/features/auth/useAuthSession';

import LoginPage from '@/pages/login/LoginPage';

import styles from './AuthBoundary.module.scss';

export default function AuthBoundary({ children }: { children: ReactNode }) {
  const { session, isLoading, error } = useAuthSession();

  if (isLoading) {
    return (
      <div className={styles['loading']} role="status">
        로그인 상태를 확인하고 있어요.
      </div>
    );
  }

  if (!session) return <LoginPage initialError={error} />;

  return <Fragment key={session.user.id}>{children}</Fragment>;
}
