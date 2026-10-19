import { useEffect, useSyncExternalStore } from 'react';

import { getToastSnapshot, removeToast, subscribeToast } from '@/utils/toast';
import type { TToastItem } from '@/utils/toast';

import styles from './ToastContainer.module.scss';

import { MdClose } from 'react-icons/md';

export default function ToastContainer() {
  const toasts = useSyncExternalStore(subscribeToast, getToastSnapshot);

  return (
    <div className={styles['toast-container']}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: TToastItem }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast.duration, toast.id]);

  return (
    <div
      className={`${styles['toast']} ${styles[`type-${toast.type}`]}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <p className={styles['message']}>{toast.message}</p>
      {toast.isShowCloseButton && (
        <button
          type="button"
          className={styles['close-button']}
          onClick={() => removeToast(toast.id)}
          aria-label="토스트 닫기"
        >
          <MdClose size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
