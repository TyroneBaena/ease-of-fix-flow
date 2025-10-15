import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, Plus, QrCode } from 'lucide-react';
import { invitationCodeService, GenerateCodeParams } from '@/services/invitationCodeService';
import { useToast } from '@/hooks/use-toast';

interface GenerateCodeDialogProps {
  onCodeGenerated?: () => void;
}

export const GenerateCodeDialog = ({ onCodeGenerated }: GenerateCodeDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<GenerateCodeParams>({
    assigned_role: 'manager',
    expires_in_days: 7,
    max_uses: 1,
    internal_note: '',
  });

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { code, error } = await invitationCodeService.generateCode(formData);
      
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (code) {
        setGeneratedCode(code.code);
        toast({
          title: 'Success',
          description: 'Invitation code generated successfully',
        });
        onCodeGenerated?.();
      }
    } catch (error) {
      console.error('Error generating code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate invitation code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Invitation code copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setGeneratedCode(null);
    setCopied(false);
    setFormData({
      assigned_role: 'manager',
      expires_in_days: 7,
      max_uses: 1,
      internal_note: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Generate Invitation Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Invitation Code</DialogTitle>
          <DialogDescription>
            Create a new invitation code to allow team members to join your organization
          </DialogDescription>
        </DialogHeader>

        {!generatedCode ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Assigned Role</Label>
              <Select
                value={formData.assigned_role}
                onValueChange={(value: any) => setFormData({ ...formData, assigned_role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Role the user will receive when joining
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expiration (Days)</Label>
              <Select
                value={formData.expires_in_days.toString()}
                onValueChange={(value) => setFormData({ ...formData, expires_in_days: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="365">Never (1 Year)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_uses">Maximum Uses</Label>
              <Input
                id="max_uses"
                type="number"
                min="1"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 1 })}
              />
              <p className="text-sm text-muted-foreground">
                Number of people who can use this code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Internal Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="e.g., For new team members joining in Q1..."
                value={formData.internal_note}
                onChange={(e) => setFormData({ ...formData, internal_note: e.target.value })}
                rows={3}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Code'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border-2 border-primary p-6 text-center space-y-4">
              <div className="flex items-center justify-center">
                <QrCode className="h-12 w-12 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your Invitation Code</p>
                <p className="text-2xl font-bold font-mono">{generatedCode}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleCopy}
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Code Details:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Role: <span className="font-medium text-foreground">{formData.assigned_role}</span></li>
                <li>• Expires in: <span className="font-medium text-foreground">{formData.expires_in_days} days</span></li>
                <li>• Max uses: <span className="font-medium text-foreground">{formData.max_uses}</span></li>
              </ul>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
