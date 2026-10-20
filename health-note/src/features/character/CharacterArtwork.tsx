import styles from './CharacterArtwork.module.scss';

type TCharacterArtworkProps = {
  isReacting: boolean;
  isActive: boolean;
};

export default function CharacterArtwork({ isReacting, isActive }: TCharacterArtworkProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={styles['artwork']}
      data-reacting={isReacting}
      data-active={isActive}
    >
      <g stroke="#35493e" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <g className={styles['body']}>
          <path fill="#d9eab4" d="M49 36C40 28 45 16 55 14c13-3 23 11 14 22Z" />
          <path
            fill="#e0edbe"
            d="M60 32C39 32 24 47 18 65 10 84 17 100 34 104c14 4 39 5 55-1 17-5 21-18 15-34C97 48 84 32 60 32Z"
          />
          <ellipse cx="60" cy="85" rx="25" ry="17" fill="#ebf2d2" stroke="none" />
          <g className={styles['eyes']} fill="#35493e" stroke="none">
            <ellipse cx="43" cy="63" rx="3.8" ry="5" />
            <ellipse cx="77" cy="63" rx="3.8" ry="5" />
          </g>
          <g fill="#f1b1a7" stroke="none">
            <ellipse cx="33" cy="75" rx="7" ry="5.2" />
            <ellipse cx="87" cy="75" rx="7" ry="5.2" />
          </g>
          <g className={styles['smile']} stroke="none">
            <path fill="#814b47" d="M51 73q9 4 18 0c2 15-20 15-18 0Z" />
            <path fill="#e9918b" d="M54 81q6-5 12 0c-3 4-9 4-12 0Z" />
          </g>
          <ellipse
            className={styles['surprise']}
            cx="60"
            cy="78"
            rx="4.5"
            ry="6"
            fill="#814b47"
            stroke="none"
          />
          <g className={styles['left-arm']}>
            <path fill="#dfecba" d="M33 83c-10-8-20 5-12 13 5 6 16 1 15-5" />
          </g>
          <g className={styles['right-arm']}>
            <path fill="#dfecba" d="M87 83c10-8 20 5 12 13-5 6-16 1-15-5" />
          </g>
        </g>
        <ellipse cx="39" cy="105" rx="11" ry="7" fill="#dae8b7" />
        <ellipse cx="81" cy="105" rx="11" ry="7" fill="#dae8b7" />
      </g>
    </svg>
  );
}
