import { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';

import SproutCharacter from './SproutCharacter';

import styles from './CharacterPlayground.module.scss';

const RESIDENTS = [
  { action: 'stretch', label: '스트레칭' },
  { action: 'rope', label: '줄넘기' },
  { action: 'walk', label: '산책' },
  { action: 'ball', label: '공놀이' },
  { action: 'hop', label: '폴짝폴짝' },
] as const;

export default function CharacterPlayground() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);
  const [isPaused, setIsPaused] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <section className={styles['playground']} aria-label="운동이 운동장">
      <div className={styles['heading']}>
        <div>
          <h2>작은 운동장</h2>
          <p>각자의 속도로, 함께 놀아요.</p>
        </div>
        <button type="button" aria-pressed={isPaused} onClick={() => setIsPaused(!isPaused)}>
          {isPaused ? '다시 재생' : '일시정지'}
        </button>
      </div>
      <div
        ref={ref}
        className={styles['scene']}
        data-active={!isPaused && isInView && isPageVisible}
      >
        <svg
          className={styles['landscape']}
          viewBox="0 0 360 430"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect width="360" height="430" fill="#e5efcf" />
          <path fill="#f3f4dd" d="M0 0h360v94Q190 123 0 88Z" />
          <g fill="#c4d8a3">
            <ellipse cx="33" cy="90" rx="55" ry="32" />
            <ellipse cx="320" cy="86" rx="62" ry="38" />
          </g>
          <g stroke="#e8ddbc" strokeWidth="7" strokeLinecap="round">
            <path d="M35 74v39m31-39v39m228-39v36m31-36v36M15 87h69m193 0h69" />
          </g>
          <ellipse
            cx="181"
            cy="263"
            rx="161"
            ry="92"
            fill="none"
            stroke="#d8c9a7"
            strokeWidth="36"
          />
          <ellipse
            cx="181"
            cy="263"
            rx="161"
            ry="92"
            fill="none"
            stroke="#f4e5c8"
            strokeWidth="28"
          />
          <ellipse
            cx="181"
            cy="263"
            rx="161"
            ry="92"
            fill="none"
            stroke="#fff4dc"
            strokeWidth="1.5"
            strokeDasharray="6 8"
          />
          <ellipse cx="85" cy="189" rx="50" ry="12" fill="#b8cfc2" />
          <ellipse cx="85" cy="186" rx="50" ry="12" fill="#cee0d6" />
          <g stroke="#92ae7d" strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="m20 161 3-5 4 5m295 12 3-5 4 5M26 392l3-5 4 5m264 13 3-5 4 5m-130-280 3-5 4 5" />
          </g>
          <g fill="#f6edcf">
            <circle cx="43" cy="126" r="3" />
            <circle cx="311" cy="384" r="3" />
            <circle cx="150" cy="144" r="2.5" />
          </g>
          <g transform="translate(268 111)" stroke="#ae906b" strokeWidth="4" strokeLinecap="round">
            <path d="M0 3h40M0 10h40M5 15v10m30-10v10" />
          </g>
        </svg>
        <ul className={styles['residents']} aria-label="함께 있는 운동이">
          {RESIDENTS.map((resident) => (
            <li
              key={resident.action}
              className={styles['resident']}
              data-action={resident.action}
              aria-label={`${resident.label} 하는 운동이`}
            >
              <span className={styles['shadow']} aria-hidden="true" />
              <div className={styles['motion']} aria-hidden="true">
                <SproutCharacter action={resident.action} />
              </div>
              {resident.action === 'ball' && <span className={styles['ball']} aria-hidden="true" />}
              <span className={styles['label']}>{resident.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className={styles['caption']}>5마리의 하루를 구경해 보세요.</p>
    </section>
  );
}
