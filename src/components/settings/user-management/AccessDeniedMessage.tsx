
import React from 'react';

const AccessDeniedMessage: React.FC = () => {
  return (
    <div className="text-center py-8">
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-gray-500">You don't have permission to access user management.</p>
    </div>
  );
};

export default AccessDeniedMessage;
