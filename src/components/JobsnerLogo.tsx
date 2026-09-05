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
  /*
   * ============================================================
   * JOBSNER LOGO
   * ============================================================
   *
   * IMPORTANT:
   *
   * /public/logo.png is the ORIGINAL Jobsner logo image.
   *
   * We do NOT:
   * - recreate the logo
   * - add JOBSner text
   * - add Connecting Careers text
   * - change colors
   * - crop the image
   * - modify the image
   * - add another border
   * - add another logo
   *
   * The uploaded image is displayed exactly as it is.
   */

  const sizeMap = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  const sizeClass = sizeMap[size] || sizeMap.md;

  /*
   * ============================================================
   * ICON
   * ============================================================
   */

  if (variant === 'icon') {
    return (
      <img
        id={id}
        src="/logo.png"
        alt="Jobsner"
        onClick={onClick}
        draggable={false}
        referrerPolicy="no-referrer"
        className={`
          ${sizeClass}
          object-contain
          block
          select-none
          ${onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}
          ${className}
        `}
      />
    );
  }

  /*
   * ============================================================
   * BADGE
   * ============================================================
   */

  if (variant === 'badge') {
    return (
      <img
        id={id}
        src="/logo.png"
        alt="Jobsner"
        onClick={onClick}
        draggable={false}
        referrerPolicy="no-referrer"
        className={`
          ${sizeClass}
          object-contain
          block
          select-none
          ${onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}
          ${className}
        `}
      />
    );
  }

  /*
   * ============================================================
   * FULL LOGO
   * ============================================================
   */

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
          w-48
          h-48
          sm:w-56
          sm:h-56
          object-contain
          block
          select-none
          ${onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}
          ${className}
        `}
      />
    );
  }

  /*
   * ============================================================
   * HEADER
   * ============================================================
   *
   * EXACT SAME IMAGE.
   * Only the size changes.
   */

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
        object-contain
        block
        select-none
        ${onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}
        ${className}
      `}
    />
  );
};

export default JobsnerLogo;

export { JobsnerLogo };