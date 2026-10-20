import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';

import styles from './Tabs.module.scss';

type TTabsProps = {
  label: string;
  items: { label: string; to: To; isActive: boolean }[];
};

export default function Tabs({ label, items }: TTabsProps) {
  return (
    <nav className={styles['tabs']} aria-label={label}>
      {items.map((item) => (
        <Link key={item.label} to={item.to} aria-current={item.isActive ? 'page' : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
