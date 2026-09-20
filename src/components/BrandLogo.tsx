import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'header' | 'footer';
  variant?: 'light' | 'dark' | 'white';
  showTagline?: boolean; // kept for interface compatibility
  className?: string;
  onClick?: () => void;
  // Optional Site Settings override. Defaults to the original logo asset
  // unchanged, so nothing changes visually until an admin sets a value.
  src?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'light',
  className = '',
  onClick,
  src
}) => {
  // Official Single Source of Truth Brand Asset - 100% Unchanged Original Design
  const LOGO_SRC = src && src.trim() ? src : '/logo.png';

  // Responsive sizing presets with strictly locked aspect ratio (object-fit: contain)
  // Sized prominently so CareerBuddies name, staircase, and tagline directly below are broader and prominent
  const sizeClasses = {
    header: 'h-[3.25rem] sm:h-[3.75rem] md:h-[4.25rem] lg:h-[5.5rem] w-auto max-w-[140px] sm:max-w-[165px] md:max-w-[190px] lg:max-w-[240px]',
    footer: 'h-[5.5rem] sm:h-[6.5rem] md:h-[7.5rem] lg:h-[9.25rem] w-auto max-w-[300px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[560px]',
    sm: 'h-10 sm:h-12 md:h-14 sm:w-auto max-w-[160px] sm:max-w-[210px]',
    md: 'h-12 sm:h-15 md:h-18 w-auto max-w-[200px] sm:max-w-[280px] md:max-w-[320px]',
    lg: 'h-16 sm:h-20 md:h-24 w-auto max-w-[260px] sm:max-w-[340px] md:max-w-[400px]',
    xl: 'h-20 sm:h-24 md:h-28 lg:h-32 w-auto max-w-[320px] sm:max-w-[420px] lg:max-w-[500px]',
    '2xl': 'h-24 sm:h-32 md:h-40 w-auto max-w-[380px] sm:max-w-[500px] lg:max-w-[600px]'
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center select-none ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
      role="banner"
      aria-label="CareerBuddies - Your Career | Our Guidance"
    >
      <img
        src={LOGO_SRC}
        alt="CareerBuddies - Your Career | Our Guidance"
        className={`${sizeClasses} object-contain object-left bg-transparent ${
          variant === 'dark'
            ? 'brightness-105'
            : 'mix-blend-multiply'
        } transition-transform duration-200`}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export default BrandLogo;

