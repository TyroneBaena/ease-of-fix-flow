import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QrCode, Copy, Download, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode.react';

interface PropertyQrGeneratorProps {
  propertyId: string;
  propertyName: string;
}

const PropertyQrGenerator = ({ propertyId, propertyName }: PropertyQrGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateQrCode = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('generate_property_access_token', {
          p_property_id: propertyId,
          p_expires_hours: expiryHours
        });

      if (error) {
        console.error('Error generating token:', error);
        toast({
          title: "Error",
          description: "Failed to generate access token. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const newToken = data;
      setToken(newToken);
      
      // Generate QR code URL
      const baseUrl = window.location.origin;
      const qrCodeUrl = `${baseUrl}/qr/${newToken}`;
      setQrUrl(qrCodeUrl);
      
      toast({
        title: "QR Code Generated",
        description: `Access token valid for ${expiryHours} hours`,
      });
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error", 
        description: "Something went wrong. Please try again.",
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
    setExpiryHours(24);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={resetForm}>
          <QrCode className="h-4 w-4 mr-2" />
          Generate QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Property Access QR Code</DialogTitle>
          <DialogDescription>
            Create a one-time access QR code for {propertyName}
          </DialogDescription>
        </DialogHeader>
        
        {!qrUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Valid for (hours)</Label>
              <Input
                id="expiry"
                type="number"
                min="1"
                max="168"
                value={expiryHours}
                onChange={(e) => setExpiryHours(parseInt(e.target.value) || 24)}
              />
              <p className="text-sm text-muted-foreground">
                Maximum 168 hours (7 days)
              </p>
            </div>
            
            <Button 
              onClick={generateQrCode} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4 mr-2" />
              )}
              Generate QR Code
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code Display */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Scan to Access Property</CardTitle>
                <CardDescription>
                  One-time access valid for {expiryHours} hours
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PropertyQrGenerator;