import Header from '@/components/common/header/Header';
import Character from '@/features/character/Character';

import styles from './CharacterPage.module.scss';

export default function CharacterPage() {
  return (
    <section className={styles['character-page']}>
      <Header title="운동이" showBack={false} />
      <div className={styles['content']}>
        <div className={styles['preview']}>
          <Character />
        </div>
        <p>운동이를 눌러 인사해 보세요.</p>
      </div>
    </section>
  );
}
