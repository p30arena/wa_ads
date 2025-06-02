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
  const { status: wsStatus, retryWhatsAppConnection, updateStatus } = useWebSocket();

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
    if (!window.confirm('Are you sure you want to reset the WhatsApp session? This will log you out and require scanning the QR code again.')) {
      return;
    }
    
    try {
      setIsResetting(true);
      
      // Update status to show resetting state
      updateStatus({
        ...wsStatus,
        isResetting: true,
        initializationStatus: 'resetting',
        initializationError: null,
        qrCode: null,
      });
      
      // Call the reset endpoint
      await whatsappApi.resetSession();
      
      // Wait a moment for the backend to process the reset
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Trigger a reconnection to get the new QR code
      retryWhatsAppConnection();
    } catch (err) {
      console.error('Error resetting WhatsApp session:', err);
      updateStatus({
        ...wsStatus,
        isResetting: false,
        initializationStatus: 'error',
        initializationError: err instanceof Error ? err.message : 'Failed to reset session'
      });
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
    // Generate QR code URL using a reliable QR code generation service
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(wsStatus.qrCode)}`;
    
    console.log('Displaying QR code:', {
      qrCodeLength: wsStatus.qrCode.length,
      qrCodeStartsWith: wsStatus.qrCode.substring(0, 20)
    });

    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>WhatsApp QR Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Please scan this QR code with your WhatsApp mobile app to connect.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200">
            <div className="p-2 bg-white rounded">
              <img
                src={qrCodeUrl}
                alt="WhatsApp QR Code"
                className="h-64 w-64"
                onError={(e) => {
                  console.error('Failed to load QR code image');
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0iI2YzZjRmNSIvPjxwYXRoIGQ9Ik0xMiAyQzYuNDc3IDIgMiA2LjQ3NyAyIDEyczQuNDc3IDEwIDEwIDEwIDEwLTQuNDc3IDEwLTEwUzE3LjUyMyAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4em0wLTE0Yy0zLjMxIDAtNiAyLjY5LTYgNnMyLjY5IDYgNiA2IDYtMi42OSA2LTYtMi42OS02LTYtNnptLTEgMTBoMnYyaC0ydi0yem0wLTRoMnY2aC0ydi02eiIgZmlsbD0iI2Q5MDAwMCIvPjwvc3ZnPg=';
                }}
              />
            </div>
            <p className="mt-4 text-sm text-gray-500 text-center">
              Scan this QR code with your WhatsApp mobile app to connect
            </p>
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

  const showRetryButton = !wsStatus.connected && 
    wsStatus.initializationStatus !== 'initializing' && 
    wsStatus.initializationStatus !== 'resetting' &&
    !wsStatus.qrCode &&
    !isResetting;

  // Default state when not connected and no specific status
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>WhatsApp Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              {(wsStatus.initializationStatus === 'initializing' || wsStatus.initializationStatus === 'resetting') && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {wsStatus.initializationStatus === 'resetting' 
                    ? 'Resetting WhatsApp session...' 
                    : 'Connecting to WhatsApp...'}
                </div>
              )}
              {wsStatus.initializationError && (
                <div className="text-sm text-red-700 dark:text-red-300">
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
