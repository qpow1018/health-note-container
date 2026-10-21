import SproutCharacter from './SproutCharacter';
import { MOCHI_ASSETS } from './assets/mochi';

import styles from './Character.module.scss';

export type TCharacterAppearance = 'sprout' | 'mochi';

type TCharacterProps = {
  appearance: TCharacterAppearance;
  isReacting: boolean;
  isActive: boolean;
};

export default function Character({ appearance, isReacting, isActive }: TCharacterProps) {
  if (appearance === 'sprout') {
    return <SproutCharacter isReacting={isReacting} isActive={isActive} />;
  }

  const { Artwork, viewBox } = MOCHI_ASSETS[1].front;
  return (
    <svg
      viewBox={viewBox}
      aria-hidden="true"
      className={styles['artwork']}
      data-appearance={appearance}
      data-reacting={isReacting}
      data-active={isActive}
    >
      <Artwork />
    </svg>
  );
}
