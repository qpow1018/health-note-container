import { NavLink, Outlet } from 'react-router-dom';

import styles from './BottomNavigationLayout.module.scss';

import { MdCalendarMonth, MdFitnessCenter, MdHome } from 'react-icons/md';

export default function BottomNavigationLayout() {
  return (
    <div className={styles['layout']}>
      <Outlet />

      <nav className={styles['navigation']} aria-label="주요 메뉴">
        <NavLink to="/" end>
          <MdHome size={22} aria-hidden="true" />
          <span>홈</span>
        </NavLink>
        <NavLink to="/routine">
          <MdCalendarMonth size={22} aria-hidden="true" />
          <span>루틴</span>
        </NavLink>
        <NavLink to="/exercise">
          <MdFitnessCenter size={22} aria-hidden="true" />
          <span>운동</span>
        </NavLink>
      </nav>
    </div>
  );
}
