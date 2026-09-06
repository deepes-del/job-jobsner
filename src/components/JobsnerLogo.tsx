import React from 'react';

interface JobsnerLogoProps {
  variant?: 'full' | 'icon' | 'badge' | 'header';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  id?: string;
}

const JobsnerLogo: React.FC<JobsnerLogoProps> = ({
  variant = 'header',
  size = 'md',
  className = '',
  onClick,
  id,
}) => {
  const sizeMap = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36 sm:w-44 sm:h-44',
  };

  const sizeClass = sizeMap[size] || sizeMap.md;

  if (variant === 'icon') {
    return (
      <img
        id={id}
        src="/logo.png"
        alt="Jobsner Logo"
        onClick={onClick}
        draggable={false}
        referrerPolicy="no-referrer"
        className={`
          ${sizeClass}
          rounded-full
          object-cover
          shadow-md
          border-2
          border-white/80
          bg-white
          block
          select-none
          shrink-0
          ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : ''}
          ${className}
        `}
      />
    );
  }

  if (variant === 'badge') {
    return (
      <img
        id={id}
        src="/logo.png"
        alt="Jobsner Logo"
        onClick={onClick}
        draggable={false}
        referrerPolicy="no-referrer"
        className={`
          ${sizeClass}
          rounded-full
          object-cover
          shadow-md
          border-2
          border-orange-100
          bg-white
          block
          select-none
          shrink-0
          ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : ''}
          ${className}
        `}
      />
    );
  }

  if (variant === 'full') {
    return (
      <img
        id={id}
        src="/logo.png"
        alt="Jobsner - Connecting Careers"
        onClick={onClick}
        draggable={false}
        referrerPolicy="no-referrer"
        className={`
          ${sizeClass}
          rounded-full
          object-cover
          shadow-xl
          border-4
          border-white
          bg-white
          block
          select-none
          shrink-0
          ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : ''}
          ${className}
        `}
      />
    );
  }

  return (
    <img
      id={id}
      src="/logo.png"
      alt="Jobsner - Connecting Careers"
      onClick={onClick}
      draggable={false}
      referrerPolicy="no-referrer"
      className={`
        ${sizeClass}
        rounded-full
        object-cover
        shadow-sm
        border border-gray-200/90
        bg-white
        block
        select-none
        shrink-0
        ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : ''}
        ${className}
      `}
    />
  );
};

export default JobsnerLogo;
export { JobsnerLogo };