import { useId } from 'react';

// Geometry only. Part names are the animation contract used by SproutCharacter.
export default function SproutStage1Front() {
  const id = useId();
  return (
    <g
      data-asset="sprout-stage-1-front"
      stroke="#514535"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <radialGradient id={`${id}-fill`} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#edf5d8" />
          <stop offset="75%" stopColor="#dfedbe" />
          <stop offset="100%" stopColor="#cfdfa9" />
        </radialGradient>
        <path
          id={`${id}-outline`}
          d="M80 44C55 44 36 59 31 81c-2 8-15 12-17 25-2 12 7 18 15 10 1 18 19 27 51 27s50-9 51-27c8 8 17 2 15-10-2-13-15-17-17-25-5-22-24-37-49-37Z"
        />
        <clipPath id={`${id}-left`}>
          <path d="M0 77H34L43 122H0Z" />
        </clipPath>
        <clipPath id={`${id}-right`}>
          <path d="M126 77H160V122H117Z" />
        </clipPath>
        <clipPath id={`${id}-torso`}>
          <path d="M0 0H160V77H126L117 122H160V160H0V122H43L34 77H0Z" />
        </clipPath>
      </defs>
      <g data-part="left-foot">
        <ellipse cx="53" cy="140" rx="10" ry="6.5" fill="#dfedbe" />
      </g>
      <g data-part="right-foot">
        <ellipse cx="107" cy="140" rx="10" ry="6.5" fill="#dfedbe" />
      </g>
      <g data-part="body">
        <g data-part="leaves" fill="#a6c66d">
          <path d="M79 47C59 46 38 32 39 20c0-8 34-4 40 27Z" />
          <path d="M80 46C78 25 99 9 120 12c6 14-18 33-40 34Z" />
          <path
            fill="none"
            stroke="#819c51"
            strokeWidth="2"
            d="M51 27q20 6 29 20m0-3q11-17 29-24"
          />
        </g>
        <use href={`#${id}-outline`} fill={`url(#${id}-fill)`} clipPath={`url(#${id}-torso)`} />
        <g data-part="left-arm">
          <use href={`#${id}-outline`} fill={`url(#${id}-fill)`} clipPath={`url(#${id}-left)`} />
          <path fill="none" stroke="#b3bf8d" strokeWidth="1.8" d="M29 108q-2 5 0 8" />
        </g>
        <g data-part="right-arm">
          <use href={`#${id}-outline`} fill={`url(#${id}-fill)`} clipPath={`url(#${id}-right)`} />
          <path fill="none" stroke="#b3bf8d" strokeWidth="1.8" d="M131 108q2 5 0 8" />
        </g>
        <ellipse cx="80" cy="116" rx="34" ry="17" fill="#eaf3d4" stroke="none" />
        <g fill="#f3b5a4" stroke="none">
          <ellipse cx="45" cy="99" rx="10" ry="7.5" />
          <ellipse cx="115" cy="99" rx="10" ry="7.5" />
        </g>
        <g data-part="eyes" fill="#42392e" stroke="none">
          <circle cx="59" cy="88" r="5" />
          <circle cx="101" cy="88" r="5" />
        </g>
        <path data-part="smile" fill="none" d="M73 98c1 8 13 8 14 0" />
        <ellipse
          data-part="surprise"
          cx="80"
          cy="103"
          rx="4"
          ry="5.5"
          fill="#80564c"
          stroke="none"
        />
      </g>
    </g>
  );
}
