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
  variant = 'full',
  size = 'md',
  className = '',
  onClick,
  id,
}) => {
  const heightMap = {
    xs: 'h-6 sm:h-7',
    sm: 'h-7 sm:h-8',
    md: 'h-8 sm:h-10',
    lg: 'h-10 sm:h-12',
    xl: 'h-8 sm:h-9 md:h-10',
  };

  const heightClass = heightMap[size] || heightMap.md;
  const logoSrc = variant === 'icon' ? '/logo-icon.png' : '/logo.png';

  return (
    <img
      id={id}
      src={logoSrc}
      alt="Jobsner"
      onClick={onClick}
      draggable={false}
      referrerPolicy="no-referrer"
      className={`
        ${heightClass}
        w-auto
        max-w-full
        object-contain
        block
        select-none
        shrink-0
        ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all' : ''}
        ${className}
      `}
    />
  );
};

export default JobsnerLogo;
export { JobsnerLogo };
