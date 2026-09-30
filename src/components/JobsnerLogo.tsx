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
  size = 'md',
  className = '',
  onClick,
  id,
}) => {
  const heightMap = {
    xs: 'h-7',
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-20 sm:h-24',
  };

  const heightClass = heightMap[size] || heightMap.md;

  return (
    <img
      id={id}
      src="/logo.png"
      alt="Jobsner - Find Your Next Opportunity"
      onClick={onClick}
      draggable={false}
      referrerPolicy="no-referrer"
      className={`
        ${heightClass}
        w-auto
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