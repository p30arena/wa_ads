import { useEffect, useState } from 'react';
import { whatsappApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function WhatsAppStatus() {
  const [status, setStatus] = useState<{
    connected: boolean;
    qrCode: string | null;
    connectedClients: number;
    initializationStatus: 'none' | 'initializing' | 'ready' | 'error' | 'timeout';
    initializationError: string | null;
  } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchStatus = async () => {
    try {
      const { data } = await whatsappApi.getStatus();
      setStatus(data.data);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    }
  };

  const handleRetryInitialization = async () => {
    try {
      setIsRetrying(true);
      await whatsappApi.initialize();
      await fetchStatus(); // Get the updated status
    } catch (err) {
      console.error('Error retrying initialization:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status every 5 seconds if we're initializing or have an error
    const interval = setInterval(() => {
      if (status?.initializationStatus === 'initializing' || 
          status?.initializationStatus === 'error' ||
          status?.initializationStatus === 'timeout') {
        fetchStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status?.initializationStatus]);

  if (!status) {
    return null;
  }

  if (status.initializationStatus === 'timeout') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>WhatsApp Initialization Timeout</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              WhatsApp client initialization timed out. This might be due to network issues or server problems.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleRetryInitialization} 
            disabled={isRetrying}
          >
            {isRetrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRetrying ? 'Retrying...' : 'Retry Initialization'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status.initializationStatus === 'error') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>WhatsApp Initialization Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {status.initializationError || 'An error occurred during initialization'}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleRetryInitialization} 
            disabled={isRetrying}
          >
            {isRetrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRetrying ? 'Retrying...' : 'Retry Initialization'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null; // Don't show anything for other states
}
