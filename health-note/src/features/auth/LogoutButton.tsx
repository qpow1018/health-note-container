import { useState } from 'react';

import { signOut } from '@/api/auth';
import toast from '@/utils/toast';

import Confirm from '@/components/common/modal/Confirm';

import styles from './LogoutButton.module.scss';

export default function LogoutButton() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsConfirmOpen(false);
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
    <>
      <button
        type="button"
        className={styles['logout-button']}
        disabled={isSigningOut}
        onClick={() => setIsConfirmOpen(true)}
      >
        {isSigningOut ? '로그아웃 중…' : '로그아웃'}
      </button>
      <Confirm
        isOpen={isConfirmOpen}
        title="로그아웃"
        message="로그아웃할까요?"
        confirmLabel="로그아웃"
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleSignOut}
      />
    </>
  );
}
