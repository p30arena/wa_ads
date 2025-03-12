'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowPathIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface WhatsAppQRCodeProps {
  qrCode: string;
  onRefresh?: () => void;
}

export function WhatsAppQRCode({ qrCode, onRefresh }: WhatsAppQRCodeProps) {
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);

  // Validate and process QR code on mount and when it changes
  useEffect(() => {
    if (!qrCode) {
      setIsValid(false);
      setErrorMessage('No QR code available');
      setQrValue(null);
      return;
    }

    // Basic validation - QR code should be a non-empty string
    if (typeof qrCode !== 'string' || qrCode.trim().length === 0) {
      setIsValid(false);
      setErrorMessage('Invalid QR code format');
      setQrValue(null);
      return;
    }

    // Check if the QR code is in the expected format
    const qrParts = qrCode.split(',');
    if (qrParts.length !== 5 || !qrParts[0].startsWith('2@')) {
      setIsValid(false);
      setErrorMessage('Invalid WhatsApp QR code format');
      setQrValue(null);
      return;
    }

    setIsValid(true);
    setErrorMessage(null);
    setQrValue(qrCode);
  }, [qrCode]);

  console.log('[WhatsAppQRCode] Rendering:', {
    qrCode: qrCode ? `${qrCode.slice(0, 20)}...` : null,
    length: qrCode?.length,
    isValid,
    errorMessage,
    hasQrValue: Boolean(qrValue)
  });

  if (!isValid) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-auto text-center">
        <div className="text-red-500 mb-4">
          <p className="font-medium">Unable to display QR code</p>
          <p className="text-sm mt-1">{errorMessage}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-auto text-center">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect WhatsApp
        </h3>
        <p className="text-sm text-gray-600">
          To use WhatsApp Ads, scan this QR code with your phone
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-200 mb-4">
        {qrValue ? (
          <QRCodeSVG 
            value={qrValue} 
            size={240}
            level="H"
            includeMargin
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        ) : (
          <div className="flex items-center justify-center w-[240px] h-[240px] bg-gray-50 rounded">
            <p className="text-sm text-gray-500">QR code not available</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <PhoneIcon className="h-5 w-5" />
          <span>Open WhatsApp on your phone</span>
        </div>

        <ol className="text-sm text-gray-600 text-left space-y-2">
          <li>1. Tap Menu or Settings</li>
          <li>2. Select WhatsApp Web</li>
          <li>3. Point your phone camera at this screen</li>
        </ol>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh QR Code
          </button>
        )}
      </div>
    </div>
  );
}
