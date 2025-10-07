import React from 'react';
import { X } from 'lucide-react';
import { PaymentMethodSetup } from '@/components/auth/PaymentMethodSetup';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onComplete }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        
        <PaymentMethodSetup
          onComplete={onComplete}
          onSkip={onClose}
        />
      </div>
    </div>
  );
};
