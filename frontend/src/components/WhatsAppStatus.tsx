import { useState, useEffect } from 'react';
import { whatsappApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

export function WhatsAppStatus() {
  const [isResetting, setIsResetting] = useState(false);
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

  const handleResetSession = async () => {
    try {
      setIsResetting(true);
      await whatsappApi.resetSession();
      window.location.reload();
    } catch (err) {
      console.error('Error resetting WhatsApp session:', err);
      alert('Failed to reset WhatsApp session.');
    } finally {
      setIsResetting(false);
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
        <CardFooter className="flex gap-2">
          <Button onClick={handleResetSession} disabled={isResetting} variant="outline">
            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isResetting ? 'Resetting...' : 'Reset Session'}
          </Button>
          <Button onClick={handleRetryInitialization} disabled={isRetrying}>
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              'Retry Connection'
            )}
          </Button>
        </CardFooter>
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
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleResetSession} 
            variant="outline"
            disabled={isResetting}
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Session'
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (wsStatus.initializationStatus === 'timeout' || wsStatus.initializationStatus === 'error') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>
            {wsStatus.initializationStatus === 'timeout' 
              ? 'Connection Timeout' 
              : 'Connection Error'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  {wsStatus.initializationStatus === 'timeout'
                    ? 'Connection to WhatsApp timed out. Please try again.'
                    : 'Failed to connect to WhatsApp. Please try again.'}
                </div>
                {wsStatus.initializationError && (
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {wsStatus.initializationError}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button 
            onClick={handleRetryInitialization} 
            disabled={isRetrying}
            className="flex-1"
          >
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              'Retry Connection'
            )}
          </Button>
          <Button 
            onClick={handleResetSession} 
            variant="outline"
            disabled={isResetting}
            className="flex-1"
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Session'
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Default state when not connected and no specific status
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>WhatsApp Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              Not connected to WhatsApp
            </div>
            {wsStatus.initializationError && (
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {wsStatus.initializationError}
              </div>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button 
          onClick={handleRetryInitialization} 
          disabled={isRetrying}
          className="flex-1"
        >
          {isRetrying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            'Retry Connection'
          )}
        </Button>
        <Button 
          onClick={handleResetSession} 
          variant="outline"
          disabled={isResetting}
          className="flex-1"
        >
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            'Reset Session'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
