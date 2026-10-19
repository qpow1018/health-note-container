import type { ComponentProps, ReactNode } from 'react';

import styles from './Radio.module.scss';

import { MdRadioButtonChecked, MdRadioButtonUnchecked } from 'react-icons/md';

type TRadioProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  children: ReactNode;
};

export default function Radio({ children, className = '', ...props }: TRadioProps) {
  return (
    <label className={`${styles['radio']} ${className}`}>
      <input {...props} type="radio" className={styles['input']} />
      <span className={styles['icon']} aria-hidden="true">
        <MdRadioButtonUnchecked className={styles['unchecked']} size={22} />
        <MdRadioButtonChecked className={styles['checked']} size={22} />
      </span>
      <span className={styles['label']}>{children}</span>
    </label>
  );
}
