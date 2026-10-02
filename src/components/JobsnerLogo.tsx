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
    xs: 'h-10',
    sm: 'h-14',
    md: 'h-20',
    lg: 'h-24',
    xl: 'h-20 sm:h-24 md:h-28',
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