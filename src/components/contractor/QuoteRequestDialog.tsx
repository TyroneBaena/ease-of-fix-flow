
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  Phone, 
  MapPin, 
  User, 
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Mail,
  Building
} from 'lucide-react';

interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestDetails: {
    id: string;
    title: string;
    date: string;
    description?: string;
    location?: string;
    priority?: string;
    site?: string;
    submittedBy?: string;
    contactNumber?: string;
    address?: string;
    practiceLeader?: string;
    practiceLeaderPhone?: string;
    attachments?: Array<{ url: string }>;
  } | null;
  onSubmitQuote: (amount: number, description: string) => void;
}

export const QuoteRequestDialog = ({
  open,
  onOpenChange,
  requestDetails,
  onSubmitQuote,
}: QuoteRequestDialogProps) => {
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount)) {
      onSubmitQuote(numericAmount, description);
      setAmount('');
      setDescription('');
      onOpenChange(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Submit Quote</DialogTitle>
          <DialogDescription>
            Request {requestDetails?.id}: {requestDetails?.title}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Issue Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Issue Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-gray-600">{requestDetails?.location || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className={`h-4 w-4 mt-1 ${getPriorityColor(requestDetails?.priority)}`} />
                  <div>
                    <p className="text-sm font-medium">Priority Level</p>
                    <p className="text-sm text-gray-600">{requestDetails?.priority || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {requestDetails?.description || 'No description provided'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium">Site</p>
                    <p className="text-sm text-gray-600 break-words">{requestDetails?.site || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-gray-600 break-words">{requestDetails?.address || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium">Submitted By</p>
                    <p className="text-sm text-gray-600">{requestDetails?.submittedBy || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium">Contact Number</p>
                    <p className="text-sm text-gray-600">{requestDetails?.contactNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium">Practice Leader</p>
                    <p className="text-sm text-gray-600">{requestDetails?.practiceLeader || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium">Practice Leader Phone</p>
                    <p className="text-sm text-gray-600">{requestDetails?.practiceLeaderPhone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Attachments */}
            {requestDetails?.attachments && requestDetails.attachments.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Photos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {requestDetails.attachments.map((attachment, index) => (
                    <img
                      key={index}
                      src={attachment.url}
                      alt={`Attachment ${index + 1}`}
                      className="rounded-md border border-gray-200 object-cover w-full aspect-video"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Quote Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Quote Details</Label>
              <Textarea
                id="description"
                placeholder="Provide details about the quote, including materials, labor, and timeline..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Quote</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
