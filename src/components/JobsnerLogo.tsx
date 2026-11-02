import React from 'react';

interface JobsnerLogoProps {
  variant?: 'full' | 'icon' | 'badge' | 'header';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  id?: string;
}

const JobsnerLogo: React.FC<JobsnerLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  style = {},
  onClick,
  id,
}) => {
  const isIcon = variant === 'icon';
  const logoSrc = isIcon ? '/logo-icon.png' : '/logo.png';

  // Strict sizes to keep logo crisp, compact, and clearly visible
  // Full logo aspect ratio is ~5:1 (804x160)
  const fullSizeConfig: Record<string, { height: string; maxHeight: string; maxWidth: string }> = {
    xs: { height: '20px', maxHeight: '20px', maxWidth: '105px' },
    sm: { height: '24px', maxHeight: '24px', maxWidth: '125px' },
    md: { height: '28px', maxHeight: '28px', maxWidth: '145px' },
    lg: { height: '32px', maxHeight: '32px', maxWidth: '165px' },
    xl: { height: '28px', maxHeight: '30px', maxWidth: '155px' },
  };

  const iconSizeConfig: Record<string, { height: string; maxHeight: string; maxWidth: string }> = {
    xs: { height: '20px', maxHeight: '20px', maxWidth: '24px' },
    sm: { height: '24px', maxHeight: '24px', maxWidth: '30px' },
    md: { height: '28px', maxHeight: '28px', maxWidth: '36px' },
    lg: { height: '34px', maxHeight: '34px', maxWidth: '42px' },
    xl: { height: '38px', maxHeight: '38px', maxWidth: '48px' },
  };

  const currentConfig = isIcon
    ? (iconSizeConfig[size] || iconSizeConfig.md)
    : (fullSizeConfig[size] || fullSizeConfig.md);

  return (
    <img
      id={id}
      src={logoSrc}
      alt="Jobsner"
      onClick={onClick}
      draggable={false}
      referrerPolicy="no-referrer"
      style={{
        height: currentConfig.height,
        maxHeight: currentConfig.maxHeight,
        maxWidth: currentConfig.maxWidth,
        width: 'auto',
        objectFit: 'contain',
        objectPosition: 'left center',
        display: 'block',
        flexShrink: 0,
        ...style,
      }}
      className={`select-none shrink-0 ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all' : ''} ${className}`}
    />
  );
};

export default JobsnerLogo;
export { JobsnerLogo };
