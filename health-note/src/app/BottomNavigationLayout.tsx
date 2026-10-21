import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';

import styles from './BottomNavigationLayout.module.scss';

import { MdCalendarMonth, MdFitnessCenter, MdPerson, MdPets } from 'react-icons/md';

export default function BottomNavigationLayout() {
  const { pathname } = useLocation();
  const isExercise = pathname === '/exercise';
  return (
    <div className={styles['layout']}>
      <Outlet />

      <nav className={styles['navigation']} aria-label="주요 메뉴">
        <NavLink to="/plan">
          <MdCalendarMonth size={22} aria-hidden="true" />
          <span>플랜</span>
        </NavLink>
        <Link to="/exercise" aria-current={isExercise ? 'page' : undefined}>
          <MdFitnessCenter size={22} aria-hidden="true" />
          <span>운동</span>
        </Link>
        <NavLink to="/playground">
          <MdPets size={22} aria-hidden="true" />
          <span>운동장</span>
        </NavLink>
        <NavLink to="/my">
          <MdPerson size={22} aria-hidden="true" />
          <span>마이</span>
        </NavLink>
      </nav>
    </div>
  );
}
