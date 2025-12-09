import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JobTitleConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  contractorName: string;
  onConfirm: (updatedTitle: string) => void;
  isAssigning: boolean;
}

export const JobTitleConfirmationDialog: React.FC<JobTitleConfirmationDialogProps> = ({
  open,
  onOpenChange,
  currentTitle,
  contractorName,
  onConfirm,
  isAssigning,
}) => {
  const [jobTitle, setJobTitle] = useState(currentTitle);

  // Reset title when dialog opens with new current title
  useEffect(() => {
    if (open) {
      setJobTitle(currentTitle);
    }
  }, [open, currentTitle]);

  const handleConfirm = () => {
    if (!jobTitle.trim()) {
      return;
    }
    onConfirm(jobTitle.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Job Title</DialogTitle>
          <DialogDescription>
            Review or update the job title before sending to the contractor. This title will be used in the job assignment notification.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Enter job title"
              disabled={isAssigning}
            />
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Assigning to</Label>
            <p className="text-sm font-medium">{contractorName}</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!jobTitle.trim() || isAssigning}
          >
            {isAssigning ? "Assigning..." : "Assign Contractor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
