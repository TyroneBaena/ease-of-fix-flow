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

  if (!isOpen) {
    console.log('🔴 PaymentModal closed - returning null');
    return null;
  }

  console.log('🟢 PaymentModal open - rendering content');

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <StablePaymentSetup
          onComplete={() => onCompleteRef.current()}
          onSkip={() => onCloseRef.current()}
        />
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
