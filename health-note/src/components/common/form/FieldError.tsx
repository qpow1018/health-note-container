import styles from './FieldError.module.scss';

type TFieldErrorProps = {
  id: string;
  message: string | undefined;
};

export default function FieldError({ id, message }: TFieldErrorProps) {
  if (!message) return null;

  return (
    <p id={id} className={styles['field-error']} role="alert">
      {message}
    </p>
  );
}
