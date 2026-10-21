import Header from '@/components/common/header/Header';
import CharacterPlayground from '@/features/character/CharacterPlayground';

import styles from './PlaygroundPage.module.scss';

export default function PlaygroundPage() {
  return (
    <section className={styles['playground-page']}>
      <Header title="운동장" showBack={false} />
      <div className={styles['content']}>
        <CharacterPlayground />
      </div>
    </section>
  );
}
