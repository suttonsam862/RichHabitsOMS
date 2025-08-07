
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SafeBackButtonProps {
  fallbackPath?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const SafeBackButton: React.FC<SafeBackButtonProps> = ({
  fallbackPath = '/dashboard',
  className,
  variant = 'outline',
  size = 'default'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleBack = () => {
    // Check if we can safely go back
    if (window.history.length > 1) {
      // Ensure user is still authenticated
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      
      // Safe back navigation
      window.history.back();
    } else {
      // No history, navigate to fallback
      navigate(fallbackPath, { replace: true });
    }
  };

  return (
    <Button
      onClick={handleBack}
      variant={variant}
      size={size}
      className={className}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  );
};
