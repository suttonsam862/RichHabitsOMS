import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircleIcon } from 'lucide-react';

export default function PaymentSuccess() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [loading, setLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sessionId = searchParams.get('session_id');

    if (sessionId) {
      // Verify payment with backend
      apiRequest('GET', `/api/payment-verify?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          setOrderNumber(data.orderNumber);
          setLoading(false);
          toast({
            title: "Payment Successful",
            description: `Your payment for order #${data.orderNumber} has been successfully processed.`,
          });
        })
        .catch(error => {
          console.error('Error verifying payment:', error);
          setLoading(false);
          toast({
            title: "Payment Verification Error",
            description: "There was an issue verifying your payment. Please contact customer support.",
            variant: "destructive"
          });
        });
    } else {
      setLoading(false);
    }
  }, [location, toast]);

  return (
    <div className="container mx-auto py-10 max-w-lg">
      <Card className="w-full">
        <CardHeader className="bg-green-50 dark:bg-green-900/20">
          <div className="flex justify-center mb-4">
            <CheckCircleIcon className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-center">
            Thank you for your payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-center">
          {loading ? (
            <div className="flex justify-center my-6">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {orderNumber ? (
                <p className="text-lg mb-4">
                  Your payment for order <span className="font-semibold">#{orderNumber}</span> has been successfully processed.
                </p>
              ) : (
                <p className="text-lg mb-4">
                  Your payment has been successfully processed.
                </p>
              )}
              <p>
                A confirmation email has been sent to your registered email address.
              </p>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/orders">
              View My Orders
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              Return to Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}