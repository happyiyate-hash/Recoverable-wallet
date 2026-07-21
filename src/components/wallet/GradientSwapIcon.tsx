import React from 'react';

const GradientSwapIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
        d="M4 7h13M17 7l-3-3m3 3l-3 3M20 17H7m0 0l3 3m-3-3l3-3"
        stroke="url(#nav-icon-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    />
  </svg>
);

export default GradientSwapIcon;
