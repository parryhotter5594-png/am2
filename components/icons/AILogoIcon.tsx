import React from 'react';

export const AILogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M12 3v18"/>
    <path d="M3 12h18"/>
    <path d="M19.07 4.93l-1.41 1.41"/>
    <path d="M6.34 6.34L4.93 4.93"/>
    <path d="M19.07 19.07l-1.41-1.41"/>
    <path d="M6.34 17.66l-1.41 1.41"/>
    <circle cx="12" cy="12" r="2.5"/>
  </svg>
);