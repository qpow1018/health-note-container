import type { ComponentProps } from 'react';

import styles from './Textarea.module.scss';

type TTextareaProps = ComponentProps<'textarea'>;

export default function Textarea({ className = '', ...props }: TTextareaProps) {
  return <textarea {...props} className={`${styles['textarea']} ${className}`} />;
}
