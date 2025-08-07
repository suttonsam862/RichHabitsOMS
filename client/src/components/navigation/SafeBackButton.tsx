
import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { user } = useAuth();

  const handleBack = () => {
    try {
      // Ensure user is still authenticated
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      
      // Simple back navigation without complex history checks
      if (document.referrer && document.referrer.includes(window.location.hostname)) {
        window.history.back();
      } else {
        navigate(fallbackPath, { replace: true });
      }
    } catch (error) {
      console.warn('Back navigation error:', error);
      // Fallback navigation
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
