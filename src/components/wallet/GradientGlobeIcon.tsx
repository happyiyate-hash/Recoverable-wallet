import React from 'react';

const GradientGlobeIcon = ({ className }: { className?: string }) => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="url(#nav-icon-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12H22"
        stroke="url(#nav-icon-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2C14.5011 4.73838 15.9228 8.28904 16 12C15.9228 15.711 14.5011 19.2616 12 22C9.49886 19.2616 8.07725 15.711 8 12C8.07725 8.28904 9.49886 4.73838 12 2Z"
        stroke="url(#nav-icon-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
);

export default GradientGlobeIcon;
