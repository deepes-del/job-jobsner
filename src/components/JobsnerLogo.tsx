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

  // Configured sizes to make the logo bold, clearly visible, and well-proportioned
  // Full logo aspect ratio is ~5:1 (804x160)
  const fullSizeConfig: Record<string, { maxHeight: string; maxWidth: string; defaultClasses: string }> = {
    xs: { maxHeight: '28px', maxWidth: '140px', defaultClasses: 'h-[24px]' },
    sm: { maxHeight: '32px', maxWidth: '160px', defaultClasses: 'h-[28px]' },
    md: { maxHeight: '40px', maxWidth: '200px', defaultClasses: 'h-[34px] sm:h-[36px]' },
    lg: { maxHeight: '48px', maxWidth: '240px', defaultClasses: 'h-[40px] sm:h-[44px]' },
    xl: { maxHeight: '46px', maxWidth: '235px', defaultClasses: 'h-[34px] sm:h-[38px] md:h-[42px]' },
  };

  const iconSizeConfig: Record<string, { maxHeight: string; maxWidth: string; defaultClasses: string }> = {
    xs: { maxHeight: '24px', maxWidth: '28px', defaultClasses: 'h-[22px]' },
    sm: { maxHeight: '28px', maxWidth: '34px', defaultClasses: 'h-[26px]' },
    md: { maxHeight: '34px', maxWidth: '42px', defaultClasses: 'h-[32px]' },
    lg: { maxHeight: '42px', maxWidth: '52px', defaultClasses: 'h-[38px]' },
    xl: { maxHeight: '48px', maxWidth: '58px', defaultClasses: 'h-[44px]' },
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
        maxHeight: currentConfig.maxHeight,
        maxWidth: currentConfig.maxWidth,
        objectFit: 'contain',
        objectPosition: 'left center',
        ...style,
      }}
      className={`
        ${currentConfig.defaultClasses}
        w-auto
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
