import type { ComponentProps, ReactNode } from 'react';

import styles from './Checkbox.module.scss';

import { MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';

type TCheckboxProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  children: ReactNode;
};

export default function Checkbox({ children, className = '', ...props }: TCheckboxProps) {
  return (
    <label className={`${styles['checkbox']} ${className}`}>
      <input {...props} type="checkbox" className={styles['input']} />
      <span className={styles['icon']} aria-hidden="true">
        <MdCheckBoxOutlineBlank className={styles['unchecked']} size={22} />
        <MdCheckBox className={styles['checked']} size={22} />
      </span>
      <span className={styles['label']}>{children}</span>
    </label>
  );
}
