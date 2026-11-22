import React from 'react';

// Krishi Sakhi mark: a sprout rising over a rising sun and furrowed field.
const Logo = ({ className = 'h-10 w-10' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="ks-sun" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbbd4d" />
        <stop offset="1" stopColor="#e8860c" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="14" fill="#163b28" />
    <circle cx="24" cy="30" r="12" fill="url(#ks-sun)" />
    <path d="M6 34c6-3 12-4 18-4s12 1 18 4v14H6z" fill="#276f45" />
    <path d="M6 39c6-2.5 12-3.5 18-3.5S36 36.5 42 39" stroke="#5ca677" strokeWidth="1.6" fill="none" />
    <path d="M24 33V19" stroke="#f0f7f1" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M24 24c-1-5-5-7-9-6 1 4 4 6 9 6z" fill="#b9dcc3" />
    <path d="M24 21c1-5 5-8 10-7-1 5-5 7-10 7z" fill="#f0f7f1" />
  </svg>
);

export default Logo;
