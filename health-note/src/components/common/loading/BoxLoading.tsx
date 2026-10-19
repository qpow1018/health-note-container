import styles from './BoxLoading.module.scss';

type TBoxLoadingProps = {
  height?: number | string;
};

export default function BoxLoading({ height = 360 }: TBoxLoadingProps) {
  return (
    <div
      className={styles['box-loading']}
      style={{ height }}
      role="status"
      aria-label="불러오고 있어요."
    >
      <div className={styles['spinner']} aria-hidden="true" />
    </div>
  );
}
