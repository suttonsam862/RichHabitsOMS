import React, { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// Schema for password setup form
const setupSchema = z.object({
  password: z.string()
    .min(8, {
      message: 'Password must be at least 8 characters long',
    }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function SetupPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Parse token from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    const tokenParam = searchParams.get('token');
    setToken(tokenParam);

    if (tokenParam) {
      verifyToken(tokenParam);
    } else {
      setIsVerifying(false);
      setVerifyError('No setup token provided. Please check your email link.');
    }
  }, [location]);

  // Verify the token is valid
  const verifyToken = async (tokenValue: string) => {
    try {
      setIsVerifying(true);
      const response = await apiRequest('POST', '/api/auth/verify-setup-token', { token: tokenValue });
      const data = await response.json();

      if (data.success) {
        setUserInfo(data.user);
      } else {
        setVerifyError(data.message || 'Invalid or expired token. Please contact support.');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setVerifyError('An error occurred while verifying your setup token. Please try again later.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Setup the form
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Handle form submission
  const setupMutation = useMutation({
    mutationFn: async (values: SetupFormValues) => {
      if (!token) {
        throw new Error('No token available');
      }
      const response = await apiRequest('POST', '/api/auth/complete-setup', {
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setIsSetupComplete(true);
        form.reset();
        toast({
          title: 'Success!',
          description: 'Your password has been set successfully.',
        });

        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation('/login');
        }, 3000);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to set up your account. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Setup error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: SetupFormValues) => {
    setupMutation.mutate(values);
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Setup Your Account</CardTitle>
          <CardDescription>
            Create a password to complete your account setup
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isVerifying ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
              <p>Verifying your account setup link...</p>
            </div>
          ) : verifyError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{verifyError}</AlertDescription>
            </Alert>
          ) : isSetupComplete ? (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                Your account has been set up successfully. You will be redirected to the login page shortly.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {userInfo && (
                <div className="mb-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Setting up account for: <span className="font-semibold">{userInfo.email}</span>
                  </p>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your new password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Confirm your password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={setupMutation.isPending}
                  >
                    {setupMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Set Password & Complete Setup
                  </Button>
                </form>
              </Form>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Having trouble? Please contact our support team for assistance.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}