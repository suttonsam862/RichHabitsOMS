import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { XCircleIcon } from 'lucide-react';

export default function PaymentCancel() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const orderIdParam = searchParams.get('order_id');
    
    if (orderIdParam) {
      setOrderId(orderIdParam);
    }

    toast({
      title: "Payment Cancelled",
      description: "Your payment was cancelled. No charges were made.",
      variant: "destructive"
    });
  }, [location, toast]);

  return (
    <div className="container mx-auto py-10 max-w-lg">
      <Card className="w-full">
        <CardHeader className="bg-red-50 dark:bg-red-900/20">
          <div className="flex justify-center mb-4">
            <XCircleIcon className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-center text-2xl">Payment Cancelled</CardTitle>
          <CardDescription className="text-center">
            Your payment process was cancelled.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-center">
          <p className="text-lg mb-4">
            Your payment was not processed and no charges were made to your account.
          </p>
          <p>
            If you experienced any issues during the payment process, please contact our customer support team.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {orderId && (
            <Button asChild className="w-full">
              <Link href={`/orders/${orderId}`}>
                Return to Order
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/orders">
              View My Orders
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">
              Return to Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}