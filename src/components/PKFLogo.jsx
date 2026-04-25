import React from 'react';

/**
 * PKFokam Institute crest — SVG, no emojis, no external images.
 * Pure vector, infinitely scalable.
 */
const PKFLogo = ({ size = 40, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {/* Shield outer */}
    <path
      d="M24 2C13 2 4 7.5 4 7.5L4 30C4 43 24 54 24 54C24 54 44 43 44 30L44 7.5C44 7.5 35 2 24 2Z"
      fill="#FFD700"
    />
    {/* Shield inner (navy) */}
    <path
      d="M24 7C15 7 8 11.5 8 11.5L8 30C8 40.5 24 49.5 24 49.5C24 49.5 40 40.5 40 30L40 11.5C40 11.5 33 7 24 7Z"
      fill="#001F5B"
    />
    {/* Mortarboard board */}
    <polygon points="24,14 36,20 24,26 12,20" fill="#FFD700" />
    {/* Board underside (depth) */}
    <polygon points="24,26 36,20 36,22.5 24,28.5" fill="#E6A800" opacity="0.6" />
    {/* Cap stem */}
    <rect x="34.5" y="20" width="2" height="9" rx="1" fill="#FFD700" />
    {/* Tassel ball */}
    <circle cx="35.5" cy="30.5" r="2.2" fill="#FFD700" />
    {/* Bottom scroll / base */}
    <rect x="16" y="34" width="16" height="3" rx="1.5" fill="#FFD700" />
    <rect x="19" y="37" width="10" height="2" rx="1" fill="#FFD700" opacity="0.6" />
    {/* Top star accent */}
    <path
      d="M24 8.5L24.7 10.6H27L25.2 11.9L25.9 14L24 12.8L22.1 14L22.8 11.9L21 10.6H23.3Z"
      fill="#FFD700"
      opacity="0.5"
    />
  </svg>
);

export default PKFLogo;
