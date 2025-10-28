import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import logoForLightBg from "@/assets/logo-light-bg.png";
import logoForDarkBg from "@/assets/logo-dark-bg.png";

export const Logo = () => {
  const { theme } = useTheme();

  // Use dark-colored logo for light backgrounds, white logo for dark backgrounds
  const logoSrc = theme === "dark" ? logoForDarkBg : logoForLightBg;

  return (
    <Link to="/" className="flex items-center">
      <img src={logoSrc} alt="HousingHub Logo" className="h-10 w-auto" />
    </Link>
  );
};

export default Logo;
