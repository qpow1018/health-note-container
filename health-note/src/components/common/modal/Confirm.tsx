import Button from '@/components/common/button/Button';
import Modal from './Modal';

import styles from './Confirm.module.scss';

type TConfirmProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function Confirm({
  isOpen,
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
}: TConfirmProps) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <p className={styles['message']}>{message}</p>
      <div className={styles['actions']}>
        <Button color="gray" fill="outline" onClick={onClose} autoFocus>
          취소
        </Button>
        <Button color="rose" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
