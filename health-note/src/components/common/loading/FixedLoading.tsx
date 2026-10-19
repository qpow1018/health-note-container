import styles from './FixedLoading.module.scss';

export default function FixedLoading() {
  return (
    <div className={styles['fixed-loading']} role="status" aria-label="불러오고 있어요.">
      <div className={styles['spinner']} aria-hidden="true" />
    </div>
  );
}
