import { SPROUT_ASSETS } from './assets/sprout';
import type { TSproutDirection, TSproutStage } from './assets/sprout';

import styles from './SproutCharacter.module.scss';

export type TSproutAction = 'idle' | 'stretch' | 'rope' | 'walk' | 'ball' | 'hop';

type TSproutCharacterProps = {
  stage?: TSproutStage;
  direction?: TSproutDirection;
  action?: TSproutAction;
  isReacting?: boolean;
  isActive?: boolean;
};

export default function SproutCharacter({
  stage = 1,
  direction = 'front',
  action = 'idle',
  isReacting = false,
  isActive = true,
}: TSproutCharacterProps) {
  const { Artwork, viewBox } = SPROUT_ASSETS[stage][direction];
  return (
    <svg
      viewBox={viewBox}
      className={styles['character']}
      data-appearance="sprout"
      data-stage={stage}
      data-direction={direction}
      data-action={action}
      data-reacting={isReacting}
      data-active={isActive}
      aria-hidden="true"
    >
      <Artwork />
      {action === 'rope' && (
        <g strokeLinecap="round" fill="none">
          <path
            className={styles['rope']}
            d="M21 110C-8 167 168 167 139 110"
            stroke="#d89e74"
            strokeWidth="3"
          />
          <path d="m16 109 8 5m112 0 8-5" stroke="#cb8d63" strokeWidth="5" />
        </g>
      )}
    </svg>
  );
}
