import type { ComponentProps } from 'react';

import styles from './Input.module.scss';

type TInputProps = ComponentProps<'input'>;

export default function Input({ className = '', ...props }: TInputProps) {
  return <input {...props} className={`${styles['input']} ${className}`} />;
}
