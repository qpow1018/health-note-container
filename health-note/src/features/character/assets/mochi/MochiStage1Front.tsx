import { useId } from 'react';

export default function MochiStage1Front() {
  const gradientId = useId();
  const bodyColor = '#fff8e8';
  return (
    <g data-asset="mochi-stage-1-front">
      <defs>
        <radialGradient id={gradientId} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#fffdf5" />
          <stop offset="75%" stopColor={bodyColor} />
          <stop offset="100%" stopColor="#f4e9d3" />
        </radialGradient>
      </defs>
      <g stroke="#514535" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="53" cy="140" rx="10" ry="6.5" fill={bodyColor} />
        <ellipse cx="107" cy="140" rx="10" ry="6.5" fill={bodyColor} />
        <g data-part="body">
          <path
            fill={`url(#${gradientId})`}
            d="M78 43C57 41 39 55 31 76c-5 13-20 18-21 31-1 12 9 17 18 10 2 18 20 26 51 26 30 0 49-8 51-26 10 8 20 2 19-10-1-13-17-17-23-30-9-21-27-32-49-34Z"
          />
          <ellipse cx="80" cy="116" rx="34" ry="17" fill="#fffdf5" stroke="none" />
          <ellipse cx="80" cy="64" rx="6" ry="8" fill="#efa385" stroke="none" />
          <g fill="#f6c49a" stroke="none">
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
          <path
            data-part="left-arm"
            fill="none"
            stroke="#dfd2b6"
            strokeWidth="1.8"
            d="M29 108q-2 5 0 8"
          />
          <path
            data-part="right-arm"
            fill="none"
            stroke="#dfd2b6"
            strokeWidth="1.8"
            d="M131 108q2 5 0 8"
          />
        </g>
      </g>
    </g>
  );
}
