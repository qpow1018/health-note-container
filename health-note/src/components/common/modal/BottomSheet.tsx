import { useEffect, useId, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

import styles from './BottomSheet.module.scss';

import { MdClose } from 'react-icons/md';

type TBottomSheetProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export default function BottomSheet({
  isOpen,
  title,
  onClose,
  children,
  footer,
}: TBottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useBodyScrollLock(isOpen);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!isOpen) {
      dialog.close();
      return;
    }

    dialog.showModal();

    return () => {
      dialog.close();
    };
  }, [isOpen]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const isOutside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (isOutside) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles['bottom-sheet']}
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles['panel']}>
        <header className={styles['header']}>
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" autoFocus>
            <MdClose size={24} aria-hidden="true" />
          </button>
        </header>
        <div className={styles['content']}>{children}</div>
        {footer && <footer className={styles['footer']}>{footer}</footer>}
      </div>
    </dialog>
  );
}
