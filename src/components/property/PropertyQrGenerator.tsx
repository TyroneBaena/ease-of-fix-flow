import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QrCode, Copy, Download, RefreshCw, Loader2 } from 'lucide-react';
import QRCode from 'qrcode.react';

interface PropertyQrGeneratorProps {
  propertyId: string;
  propertyName: string;
}

const PropertyQrGenerator = ({ propertyId, propertyName }: PropertyQrGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const expiryHours = 6; // Static 6 hours as requested
  const { toast } = useToast();

  // Auto-generate QR code when dialog opens
  useEffect(() => {
    if (isOpen && !qrUrl && !loading) {
      generateQrCode();
    }
  }, [isOpen]);

  const generateQrCode = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Generating token for property:', propertyId);
      
      const { data, error } = await supabase
        .rpc('generate_property_access_token', {
          p_property_id: propertyId,
          p_expires_hours: expiryHours
        });

      if (error) {
        console.error('❌ Error generating token:', error);
        setError(error.message || "Failed to generate access token. Please try again.");
        toast({
          title: "Error",
          description: error.message || "Failed to generate access token. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (!data) {
        console.error('❌ No token returned from function');
        const errorMsg = "No token was generated. Please try again.";
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
        return;
      }

      const newToken = data;
      setToken(newToken);
      
      // Generate QR code URL with token format
      const baseUrl = window.location.origin;
      const qrCodeUrl = `${baseUrl}/qr/${newToken}`;
      setQrUrl(qrCodeUrl);
      
      console.log('✅ Generated token:', newToken);
      console.log('✅ QR URL:', qrCodeUrl);
      
      toast({
        title: "QR Code Generated",
        description: `Access token valid for ${expiryHours} hours`,
      });
      
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      const errorMsg = "Something went wrong. Please try again.";
      setError(errorMsg);
      toast({
        title: "Error", 
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "URL copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const downloadQrCode = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${propertyName}-qr-code.png`;
      link.href = url;
      link.click();
    }
  };

  const resetForm = () => {
    setQrUrl('');
    setToken('');
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={resetForm} className="flex items-center">
          <QrCode className="h-4 w-4 mr-2" />
          View QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Property Access QR Code</DialogTitle>
          <DialogDescription>
            QR code for instant access to {propertyName} (valid for {expiryHours} hours)
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Generating QR Code...</p>
            <p className="text-sm text-muted-foreground">Creating secure access token</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
              <p className="text-sm text-red-800 dark:text-red-200 mb-3">{error}</p>
              <Button onClick={generateQrCode} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        ) : qrUrl ? (
          <div className="space-y-4">
            {/* QR Code Display */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Scan for Instant Access</CardTitle>
                <CardDescription>
                  Valid for {expiryHours} hours from generation
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <QRCode
                  id="qr-code-canvas"
                  value={qrUrl}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </CardContent>
            </Card>

            {/* URL Display */}
            <div className="space-y-2">
              <Label>QR Code URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={qrUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(qrUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={downloadQrCode} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New
              </Button>
            </div>

            {/* Warning */}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Security Notice:</strong> This QR code provides temporary access to your property. 
                Only share with trusted individuals.
              </p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PropertyQrGenerator;