import { useId } from 'react';

import styles from './CharacterArtwork.module.scss';

export type TCharacterStage = 1 | 2 | 3 | 4 | 5 | 6;

export type TCharacterAppearance = 'sprout' | 'mochi';

type TCharacterArtworkProps = {
  appearance: TCharacterAppearance;
  stage?: TCharacterStage;
  isReacting: boolean;
  isActive: boolean;
};

export default function CharacterArtwork({
  appearance,
  stage = 1,
  isReacting,
  isActive,
}: TCharacterArtworkProps) {
  const isSprout = appearance === 'sprout';
  const gradientId = useId();
  const bodyColor = isSprout ? '#dfedbe' : '#fff8e8';
  return (
    <svg
      viewBox="0 0 160 160"
      aria-hidden="true"
      className={styles['artwork']}
      data-appearance={appearance}
      data-stage={stage}
      data-reacting={isReacting}
      data-active={isActive}
    >
      <defs>
        <radialGradient id={gradientId} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor={isSprout ? '#edf5d8' : '#fffdf5'} />
          <stop offset="75%" stopColor={bodyColor} />
          <stop offset="100%" stopColor={isSprout ? '#cfdfa9' : '#f4e9d3'} />
        </radialGradient>
      </defs>
      <g stroke="#514535" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {isSprout && stage > 1 ? (
          <GrowingSprout stage={stage} fill={`url(#${gradientId})`} />
        ) : (
          <>
            <ellipse cx="53" cy="140" rx="10" ry="6.5" fill={bodyColor} />
            <ellipse cx="107" cy="140" rx="10" ry="6.5" fill={bodyColor} />
            <g className={styles['body']}>
              {isSprout ? (
                <>
                  <SproutCrown />
                  <path
                    fill={`url(#${gradientId})`}
                    d="M80 44C55 44 36 59 31 81c-2 8-15 12-17 25-2 12 7 18 15 10 1 18 19 27 51 27s50-9 51-27c8 8 17 2 15-10-2-13-15-17-17-25-5-22-24-37-49-37Z"
                  />
                </>
              ) : (
                <path
                  fill={`url(#${gradientId})`}
                  d="M78 43C57 41 39 55 31 76c-5 13-20 18-21 31-1 12 9 18 19 10 2 18 20 26 51 26 30 0 49-8 51-26 10 8 20 2 19-10-1-13-17-17-23-30-9-21-27-32-49-34Z"
                />
              )}
              <ellipse
                cx="80"
                cy="116"
                rx="34"
                ry="17"
                fill={isSprout ? '#eaf3d4' : '#fffdf5'}
                stroke="none"
              />
              {!isSprout && <ellipse cx="80" cy="64" rx="6" ry="8" fill="#efa385" stroke="none" />}
              <g fill={isSprout ? '#f3b5a4' : '#f6c49a'} stroke="none">
                <ellipse cx="45" cy="99" rx="10" ry="7.5" />
                <ellipse cx="115" cy="99" rx="10" ry="7.5" />
              </g>
              <g className={styles['eyes']} fill="#42392e" stroke="none">
                <circle cx="59" cy="88" r="5" />
                <circle cx="101" cy="88" r="5" />
              </g>
              <path className={styles['smile']} fill="none" d="M73 98c1 8 13 8 14 0" />
              <ellipse
                className={styles['surprise']}
                cx="80"
                cy="103"
                rx="4"
                ry="5.5"
                fill="#80564c"
                stroke="none"
              />
              <path
                className={styles['left-arm']}
                fill="none"
                stroke={isSprout ? '#b3bf8d' : '#dfd2b6'}
                strokeWidth="1.8"
                d="M29 108q-2 5 0 8"
              />
              <path
                className={styles['right-arm']}
                fill="none"
                stroke={isSprout ? '#b3bf8d' : '#dfd2b6'}
                strokeWidth="1.8"
                d="M131 108q2 5 0 8"
              />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

function SproutCrown() {
  return (
    <g fill="#a6c66d">
      <path d="M79 47C59 46 38 32 39 20c0-8 34-4 40 27Z" />
      <path d="M80 46C78 25 99 9 120 12c6 14-18 33-40 34Z" />
      <path fill="none" stroke="#819c51" strokeWidth="2" d="M51 27q20 6 29 20m0-3q11-17 29-24" />
    </g>
  );
}

function GrowingSprout({ stage, fill }: { stage: TCharacterStage; fill: string }) {
  const isTall = stage >= 4;
  const isStepping = stage === 5;
  const isRaised = stage === 2 || stage === 4 || stage === 6;
  return (
    <g className={styles['body']}>
      <g transform={isTall ? 'translate(8 -6) scale(.9)' : 'translate(8 0) scale(.9)'}>
        <SproutCrown />
      </g>
      <g fill={fill}>
        {isTall ? (
          <>
            <path
              d={
                isStepping
                  ? 'M92 127q-3 15 4 22 14 5 18-2 0-12-8-23Z'
                  : 'M50 125q-5 14-3 22 3 7 19 3 8-4 6-24Z'
              }
            />
            <path
              d={
                isStepping
                  ? 'M52 119q-17-1-19 12-1 13 14 13 16-1 19-17Z'
                  : 'M91 126q-2 20 6 24 16 4 19-3 2-8-3-22Z'
              }
            />
          </>
        ) : (
          <>
            <ellipse cx="60" cy="141" rx="12" ry="7" />
            <ellipse cx="100" cy="141" rx="12" ry="7" />
          </>
        )}
        <path
          d={
            isTall
              ? 'M80 33c-29 0-45 23-45 56 0 29 14 45 45 45s45-16 45-45c0-33-16-56-45-56Z'
              : 'M80 42c-27 0-46 22-46 53 0 29 17 44 46 44s46-15 46-44c0-31-19-53-46-53Z'
          }
        />
      </g>
      <ellipse cx="80" cy="112" rx="29" ry="17" fill="#eaf3d4" stroke="none" />
      {stage >= 5 && (
        <g fill="#ded0ed" stroke="#b6a4c8" strokeWidth="1.5">
          <path d="M43 76q-11 9-13 39l15 5q-1-20 10-34Z" />
          <path d="M117 76q11 9 13 39l-15 5q1-20-10-34Z" />
          <path fill="none" stroke="#c7b7d8" d="m34 112 9 3m74 0 9-3" />
        </g>
      )}
      {stage === 6 && (
        <g>
          <path
            fill="#fff2d9"
            stroke="#d1b990"
            strokeWidth="1.5"
            d="M39 61q41-19 82 0l-1 9q-40-18-80 0Z"
          />
          <path fill="none" stroke="#e7b86b" strokeWidth="3" d="M41 65q39-18 78 0" />
          <path
            fill="#f3d07e"
            stroke="#c7a35e"
            strokeWidth="1"
            d="m121 100 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z"
          />
        </g>
      )}
      <g fill="#f3b5a4" stroke="none">
        <ellipse cx="51" cy={isTall ? 86 : 94} rx="8" ry="6.5" />
        <ellipse cx="109" cy={isTall ? 86 : 94} rx="8" ry="6.5" />
      </g>
      <g transform={isTall ? 'translate(0 -8)' : undefined}>
        <g className={styles['eyes']} fill="#42392e" stroke="none">
          <ellipse cx="62" cy="83" rx="4.5" ry="5.5" />
          <ellipse cx="98" cy="83" rx="4.5" ry="5.5" />
        </g>
        <g className={styles['smile']}>
          <path fill="#874b40" strokeWidth="1.5" d="M70 94q10 5 20 0c0 17-20 17-20 0Z" />
          <path fill="#eb9e8b" stroke="none" d="M73 102q7-5 14 0-7 8-14 0Z" />
        </g>
        <ellipse
          className={styles['surprise']}
          cx="80"
          cy="98"
          rx="4"
          ry="5.5"
          fill="#80564c"
          stroke="none"
        />
      </g>
      {stage === 3 && (
        <g transform="rotate(6 80 115)" strokeWidth="1.5">
          <rect x="69" y="101" width="23" height="31" rx="8" fill="#fff0cf" />
          <rect x="68" y="98" width="25" height="8" rx="3" fill="#93c5ae" stroke="#749c85" />
          <path d="M80 98v-7h5" fill="none" stroke="#749c85" strokeWidth="3" />
          <path d="m77 115 4 7 5-10" fill="none" stroke="#93b493" strokeWidth="2" />
        </g>
      )}
      <g fill={fill}>
        <g className={styles['left-arm']}>
          <path
            d={
              stage === 3
                ? 'M42 101c-10 0-11 15 0 20 12 6 27 4 27-5 0-8-13-4-17-10Z'
                : isStepping
                  ? 'M42 86c-12-8-25-4-27 5-2 11 12 18 27 13Z'
                  : 'M42 88c-12 0-20 14-13 24 6 9 22 5 23-5 1-8-6-10-10-19Z'
            }
          />
        </g>
        <g className={styles['right-arm']}>
          <path
            d={
              stage === 3
                ? 'M118 101c10 0 11 15 0 20-12 6-27 4-27-5 0-8 13-4 17-10Z'
                : isRaised
                  ? 'M118 91c14-2 25-17 26-29 1-13-14-17-20-7-6 9-2 17-16 22Z'
                  : 'M118 86c12-8 25-4 27 5 2 11-12 18-27 13Z'
            }
          />
          {stage === 4 && (
            <path fill="#edac91" stroke="#c78c76" strokeWidth="1.5" d="m123 71 17 6 3-10-18-6Z" />
          )}
        </g>
      </g>
    </g>
  );
}
