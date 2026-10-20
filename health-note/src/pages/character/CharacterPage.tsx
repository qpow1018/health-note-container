import { useState } from 'react';

import type { TCharacterStage } from '@/features/character/CharacterArtwork';

import Header from '@/components/common/header/Header';
import CharacterArtwork from '@/features/character/CharacterArtwork';
import Character from '@/features/character/Character';

import styles from './CharacterPage.module.scss';

const STAGES = [
  { stage: 1, name: '작은 새싹' },
  { stage: 2, name: '아장아장' },
  { stage: 3, name: '쑥쑥' },
  { stage: 4, name: '첫 운동' },
  { stage: 5, name: '활기' },
  { stage: 6, name: '나의 페이스' },
] as const;

export default function CharacterPage() {
  const [stage, setStage] = useState<TCharacterStage>(1);
  return (
    <section className={styles['character-page']}>
      <Header title="운동이" showBack={false} />
      <div className={styles['content']}>
        <div className={styles['stage']}>
          <div className={styles['preview']}>
            <Character key={stage} appearance="sprout" stage={stage} />
          </div>
        </div>
        <h2>새싹</h2>
        <p>운동이를 눌러 인사해 보세요.</p>
        <div className={styles['stages']} role="group" aria-label="성장 모습 선택">
          {STAGES.map((item) => (
            <button
              key={item.stage}
              type="button"
              aria-pressed={stage === item.stage}
              onClick={() => setStage(item.stage)}
            >
              <CharacterArtwork
                appearance="sprout"
                stage={item.stage}
                isReacting={false}
                isActive={false}
              />
              <span>
                {item.stage}단계 · {item.name}
              </span>
            </button>
          ))}
        </div>
        <p>외형 비교용 6단계 초안이에요. 레벨 구간은 아직 연결하지 않았어요.</p>
      </div>
    </section>
  );
}
