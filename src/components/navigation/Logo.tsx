
import React from 'react';
import { Link } from 'react-router-dom';

export const Logo = () => {
  return (
    <Link to="/" className="flex items-center">
      <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center mr-3">
        <span className="text-white font-bold">H</span>
      </div>
      <span className="text-xl font-bold text-gray-900">HousingHub</span>
    </Link>
  );
};

export default Logo;
