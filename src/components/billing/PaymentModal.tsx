import React, { useEffect, useRef, memo } from 'react';
import { StablePaymentSetup } from './StablePaymentSetup';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const PaymentModalContent = memo<PaymentModalProps>(({ isOpen, onClose, onComplete }) => {
  const renderCount = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const onCloseRef = useRef(onClose);
  
  // Keep refs updated without triggering re-renders
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onCloseRef.current = onClose;
  });
  
  useEffect(() => {
    renderCount.current += 1;
    console.log('🔵 PaymentModal render count:', renderCount.current, 'isOpen:', isOpen);
  });

  console.log('🟢 PaymentModal rendering - isOpen:', isOpen);

  // Don't unmount - just hide with CSS
  return (
    <div 
      className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 transition-opacity ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && isOpen) {
          onCloseRef.current();
        }
      }}
    >
      <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: isOpen ? 'block' : 'none' }}>
          <StablePaymentSetup
            onComplete={() => onCompleteRef.current()}
            onSkip={() => onCloseRef.current()}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if isOpen changes
  const shouldSkipRender = prevProps.isOpen === nextProps.isOpen;
  if (shouldSkipRender) {
    console.log('⚡ Skipping PaymentModal re-render - isOpen unchanged');
  }
  return shouldSkipRender;
});

PaymentModalContent.displayName = 'PaymentModalContent';

export const PaymentModal: React.FC<PaymentModalProps> = (props) => {
  return <PaymentModalContent {...props} />;
};
