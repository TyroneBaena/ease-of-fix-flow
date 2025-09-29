import React from 'react';
import { Button } from '@/components/ui/button';
import { PropertyAccessGuard } from './PropertyAccessGuard';
import { usePropertyAccessControl } from '@/hooks/usePropertyAccessControl';

interface PropertyActionButtonProps {
  action: 'create' | 'update' | 'delete';
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  className?: string;
}

export const PropertyActionButton: React.FC<PropertyActionButtonProps> = ({
  action,
  onClick,
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  className
}) => {
  const { handleRestrictedAction } = usePropertyAccessControl();

  return (
    <PropertyAccessGuard action={action}>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        className={className}
        onClick={() => {
          try {
            onClick();
          } catch (error) {
            handleRestrictedAction(action);
          }
        }}
      >
        {children}
      </Button>
    </PropertyAccessGuard>
  );
};