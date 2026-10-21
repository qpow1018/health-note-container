import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

import Character from './Character';
import type { TCharacterAppearance } from './Character';

import styles from './InteractiveCharacter.module.scss';

type TInteractionState = 'idle' | 'pressing' | 'bouncing';

export default function InteractiveCharacter({ appearance }: { appearance: TCharacterAppearance }) {
  const ref = useRef<HTMLButtonElement>(null);
  const isInView = useInView(ref);
  const shouldReduceMotion = useReducedMotion();
  const [state, setState] = useState<TInteractionState>('idle');
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  const isActive = isInView && isPageVisible;
  const animation = isActive ? state : 'idle';

  useEffect(() => {
    function handleVisibilityChange() {
      setIsPageVisible(!document.hidden);
      setState('idle');
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div className={styles['character-root']}>
      <span className={styles['shadow']} aria-hidden="true" />
      <motion.button
        ref={ref}
        type="button"
        className={styles['character']}
        aria-label="운동이와 인사하기"
        initial={false}
        animate={animation}
        variants={{
          idle: { scaleX: 1, scaleY: 1, y: 0, opacity: 1 },
          pressing: {
            scaleX: shouldReduceMotion ? 1 : 1.07,
            scaleY: shouldReduceMotion ? 1 : 0.91,
            y: 0,
            opacity: shouldReduceMotion ? 0.8 : 1,
            transition: { duration: 0.12 },
          },
          bouncing: {
            scaleX: shouldReduceMotion ? 1 : [1.07, 0.96, 1.035, 1],
            scaleY: shouldReduceMotion ? 1 : [0.91, 1.05, 0.97, 1],
            y: shouldReduceMotion ? 0 : [0, -22, 0, 0],
            opacity: 1,
            transition: { duration: shouldReduceMotion ? 0.15 : 0.65, ease: 'easeInOut' },
          },
        }}
        onTapStart={() => setState('pressing')}
        onTap={() => setState('bouncing')}
        onTapCancel={() => setState('idle')}
        onViewportLeave={() => setState('idle')}
        onAnimationComplete={(definition) => {
          if (definition === 'bouncing')
            setState((current) => (current === 'bouncing' ? 'idle' : current));
        }}
      >
        <Character
          appearance={appearance}
          isReacting={state !== 'idle'}
          isActive={isActive && !shouldReduceMotion}
        />
      </motion.button>
    </div>
  );
}
