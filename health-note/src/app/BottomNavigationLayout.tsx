import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';

import styles from './BottomNavigationLayout.module.scss';

import { MdFitnessCenter, MdHome, MdPerson } from 'react-icons/md';

export default function BottomNavigationLayout() {
  const { pathname } = useLocation();
  const isExercise = pathname === '/exercise';
  return (
    <div className={styles['layout']}>
      <Outlet />

      <nav className={styles['navigation']} aria-label="주요 메뉴">
        <NavLink to="/" end>
          <MdHome size={22} aria-hidden="true" />
          <span>홈</span>
        </NavLink>
        <Link to="/exercise" aria-current={isExercise ? 'page' : undefined}>
          <MdFitnessCenter size={22} aria-hidden="true" />
          <span>운동</span>
        </Link>
        <NavLink to="/my">
          <MdPerson size={22} aria-hidden="true" />
          <span>마이</span>
        </NavLink>
      </nav>
    </div>
  );
}
