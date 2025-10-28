
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import logoDark from '@/assets/logo-dark.png';
import logoWhite from '@/assets/logo-white.png';

export const Logo = () => {
  const { theme } = useTheme();
  
  // Use dark logo for light backgrounds, white logo for dark backgrounds
  const logoSrc = theme === 'dark' ? logoWhite : logoDark;
  
  return (
    <Link to="/" className="flex items-center">
      <img 
        src={logoSrc} 
        alt="HousingHub Logo" 
        className="h-8 w-auto"
      />
    </Link>
  );
};

export default Logo;
