import { useEffect, useState } from 'react';
import { whatsappApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

export function WhatsAppStatus() {
  const [isRetrying, setIsRetrying] = useState(false);
  const { status: wsStatus, retryWhatsAppConnection } = useWebSocket();

  const handleRetryInitialization = async () => {
    try {
      setIsRetrying(true);
      retryWhatsAppConnection();
    } catch (err) {
      console.error('Error retrying initialization:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!wsStatus) {
    return null;
  }

  if (wsStatus.connected) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>WhatsApp Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              Connected and ready to send messages
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (wsStatus.qrCode) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>WhatsApp QR Code</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please scan this QR code with your WhatsApp mobile app to connect.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <img
              src={`data:image/png;base64,${wsStatus.qrCode}`}
              alt="WhatsApp QR Code"
              className="h-64 w-64"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (wsStatus.initializationStatus === 'initializing') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>WhatsApp Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Initializing WhatsApp connection...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (wsStatus.initializationStatus === 'timeout') {
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

  if (wsStatus.initializationStatus === 'error') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>WhatsApp Initialization Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {wsStatus.initializationError || 'An error occurred during initialization'}
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

  // Default error state
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>WhatsApp Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>
            WhatsApp is not connected. Please wait while we establish a connection.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleRetryInitialization} 
          disabled={isRetrying}
        >
          {isRetrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isRetrying ? 'Retrying...' : 'Retry Connection'}
        </Button>
      </CardFooter>
    </Card>
  );
}
