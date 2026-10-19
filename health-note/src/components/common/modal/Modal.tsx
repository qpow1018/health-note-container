import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

import styles from './Modal.module.scss';

type TModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ isOpen, title, onClose, children }: TModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useBodyScrollLock(isOpen);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    dialog.showModal();

    return () => {
      dialog.close();
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className={styles['modal']}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={titleId} className={styles['title']}>
        {title}
      </h2>
      {children}
    </dialog>
  );
}
