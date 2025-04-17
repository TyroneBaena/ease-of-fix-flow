
import React, { useState } from 'react';
import { Building, MapPin, User, Phone, Copy, Check } from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface ContactInformationProps {
  site?: string;
  address?: string;
  submittedBy?: string;
  contactNumber?: string;
  practiceLeader?: string;
  practiceLeaderPhone?: string;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({
  site,
  address,
  submittedBy,
  contactNumber,
  practiceLeader,
  practiceLeaderPhone,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const renderField = (icon: React.ReactNode, label: string, value?: string, copyEnabled = true) => (
    <div className="flex items-start gap-2">
      {icon}
      <div className="flex-grow">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600 break-words">{value || 'N/A'}</p>
          {copyEnabled && value && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-100"
                    onClick={() => copyToClipboard(value, label)}
                  >
                    {copiedField === label ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to copy {label.toLowerCase()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Contact Information</h3>
      <div className="space-y-3">
        {renderField(<Building className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />, "Site", site)}
        {renderField(<MapPin className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />, "Address", address)}
        {renderField(<User className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />, "Submitted By", submittedBy)}
        {renderField(<Phone className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />, "Contact Number", contactNumber)}
        {renderField(<User className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />, "Practice Leader", practiceLeader)}
        {renderField(<Phone className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />, "Practice Leader Phone", practiceLeaderPhone)}
      </div>
    </div>
  );
};
