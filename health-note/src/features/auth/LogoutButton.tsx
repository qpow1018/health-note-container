import { useState } from 'react';

import { signOut } from '@/api/auth';
import toast from '@/utils/toast';

import styles from './LogoutButton.module.scss';

export default function LogoutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        toast.error('로그아웃을 서버에서 확인하지 못했어요. 인터넷 연결을 확인해 주세요.');
      }
    } catch {
      toast.error('로그아웃하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      className={styles['logout-button']}
      disabled={isSigningOut}
      onClick={handleSignOut}
    >
      {isSigningOut ? '로그아웃 중…' : '로그아웃'}
    </button>
  );
}
