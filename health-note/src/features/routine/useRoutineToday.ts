import { useEffect, useState } from 'react';

import { getTodayDate } from './routineSchedule';

export function useRoutineToday(): string {
  const [today, setToday] = useState(getTodayDate);

  useEffect(() => {
    let timer: number;

    function refreshDate() {
      setToday(getTodayDate());
      window.clearTimeout(timer);
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      timer = window.setTimeout(refreshDate, nextMidnight.getTime() - Date.now());
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') refreshDate();
    }

    refreshDate();
    window.addEventListener('focus', refreshDate);
    window.addEventListener('pageshow', refreshDate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refreshDate);
      window.removeEventListener('pageshow', refreshDate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return today;
}
