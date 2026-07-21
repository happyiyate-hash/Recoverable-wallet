import React from 'react';

const GradientSettingsIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.03c1.527-.878 3.317.912 2.439 2.439a1.724 1.724 0 0 0 1.03 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.03 2.573c.878 1.527-.912 3.317-2.439 2.439a1.724 1.724 0 0 0-2.573 1.03c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.03c-1.527.878-3.317-.912-2.439-2.439a1.724 1.724 0 0 0-1.03-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.03-2.573c-.878-1.527.912-3.317 2.439-2.439a1.724 1.724 0 0 0 2.573-1.03z"
      stroke="url(#nav-icon-gradient)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
      stroke="url(#nav-icon-gradient)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default GradientSettingsIcon;
